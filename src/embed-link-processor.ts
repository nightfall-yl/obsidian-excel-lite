import type { IWorkbookData } from '@univerjs/core';
import { LifecycleStages } from '@univerjs/core';
import type { Plugin } from 'obsidian';
import { MarkdownRenderChild, Platform, TFile } from 'obsidian';
import { parseSheetFile } from './data-utils';
import { SHEET_FRONTMATTER_KEYS } from './constants';
import { createUniverInstance } from './setup-univer';

interface EmbedLinkParseResult {
  filePath: string;
  fileName: string;
  sheetName: string;
  startCell: string;
  endCell: string;
  height?: number;
  displayType: string;
}

function parseEmbedLinkSyntax(input: string): EmbedLinkParseResult {
  const parts = input.split('|');
  const pathPart = parts[0] || '';
  const altPart = parts.slice(1).join('|');

  const lastSlashIdx = pathPart.lastIndexOf('/');
  const filePath = lastSlashIdx >= 0 ? pathPart.slice(0, lastSlashIdx) : '';
  const fileNameAndRest = lastSlashIdx >= 0 ? pathPart.slice(lastSlashIdx + 1) : pathPart;

  const hashIndex = fileNameAndRest.indexOf('#');
  const fileName = hashIndex >= 0 ? fileNameAndRest.slice(0, hashIndex) : fileNameAndRest;
  const afterHash = hashIndex >= 0 ? fileNameAndRest.slice(hashIndex + 1) : '';

  let sheetName = '';
  let startCell = '';
  let endCell = '';

  if (afterHash.includes('|')) {
    const pipeIdx = afterHash.indexOf('|');
    sheetName = afterHash.slice(0, pipeIdx);
    const rangePart = afterHash.slice(pipeIdx + 1);
    if (rangePart.match(/^([A-Z]+\d+):([A-Z]+\d+)$/)) {
      startCell = rangePart.split(':')[0];
      endCell = rangePart.split(':')[1];
    }
  } else if (afterHash) {
    if (afterHash.match(/^([A-Z]+\d+):([A-Z]+\d+)$/)) {
      startCell = afterHash.split(':')[0];
      endCell = afterHash.split(':')[1];
    } else {
      sheetName = afterHash;
    }
  }

  const altRangeMatch = altPart.match(/([A-Z]+\d+):([A-Z]+\d+)/i);
  if (altRangeMatch && !startCell) {
    startCell = altRangeMatch[1].toUpperCase();
    endCell = altRangeMatch[2].toUpperCase();
  }

  let height: number | undefined;
  const heightMatch = altPart.match(/<(\d+)>/);

  if (heightMatch) {
    height = parseInt(heightMatch[1], 10);
  }

  let displayType = 'table';
  if (altPart.includes('{html}')) {
    displayType = 'html';
  } else if (altPart.includes('{image}')) {
    displayType = 'image';
  }

  return { filePath, fileName, sheetName, startCell, endCell, height, displayType };
}

function cellRefToIndex(ref: string): { row: number; col: number } | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;

  let col = 0;
  for (let i = 0; i < match[1].length; i++) {
    col = col * 26 + (match[1].charCodeAt(i) - 64);
  }
  return { row: parseInt(match[2]) - 1, col: col - 1 };
}

function getCellValue(cell: any): string {
  if (!cell) return '';
  if (cell.v !== undefined && cell.v !== null) return String(cell.v);
  if (cell.p?.body?.dataStream) {
    return cell.p.body.dataStream.replace(/\r?\n$/, '').replace(/\n/g, ' ');
  }
  return '';
}

