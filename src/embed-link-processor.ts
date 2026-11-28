import type { IWorkbookData, IWorksheetData, ICellData } from '@univerjs/core';
import { BooleanNumber, LifecycleStages } from '@univerjs/core';
import type { Plugin } from 'obsidian';
import { MarkdownPostProcessorContext, MarkdownRenderChild, Platform, TFile, WorkspaceLeaf } from 'obsidian';
import { parseSheetFile } from './data-utils';
import { VIEW_TYPE_SHEET } from './constants';
import { SHEET_FRONTMATTER_KEYS } from './constants';
import { createUniverInstance } from './setup-univer';
import { t } from './i18n';

interface EmbedPlugin extends Plugin {
  isSheetFile(file: TFile): boolean;
  loadData(): Promise<unknown>;
  settings: {
    embedTableHeight: number;
    showJumpToOriginal: boolean;
    showEmbedBottomContent: boolean;
  };
}

// 每个窗口文档只注册一次的 mousedown 捕获守卫：单击嵌入表格时取消默认行为。
// 单击嵌入表格会使编辑器获得焦点，CodeMirror 随即 scrollIntoView 到当前选区
// （通常在文档开头），表现为文档跳转到开头；CM 只尊重 defaultPrevented，
// 冒泡阶段 stopPropagation 拦不住其祖先层处理器，必须在文档捕获阶段
// preventDefault。注意弹出窗口是独立 document，监听必须注册在容器所属的
// window 文档上（activeWindow），而非主窗口。
const mousedownGuardDocs = new WeakMap<Document, boolean>();
function registerEmbedMousedownGuard(plugin: EmbedPlugin, doc: Document): void {
  if (mousedownGuardDocs.has(doc)) return;
  mousedownGuardDocs.set(doc, true);
  plugin.registerDomEvent(
    doc,
    'mousedown',
    (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('.excel-embed-container')) {
        e.preventDefault();
      }
    },
    true,
  );
}

interface ProcessorContext {
  sourcePath: string;
  remainingNestLevel: number;
  containerEl: HTMLElement;
  addChild?: (child: MarkdownRenderChild) => unknown;
  [key: string]: unknown;
}

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

function getCellValue(cell: ICellData | undefined): string {
  if (!cell) return '';
  const v = cell.v;
  if (v != null) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      return String(v);
    }
    return '';
  }
  const p = cell.p as { body?: { dataStream?: string } } | undefined;
  if (p?.body?.dataStream) {
    const stream: string = p.body.dataStream;
    return stream.replace(/\r?\n$/, '').replace(/\n/g, ' ');
  }
  return '';
}