function renderCellDataAsTable(
  cellData: Record<string, Record<string, any>>,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): HTMLTableElement {
  const table = document.createElement('table');
  table.className = 'excel-embed-table';

  for (let r = startRow; r <= endRow; r++) {
    const tr = document.createElement('tr');
    for (let c = startCol; c <= endCol; c++) {
      const cell = cellData?.[r]?.[c];
      const value = getCellValue(cell);
      const td = document.createElement(r === startRow ? 'th' : 'td');
      td.textContent = value;
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  return table;
}

function cloneWorkbookData(workbookData: IWorkbookData): IWorkbookData {
  return JSON.parse(JSON.stringify(workbookData)) as IWorkbookData;
}

function getRangeWorkbookData(
  workbookData: IWorkbookData,
  sheetName: string,
  startCell: string,
  endCell: string,
): IWorkbookData {
  const data = cloneWorkbookData(workbookData);
  const sheet = findSheet(data, sheetName);
  if (!sheet) return data;

  const startIdx = cellRefToIndex(startCell);
  const endIdx = cellRefToIndex(endCell);
  if (!startIdx || !endIdx) return data;

  const startRow = Math.min(startIdx.row, endIdx.row);
  const endRow = Math.max(startIdx.row, endIdx.row);
  const startCol = Math.min(startIdx.col, endIdx.col);
  const endCol = Math.max(startIdx.col, endIdx.col);

  sheet.rowCount = endRow + 1;
  sheet.columnCount = endCol + 1;

  const rowData = sheet.rowData || {};
  for (let row = 0; row < startRow; row++) {
    rowData[row] = {
      ...(rowData[row] || {}),
      hd: 1,
      h: rowData[row]?.h || sheet.defaultRowHeight || 25,
    };
  }
  sheet.rowData = rowData;

  const columnData = sheet.columnData || {};
  for (let col = 0; col < startCol; col++) {
    columnData[col] = {
      ...(columnData[col] || {}),
      hd: 1,
      w: columnData[col]?.w || sheet.defaultColumnWidth || 100,
    };
  }
  sheet.columnData = columnData;

  const sheetId = sheet.id;
  if (sheetId) {
    data.sheets = { [sheetId]: sheet };
    data.sheetOrder = [sheetId];
  }

  return data;
}

function createUniverEmbedElement(
  workbookData: IWorkbookData,
  height: number,
  showFooter: boolean,
  plugin: any,
  ctx: any,
): HTMLDivElement {
  const embedEl = document.createElement('div');
  embedEl.className = 'excel-embed-univer';
  embedEl.style.height = `${height}px`;
  embedEl.style.width = '100%';

  let disposed = false;
  let disposeUniver: (() => void) | null = null;

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    if (disposeUniver) {
      disposeUniver();
      disposeUniver = null;
    }
  };

  const observer = new MutationObserver(() => {
    if (disposed) return;
    if (!document.body.contains(embedEl)) return;

    observer.disconnect();

    const isDark = plugin.app.isDarkMode?.() ?? document.body.hasClass?.('theme-dark') ?? false;
    const { univerAPI, univer } = createUniverInstance(embedEl, isDark, plugin.app, !Platform.isDesktopApp, {
      header: false,
      footer: showFooter,
      toolbar: false,
      contextMenu: false,
      embedMode: true,
    });

    let lifecycleDisposable: { dispose: () => void } | null = null;
    disposeUniver = () => {
      try {
        lifecycleDisposable?.dispose();
      } catch {
        // ignore cleanup failures from already-disposed Univer internals
      }
      try {
        univer.dispose();
      } catch {
        // ignore cleanup failures from already-disposed Univer internals
      }
    };

    const workbook = univerAPI.createWorkbook(workbookData);
    lifecycleDisposable = univerAPI.addEvent(univerAPI.Event.LifeCycleChanged, async (event: any) => {
      if (event.stage !== LifecycleStages.Rendered) return;

      try {
        const permission = (workbook as any)?.getWorkbookPermission?.();
        await permission?.setReadOnly?.();
        (univerAPI as any).setPermissionDialogVisible?.(false);
      } catch {
      }
    }) as any;
  });

  observer.observe(document.body, { childList: true, subtree: true });

  ctx?.addChild?.(new class extends MarkdownRenderChild {
    onunload(): void {
      cleanup();
    }
  }(embedEl));

  return embedEl;
}

export function registerEmbedLinkProcessor(plugin: any): void {
  plugin.registerMarkdownCodeBlockProcessor('sheet-embed', async (source: any, el: any) => {
    el.createEl('p', { text: 'Sheet embed block', cls: 'excel-embed-placeholder' });
  });

  const processor = async (el: HTMLElement, ctx: any) => {
    const internalEmbeds = el.querySelectorAll('.internal-embed');

    if (internalEmbeds.length === 0) {
      await processEditMode(el, ctx, plugin);
      return;
    }

    await processReadingMode(internalEmbeds, ctx, plugin);
  };

  plugin.registerMarkdownPostProcessor(processor);
}

async function processEditMode(el: HTMLElement, ctx: any, plugin: any): Promise<void> {
  const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
  if (!(file instanceof TFile)) return;
  if (!plugin.isSheetFile(file)) return;

  if (ctx.remainingNestLevel < 4) return;

  const containerEl = ctx.containerEl;
  let embedDiv: HTMLElement = containerEl;

  while (
    !embedDiv.hasClass('dataview')
    && !embedDiv.hasClass('cm-preview-code-block')
    && !embedDiv.hasClass('cm-embed-block')
    && !embedDiv.hasClass('internal-embed')
    && !embedDiv.hasClass('markdown-reading-view')
    && !embedDiv.hasClass('markdown-embed')
    && embedDiv.parentElement
  ) {
    embedDiv = embedDiv.parentElement;
  }

  if (
    embedDiv.hasClass('dataview')
    || embedDiv.hasClass('cm-preview-code-block')
    || embedDiv.hasClass('cm-embed-block')
  ) {
    return;
  }

  const isMarkdownEmbed = embedDiv.hasClass('markdown-embed');
  const isReadingView = embedDiv.hasClass('markdown-reading-view');

  if (
    !embedDiv.hasClass('internal-embed')
    && (isMarkdownEmbed || isReadingView)
  ) {
    const isFrontmatter = Boolean(el.querySelector('.frontmatter'));
    if (ctx.frontmatter) {
      el.empty();
    }

    if (!isFrontmatter) {
      if (el.parentElement === containerEl) {
        containerEl.removeChild(el);
      }
    }

    embedDiv.empty();

    const data = await plugin.app.vault.read(file);
    const src = embedDiv.getAttribute('src') ?? file.path.slice(0, -(file.extension.length + 1));
    const alt = embedDiv.getAttribute('alt') ?? '';
    const sheetDiv = await createEmbedLinkDiv(src, alt, file, data, plugin, ctx);
    embedDiv.appendChild(sheetDiv);

    if (isMarkdownEmbed) {
      embedDiv.removeClass('markdown-embed');
      embedDiv.removeClass('inline-embed');
    }
    return;
  }

  el.empty();

  if (embedDiv.hasAttribute('excel-ready')) return;
  embedDiv.setAttribute('excel-ready', '');

  embedDiv.empty();

  const data = await plugin.app.vault.read(file);
  const src = embedDiv.getAttribute('src') ?? file.path.slice(0, -(file.extension.length + 1));
  const alt = embedDiv.getAttribute('alt') ?? '';

  const sheetDiv = await createEmbedLinkDiv(src, alt, file, data, plugin, ctx);
  embedDiv.appendChild(sheetDiv);

  if (isMarkdownEmbed) {
    embedDiv.removeClass('markdown-embed');
    embedDiv.removeClass('inline-embed');
  }
}

async function processReadingMode(internalEmbeds: NodeListOf<Element>, ctx: any, plugin: any): Promise<void> {
  for (const embedEl of Array.from(internalEmbeds)) {
    const src = embedEl.getAttribute('src') || '';
    const alt = embedEl.getAttribute('alt') || '';

    if ((embedEl as HTMLElement).hasClass?.('excel-embed-file-label')) continue;
    if (!isSheetEmbed(src, alt, plugin, ctx.sourcePath)) continue;

    const targetFile = resolveSheetFile(src, plugin, ctx.sourcePath);
    if (!targetFile) continue;

    try {
      const data = await plugin.app.vault.read(targetFile);
      const sheetDiv = await createEmbedLinkDiv(src, alt, targetFile, data, plugin, ctx);
      embedEl.replaceWith(sheetDiv);
    } catch (e) {
      console.error('Excel: embed link render error:', e);
    }
  }
}

async function createEmbedLinkDiv(
  src: string,
  alt: string,
  file: TFile,
  data: string,
  plugin: any,
  ctx: any,
): Promise<HTMLDivElement> {
  const workbookData = parseSheetFile(data, file.path);
  if (!workbookData) {
    const div = document.createElement('div');
    div.textContent = 'No Data';
    return div;
  }

  const parseResult = parseEmbedLinkSyntax(`${src}|${alt}`);
  const sheetData = findSheet(workbookData, parseResult.sheetName);
  if (!sheetData?.cellData) {
    const div = document.createElement('div');
    div.textContent = 'No Sheet Data';
    return div;
  }

  const container = document.createElement('div');
  container.className = 'excel-embed-container';

  const effectiveHeight = parseResult.height ?? plugin.settings.embedTableHeight;

  if (plugin.settings.showJumpToOriginal) {
    const fileLabel = container.createDiv({
      cls: 'excel-embed-file-label internal-embed file-embed mod-generic is-loaded',
      attr: {
        src: file.path,
        alt: file.basename,
      },
    });
    fileLabel.textContent = file.basename;
    fileLabel.addEventListener('click', (event) => {
      event.stopPropagation();
      plugin.app.workspace.openLinkText(file.path, '', 'split');
    });
  }

  let startRow = 0;
  let startCol = 0;
  let endRow = Math.min(9, (sheetData.rowCount || 100) - 1);
  let endCol = Math.min(5, (sheetData.columnCount || 26) - 1);

  if (parseResult.startCell) {
    const startIdx = cellRefToIndex(parseResult.startCell);
    if (startIdx) {
      startRow = startIdx.row;
      startCol = startIdx.col;
    }
  }
  if (parseResult.endCell) {
    const endIdx = cellRefToIndex(parseResult.endCell);
    if (endIdx) {
      endRow = endIdx.row;
      endCol = endIdx.col;
    }
  }

  if (parseResult.displayType === 'html') {
    container.style.maxHeight = `${effectiveHeight}px`;
    container.style.overflowY = 'auto';
    const table = renderCellDataAsTable(sheetData.cellData, startRow, startCol, endRow, endCol);
    container.appendChild(table);
    return container;
  }

  const embedWorkbookData = parseResult.startCell && parseResult.endCell
    ? getRangeWorkbookData(workbookData, parseResult.sheetName, parseResult.startCell, parseResult.endCell)
    : cloneWorkbookData(workbookData);
  const univerEl = createUniverEmbedElement(
    embedWorkbookData,
    effectiveHeight,
    plugin.settings.showEmbedBottomContent,
    plugin,
    ctx,
  );
  container.appendChild(univerEl);

  return container;
}

function isSheetEmbed(src: string, _alt: string, plugin: Plugin, sourcePath = ''): boolean {
  const filePath = src.split('#')[0];
  if (!filePath) return false;

  if (filePath.endsWith('.sheet.md') || filePath.endsWith('.sheet') || filePath.endsWith('.univer.md')) return true;

  const file = resolveSheetFile(src, plugin, sourcePath);
  return !!file;
}

function isSheetTarget(file: TFile, plugin: Plugin): boolean {
  if (file.path.endsWith('.sheet.md') || file.path.endsWith('.sheet') || file.path.endsWith('.univer.md')) {
    return true;
  }

  const cache = plugin.app.metadataCache.getFileCache(file);
  return !!(cache?.frontmatter && SHEET_FRONTMATTER_KEYS.some(key => cache.frontmatter![key]));
}

function resolveSheetFile(src: string, plugin: Plugin, sourcePath = ''): TFile | null {
  const filePath = src.split('#')[0];
  if (!filePath) return null;

  const candidates = [
    filePath,
    filePath.endsWith('.md') ? filePath : `${filePath}.md`,
    filePath.endsWith('.univer.md') ? filePath : `${filePath}.univer.md`,
    filePath.endsWith('.sheet.md') ? filePath : `${filePath}.sheet.md`,
  ];

  for (const candidate of candidates) {
    const linkedFile = plugin.app.metadataCache.getFirstLinkpathDest(candidate, sourcePath);
    if (linkedFile instanceof TFile && isSheetTarget(linkedFile, plugin)) {
      return linkedFile;
    }
  }

  for (const candidate of candidates) {
    const directFile = plugin.app.vault.getAbstractFileByPath(candidate);
    if (directFile instanceof TFile && isSheetTarget(directFile, plugin)) {
      return directFile;
    }
  }

  return null;
}

function findSheet(workbookData: any, sheetName: string): any {
  if (!workbookData.sheets) return null;
  if (!sheetName) {
    const firstSheetId = workbookData.sheetOrder?.[0];
    return firstSheetId ? workbookData.sheets[firstSheetId] : null;
  }

  for (const sheetId of Object.keys(workbookData.sheets)) {
    if (workbookData.sheets[sheetId].name === sheetName) {
      return workbookData.sheets[sheetId];
    }
  }

  const firstSheetId = workbookData.sheetOrder?.[0];
  return firstSheetId ? workbookData.sheets[firstSheetId] : null;
}