function renderCellDataAsTable(
  cellData: IWorksheetData['cellData'],
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): HTMLTableElement {
  const table = activeWindow.createEl('table');
  table.className = 'excel-embed-table';

  for (let r = startRow; r <= endRow; r++) {
    const tr = activeWindow.createEl('tr');
    for (let c = startCol; c <= endCol; c++) {
      const cell = cellData?.[r]?.[c];
      const value = getCellValue(cell);
      const td = activeWindow.createEl(r === startRow ? 'th' : 'td');
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

  const rowData: IWorksheetData['rowData'] = sheet.rowData || {};
  for (let row = 0; row < startRow; row++) {
    rowData[row] = {
      ...(rowData[row] || {}),
      hd: BooleanNumber.TRUE,
      h: rowData[row]?.h || sheet.defaultRowHeight || 25,
    };
  }
  sheet.rowData = rowData;

  const columnData: IWorksheetData['columnData'] = sheet.columnData || {};
  for (let col = 0; col < startCol; col++) {
    columnData[col] = {
      ...(columnData[col] || {}),
      hd: BooleanNumber.TRUE,
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

// 从 workspace leaves 定位元素所属的 CodeMirror EditorView。
// 说明：CM6 的内部属性 cmView 在部分 Obsidian 版本上不可用（运行时证据：
// viewFound 始终为 false），改用 leaf.view.editor.cm —— Obsidian 插件的
// 标准访问方式，通过编辑器 DOM 包含关系匹配。
function findEditorView(
  plugin: EmbedPlugin,
  el: HTMLElement,
): { requestMeasure?: () => void } | null {
  let found: { requestMeasure?: () => void } | null = null;
  try {
    plugin.app.workspace.iterateAllLeaves((leaf) => {
      if (found) return;
      const cm = (leaf.view as unknown as {
        editor?: { cm?: { dom?: HTMLElement } & { requestMeasure?: () => void } };
      }).editor?.cm;
      if (cm?.dom?.contains(el)) found = cm;
    });
  } catch { /* ignore */ }
  return found;
}

// 让 CodeMirror 立即重测视口高度。Live Preview 的嵌入块 widget 先以空内容
// 插入并被 CM 测量（约一行高），表格内容是异步填充的且 CM 感知不到 widget
// 内部的高度变化，其高度地图停留在旧值；此后 CM 为光标做 scrollIntoView
// 时按过期几何计算，长笔记中插入表格后光标被算到比实际高约一个表格高度
// 的位置，页面随之向上跳（运行时证据：scrollTop 1687.5→655，差值恰为
// 表格高度）。填充完成后主动 requestMeasure 让 CM 在光标仍处于插入点时
// 重测并正确锚定。阅读视图无编辑器，自然跳过。
function requestEditorMeasure(el: HTMLElement, plugin: EmbedPlugin): void {
  const view = findEditorView(plugin, el);
  try {
    view?.requestMeasure?.();
  } catch { /* 测量失败不影响渲染 */ }
}

function createUniverEmbedElement(
  workbookData: IWorkbookData,
  height: number,
  showFooter: boolean,
  plugin: EmbedPlugin,
  ctx: ProcessorContext,
): { el: HTMLDivElement; rebuild: (wb: IWorkbookData) => void } {
  const embedEl = activeWindow.createDiv();
  embedEl.className = 'excel-embed-univer';
  embedEl.style.height = `${height}px`;

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

  // 滚动守护：锚点为"当前挂载/刷新时刻"的滚动位置。锚点必须随每次挂载、
  // 每次过期刷新重新捕获——若沿用旧锚点，Rendered 时的守护会把页面拉回
  // 旧位置（表现为刷新后向上滑动）。
  let scrollerEl: HTMLElement | null = null;
  let savedScrollTop: number | null = null;
  let guardScroll: () => void = () => {};

  const initScrollGuard = (): void => {
    scrollerEl = embedEl.closest('.cm-scroller') as HTMLElement | null;
    savedScrollTop = scrollerEl ? scrollerEl.scrollTop : null;
    guardScroll = () => {
      if (disposed || !scrollerEl || savedScrollTop === null) return;
      const cur = scrollerEl.scrollTop;
      if (Math.abs(cur - savedScrollTop) > 100) {
        scrollerEl.scrollTop = savedScrollTop;
      }
    };
  };

  // 用给定的工作簿数据初始化 Univer 实例（首次挂载与过期刷新共用）

  // 用给定的工作簿数据初始化 Univer 实例（首次挂载与过期刷新共用）
  const initUniver = (wb: IWorkbookData): void => {
    const isDark = plugin.app.isDarkMode?.() ?? activeDocument.body.hasClass?.('theme-dark') ?? false;
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
      } catch (e) { console.warn('[excel-lite] dispose lifecycle listener failed:', e); }
      try {
        univer.dispose();
      } catch (e) { console.warn('[excel-lite] dispose univer instance failed:', e); }
    };

    const workbook = univerAPI.createWorkbook(wb);
    // 权限弹窗在首次渲染时可能抢在 Rendered 事件之前弹出（偶发浮窗），
    // 创建工作簿后立即隐藏一次，Rendered 时再兜底
    try {
      univerAPI.setPermissionDialogVisible(false);
    } catch (e) { console.warn('[excel-lite] hide permission dialog failed:', e); }
    // 冷启动时权限服务晚于上述调用才挂载弹窗组件，定点隐藏会扑空；
    // 在初始化窗口内多次补隐藏，确保弹窗挂载后随即被关闭
    [100, 300, 600, 1000].forEach((delay) => {
      window.setTimeout(() => {
        if (disposed) return;
        try {
          univerAPI.setPermissionDialogVisible(false);
        } catch { /* ignore */ }
      }, delay);
    });
    lifecycleDisposable = univerAPI.addEvent(univerAPI.Event.LifeCycleChanged, (event: unknown) => {
      if ((event as { stage: LifecycleStages }).stage !== LifecycleStages.Rendered) return;

      // 表格渲染落定后再重测一次 + 守护复位，兜住渲染过程中的布局微调
      requestEditorMeasure(embedEl, plugin);
      guardScroll();

      try {
        const permission = workbook?.getWorkbookPermission?.();
        void permission?.setReadOnly?.();
        univerAPI.setPermissionDialogVisible(false);
      } catch (e) { console.warn('[excel-lite] permission setup failed:', e); }
    });
  };

  const observer = new MutationObserver(() => {
    if (disposed) return;
    if (!activeDocument.body.contains(embedEl)) return;

    observer.disconnect();

    // 修正 CM 过期高度地图 + 守护式复位滚动。
    // CM 在嵌入块 widget 填充的同一同步事务里按旧几何为光标 scrollIntoView，
    // Obsidian 在渲染完成后还会再做一次 reveal 滚动（运行时证据：复位到
    // 1687.5 后 Rendered 时又变回 655）。因此先 requestMeasure 修正高度地图，
    // 立即复位一次，再在渲染窗口内的多个时间点守护：偏移超过 100px 才拉回，
    // 避免干扰用户主动滚动。
    initScrollGuard();
    requestEditorMeasure(embedEl, plugin);
    if (scrollerEl && savedScrollTop !== null) {
      scrollerEl.scrollTop = savedScrollTop;
    }
    [150, 400, 800].forEach((delay) => window.setTimeout(guardScroll, delay));

    initUniver(workbookData);
  });

  observer.observe(activeDocument.body, { childList: true, subtree: true });

  ctx?.addChild?.(new class extends MarkdownRenderChild {
    onunload(): void {
      cleanup();
    }
  }(embedEl));

  // 用新数据原地重建 Univer 实例（源文件更新后的过期刷新）：
  // 容器高度固定，重建不改变布局，重测一次高度地图即可。
  // 锚点必须在 dispose 前重新捕获当前位置——沿用旧锚点会把页面拉回
  // 首次挂载时的位置（即刷新后向上滑的原因）
  const rebuild = (wb: IWorkbookData): void => {
    if (disposed) return;
    initScrollGuard();
    if (disposeUniver) {
      disposeUniver();
      disposeUniver = null;
    }
    embedEl.empty();
    initUniver(wb);
    requestEditorMeasure(embedEl, plugin);
    if (scrollerEl && savedScrollTop !== null) {
      scrollerEl.scrollTop = savedScrollTop;
    }
    [150, 400, 800].forEach((delay) => window.setTimeout(guardScroll, delay));
  };

  return { el: embedEl, rebuild };
}

export function registerEmbedLinkProcessor(plugin: EmbedPlugin): void {
  plugin.registerMarkdownCodeBlockProcessor('sheet-embed', async (source: string, el: HTMLElement) => {
    el.createEl('p', { text: 'Sheet embed block', cls: 'excel-embed-placeholder' });
  });

  const processor = async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
    // Obsidian's runtime context also exposes containerEl / remainingNestLevel even
    // though they are not fully reflected in the shipped typings. Bridge them into the
    // internal ProcessorContext that downstream helpers rely on.
    const rawCtx = ctx as unknown as Record<string, unknown>;
    const processorCtx: ProcessorContext = {
      ...rawCtx,
      sourcePath: ctx.sourcePath,
      containerEl: rawCtx.containerEl as HTMLElement,
      remainingNestLevel: rawCtx.remainingNestLevel as number,
    };

    // 收集两种嵌入容器：
    // .internal-embed  → 阅读视图 / 已渲染完成的嵌入
    // .cm-embed-block  → 编辑视图 (Live Preview) 中的 CodeMirror 嵌入块
    const internalEmbeds = el.querySelectorAll('.internal-embed');
    const cmEmbeds = el.querySelectorAll('.cm-embed-block');

    const allEmbeds: Element[] = [...internalEmbeds, ...cmEmbeds];

    if (allEmbeds.length > 0) {
      await processEmbedBlocks(allEmbeds, processorCtx, plugin);
    }

    // 编辑视图下，当前文件本身是 sheet 文件的场景
    await processEditMode(el, processorCtx, plugin);
  };

  plugin.registerMarkdownPostProcessor(processor);
}

async function processEditMode(el: HTMLElement, ctx: ProcessorContext, plugin: EmbedPlugin): Promise<void> {
  const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
  if (!(file instanceof TFile)) return;
  if (!plugin.isSheetFile(file)) return;

  if (ctx.remainingNestLevel < 4) return;

  const containerEl = ctx.containerEl;
  let embedDiv: HTMLElement = containerEl;

  while (
    !embedDiv.hasClass('dataview')
    && !embedDiv.hasClass('cm-preview-code-block')
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

async function processEmbedBlocks(embeds: Element[], ctx: ProcessorContext, plugin: EmbedPlugin): Promise<void> {
  for (const embedEl of embeds) {
    const embedHTMLEl = embedEl as HTMLElement;

    // 跳过已处理的元素
    if (embedHTMLEl.hasAttribute?.('excel-ready')) continue;
    if (embedHTMLEl.hasClass?.('excel-embed-file-label')) continue;

    // 获取嵌入目标的 src 和 alt
    // 优先从容器自身取，.cm-embed-block 可能没有 src 属性时，尝试从 Obsidian 渲染的子元素里取
    let src = embedEl.getAttribute('src') || '';
    let alt = embedEl.getAttribute('alt') || '';

    // fallback：如果 .cm-embed-block 自身没有 src，检查子元素
    if (!src && embedHTMLEl.hasClass?.('cm-embed-block')) {
      const childWithSrc = embedHTMLEl.querySelector('[src]');
      if (childWithSrc) {
        src = childWithSrc.getAttribute('src') || '';
        alt = childWithSrc.getAttribute('alt') || '';
      }
    }

    if (!src) continue;
    if (!isSheetEmbed(src, alt, plugin, ctx.sourcePath)) continue;

    const targetFile = resolveSheetFile(src, plugin, ctx.sourcePath);
    if (!targetFile) continue;

    try {
      const data = await plugin.app.vault.read(targetFile);
      const sheetDiv = await createEmbedLinkDiv(src, alt, targetFile, data, plugin, ctx);

      // dblclick 跳转监听已在 createEmbedLinkDiv 中绑定到 sheetDiv 本身，
      // 无论最终哪个实例可见（processEditMode 可能重建容器内容），监听都跟随实例。
      // 根据容器类型选择替换策略
      if (embedHTMLEl.hasClass?.('cm-embed-block')) {
        // CodeMirror 嵌入块：清空内容后追加
        embedHTMLEl.empty();
        embedHTMLEl.appendChild(sheetDiv);
      } else {
        // 阅读视图 / Live Preview widget：直接 replaceWith
        embedEl.replaceWith(sheetDiv);
      }
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
  plugin: EmbedPlugin,
  ctx: ProcessorContext,
): Promise<HTMLDivElement> {
  const workbookData = parseSheetFile(data, file.path);
  if (!workbookData) {
    const div = activeWindow.createDiv();
    div.textContent = 'No data';
    return div;
  }

  const parseResult = parseEmbedLinkSyntax(`${src}|${alt}`);
  const sheetData = findSheet(workbookData, parseResult.sheetName);
  if (!sheetData?.cellData) {
    const div = activeWindow.createDiv();
    div.textContent = 'No sheet data';
    return div;
  }

  // 悬浮预览弹层（hover-popover）内不渲染重型 Univer 实例：运行时证据表明
  // 鼠标滑过嵌入链接触发的页面预览会在 .popover 中创建完整嵌入实例，形成
  // 滞留的"浮窗"且开销高昂。改为轻量占位提示（与 Excalidraw 等插件策略一致）。
  if (ctx.containerEl?.closest?.('.popover')) {
    const placeholder = activeWindow.createDiv();
    placeholder.className = 'excel-embed-popover-placeholder';
    placeholder.textContent = t('EMBED_POPOVER_HINT');
    return placeholder;
  }

  const container = activeWindow.createDiv();
  container.className = 'excel-embed-container';

  // 注册当前窗口文档的 mousedown 捕获守卫（见函数注释）
  registerEmbedMousedownGuard(plugin, activeWindow.document);

  // 阻止鼠标/键盘事件到达编辑器（CodeMirror）。冒泡阶段拦截：Univer 内部
  // 元素先于本层收到事件，交互不受影响。wheel 必须额外 preventDefault——
  // 浏览器滚动最近可滚动祖先是默认行为，stopPropagation 不影响默认行为。
  const stopPropagation = (e: Event): void => {
    if (e.type === 'wheel') e.preventDefault();
    e.stopPropagation();
  };
  container.addEventListener('mousedown', stopPropagation);
  container.addEventListener('pointerdown', stopPropagation);
  container.addEventListener('click', stopPropagation);
  container.addEventListener('wheel', stopPropagation, { passive: false });
  container.addEventListener('keydown', stopPropagation);

  // 快速双击跳转到源文件。监听绑定在实例自身：Live Preview 中 markdown 后处理器
  // 在游离片段上运行（此时不存在 .cm-embed-block），且 processEditMode 可能
  // 清空容器重建内容，只有绑定实例才能保证最终可见的表格始终可双击跳转。
  // 跳转源文件：已有显示该 sheet 的视图时聚焦复用，否则才新开分屏，避免重复打开。
  // 注意 .sheet.md 文件初始为 markdown 视图，加载后被换成 SheetView（excel-view），
  // 因此两种 leaf 类型都要搜索。
  const openSourceLeaf = (): void => {
    const { workspace } = plugin.app;
    const match = (leaf: WorkspaceLeaf): string | undefined =>
      (leaf.view as { file?: TFile }).file?.path;
    const existing = [...workspace.getLeavesOfType('markdown'), ...workspace.getLeavesOfType(VIEW_TYPE_SHEET)]
      .find((leaf) => match(leaf) === file.path);
    if (existing) {
      workspace.setActiveLeaf(existing);
      return;
    }
    void workspace.openLinkText(file.path, '', 'split');
  };

  // 浏览器原生 dblclick 判定间隔约 500ms，过慢；改用自定义判定：两次点击
  // 间隔不超过 FAST_DOUBLE_CLICK_MS 才视为快速双击。监听绑定实例自身的理由同上。
  const FAST_DOUBLE_CLICK_MS = 300;
  let lastTableClickAt = 0;
  container.addEventListener('click', (event: MouseEvent) => {
    // 文件名标签单击即跳转（其监听已 stopPropagation，此处兜底排除）
    if ((event.target as HTMLElement | null)?.closest?.('.excel-embed-file-label')) return;
    // 仅编辑视图生效：阅读视图下快速双击不打开源文件
    if (!container.closest('.cm-editor')) return;
    const now = Date.now();
    if (now - lastTableClickAt <= FAST_DOUBLE_CLICK_MS) {
      lastTableClickAt = 0;
      openSourceLeaf();
      return;
    }
    lastTableClickAt = now;
  });

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
    fileLabel.addEventListener('click', (event: MouseEvent) => {
      event.stopPropagation();
      openSourceLeaf();
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
    container.addClass('excel-embed-overflow-auto');
    container.style.maxHeight = `${effectiveHeight}px`;
    const table = renderCellDataAsTable(sheetData.cellData, startRow, startCol, endRow, endCol);
    container.appendChild(table);
    return container;
  }

  const embedWorkbookData = parseResult.startCell && parseResult.endCell
    ? getRangeWorkbookData(workbookData, parseResult.sheetName, parseResult.startCell, parseResult.endCell)
    : cloneWorkbookData(workbookData);
  const { el: univerEl, rebuild } = createUniverEmbedElement(
    embedWorkbookData,
    effectiveHeight,
    plugin.settings.showEmbedBottomContent,
    plugin,
    ctx,
  );
  container.appendChild(univerEl);

  // 过期指示器：源文件更新后提示并可一键原地刷新。
  // 监听通过独立渲染子组件清理（CM 虚拟化会频繁销毁/重建 widget，
  // EventRef 必须随实例生命周期注销，否则堆积泄漏）。
  const staleBadge = container.createDiv({ cls: 'excel-embed-stale-badge' });
  staleBadge.setText(t('EMBED_STALE'));
  const staleRef = plugin.registerEvent(
    plugin.app.vault.on('modify', (f) => {
      if (f instanceof TFile && f.path === file.path) {
        container.addClass('excel-embed-stale');
      }
    }),
  );
  staleBadge.addEventListener('click', async (event: MouseEvent) => {
    event.stopPropagation();
    try {
      const fresh = await plugin.app.vault.read(file);
      const parsed = parseSheetFile(fresh, file.path);
      if (!parsed || !parsed.sheets || Object.keys(parsed.sheets).length === 0) return;
      const wb = parseResult.startCell && parseResult.endCell
        ? getRangeWorkbookData(parsed, parseResult.sheetName, parseResult.startCell, parseResult.endCell)
        : cloneWorkbookData(parsed);
      rebuild(wb);
      container.removeClass('excel-embed-stale');
    } catch (e) {
      console.error('Excel: embed refresh error:', e);
    }
  });
  ctx?.addChild?.(new class extends MarkdownRenderChild {
    onunload(): void {
      plugin.app.vault.offref(staleRef);
    }
  }(container));

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

function findSheet(workbookData: IWorkbookData, sheetName: string): IWorksheetData | null {
  if (!workbookData.sheets) return null;
  if (!sheetName) {
    const firstSheetId = workbookData.sheetOrder?.[0];
    return firstSheetId ? (workbookData.sheets[firstSheetId] as IWorksheetData | undefined) ?? null : null;
  }

  for (const sheetId of Object.keys(workbookData.sheets)) {
    const sheet = workbookData.sheets[sheetId];
    if (sheet.name === sheetName) {
      return sheet as IWorksheetData;
    }
  }

  const firstSheetId = workbookData.sheetOrder?.[0];
  return firstSheetId ? (workbookData.sheets[firstSheetId] as IWorksheetData | undefined) ?? null : null;
}
