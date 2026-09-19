import type { ICommand } from '@univerjs/core';
import {
  CommandType,
  ICommandService,
} from '@univerjs/core';
import {
  ComponentManager,
  ContextMenuGroup,
  ContextMenuPosition,
  IMenuManagerService,
  MenuItemType,
  RibbonOthersGroup,
} from '@univerjs/ui';
import { FolderIcon, ExportIcon, LinkIcon } from '@univerjs/icons';
import { AddHyperLinkCommand } from '@univerjs/sheets-hyper-link';
import type { FUniver } from '@univerjs/core/facade';
import type { IWorkbookData } from '@univerjs/core';
import { xlsxToWorkbookData, workbookDataToXlsx, csvToWorkbookData, workbookDataToCsv, type WorkbookExportFormat } from './xlsx-converter';
import type { App, TFile } from 'obsidian';

type OnImportCallback = (data: IWorkbookData) => void;
type WorkbookFormat = 'xlsx' | 'xls' | 'csv';

// Injector cannot be referenced by name (TS2709: @wendellhu/redi resolves it as a
// namespace under 'bundler' resolution), and typescript-eslint resolves it to an
// `error` type. Give it a minimal structural type so the `.get()` receiver and the
// resolved services stay concrete; services are picked with explicit type args.
type UniverInjector = { get: <T>(token: unknown) => T };

export function setupImportExport(
  injector: UniverInjector,
  univerAPI: FUniver,
  onImport: OnImportCallback,
): () => void {
  const commandService = injector.get<ICommandService>(ICommandService);
  const menuManagerService = injector.get<IMenuManagerService>(IMenuManagerService);
  const componentManager = injector.get<ComponentManager>(ComponentManager);

  componentManager.register('FolderOpenIcon', FolderIcon);
  componentManager.register('ExportXlsxIcon', ExportIcon);
  componentManager.register('OutgoingLinkIcon', LinkIcon);

  const importXlsxCommandId = 'excel.import.xlsx';
  const importXlsCommandId = 'excel.import.xls';
  const importCsvCommandId = 'excel.import.csv';
  const exportXlsxCommandId = 'excel.export.xlsx';
  const exportXlsCommandId = 'excel.export.xls';
  const exportCsvCommandId = 'excel.export.csv';
  const addOutgoingLinkId = 'excel.add-outgoing-link';
  const addEmbedLinkId = 'excel.add-embed-link';

  const handleImport = (format: WorkbookFormat) => {
    const input = activeWindow.createEl('input');
    input.type = 'file';
    input.accept = `.${format}`;
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        let workbookData: IWorkbookData;
        const baseName = file.name.replace(/\.(xlsx|xls|csv)$/i, '');

        if (format === 'csv') {
          const text = await file.text();
          workbookData = csvToWorkbookData(text, baseName);
        } else {
          const buffer = await file.arrayBuffer();
          workbookData = xlsxToWorkbookData(buffer, baseName);
        }
        onImport(workbookData);
      } catch (err) {
        console.error(`Import ${format} error:`, err);
      }
    };
  };

  const handleExport = (format: WorkbookFormat) => {
    const activeWorkbook = univerAPI.getActiveWorkbook();
    if (!activeWorkbook) return;

    try {
      const workbookData = activeWorkbook.save();

      let blob: Blob;
      let fileName: string;
      let mime: string;

      if (format === 'csv') {
        const csvString = workbookDataToCsv(workbookData);
        blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
        fileName = 'export.csv';
        mime = 'text/csv;charset=utf-8';
      } else {
        const exportFormat: WorkbookExportFormat = format; // 'xlsx' | 'xls'
        const buffer = workbookDataToXlsx(workbookData, exportFormat);
        const ext = format === 'xls' ? 'xls' : 'xlsx';
        blob = new Blob([buffer], {
          type: ext === 'xls'
            ? 'application/vnd.ms-excel'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        fileName = `export.${ext}`;
        mime = blob.type; // unused fallback
      }

      void mime; // silence noUnusedLocals for csv/xlsx mimes
      const url = URL.createObjectURL(blob);
      const a = activeWindow.createEl('a');
      a.href = url;
      a.download = fileName;
      activeDocument.body.appendChild(a);
      a.click();
      activeDocument.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Export ${format} error:`, err);
    }
  };

  const importXlsxCommand: ICommand = {
    type: CommandType.OPERATION,
    id: importXlsxCommandId,
    handler: () => { handleImport('xlsx'); return true; },
  };
  const importXlsCommand: ICommand = {
    type: CommandType.OPERATION,
    id: importXlsCommandId,
    handler: () => { handleImport('xls'); return true; },
  };
  const importCsvCommand: ICommand = {
    type: CommandType.OPERATION,
    id: importCsvCommandId,
    handler: () => { handleImport('csv'); return true; },
  };

  const exportXlsxCommand: ICommand = {
    type: CommandType.OPERATION,
    id: exportXlsxCommandId,
    handler: () => { handleExport('xlsx'); return true; },
  };
  const exportXlsCommand: ICommand = {
    type: CommandType.OPERATION,
    id: exportXlsCommandId,
    handler: () => { handleExport('xls'); return true; },
  };
  const exportCsvCommand: ICommand = {
    type: CommandType.OPERATION,
    id: exportCsvCommandId,
    handler: () => { handleExport('csv'); return true; },
  };

  const addOutgoingLinkCommand: ICommand = {
    type: CommandType.OPERATION,
    id: addOutgoingLinkId,
    handler: () => {
      showOutgoingLinkModal(univerAPI, appInstance!);
      return true;
    },
  };

  const addEmbedLinkCommand: ICommand = {
    type: CommandType.OPERATION,
    id: addEmbedLinkId,
    handler: () => {
      copyEmbedLink(univerAPI);
      return true;
    },
  };

  commandService.registerCommand(importXlsxCommand);
  commandService.registerCommand(importXlsCommand);
  commandService.registerCommand(importCsvCommand);
  commandService.registerCommand(exportXlsxCommand);
  commandService.registerCommand(exportXlsCommand);
  commandService.registerCommand(exportCsvCommand);
  commandService.registerCommand(addOutgoingLinkCommand);
  commandService.registerCommand(addEmbedLinkCommand);

  menuManagerService.mergeMenu({
    [RibbonOthersGroup.OTHERS]: {
      [importXlsxCommandId]: {
        order: 10,
        menuItemFactory: () => ({
          id: importXlsxCommandId,
          title: 'IMPORT',
          tooltip: 'IMPORT',
          icon: 'FolderOpenIcon',
          type: MenuItemType.BUTTON_SELECTOR,
          selections: [
            { id: importXlsxCommandId, commandId: importXlsxCommandId, label: { name: 'FORMAT_XLSX', selectable: false }, value: 'xlsx' },
            { id: importXlsCommandId, commandId: importXlsCommandId, label: { name: 'FORMAT_XLS', selectable: false }, value: 'xls' },
            { id: importCsvCommandId, commandId: importCsvCommandId, label: { name: 'FORMAT_CSV', selectable: false }, value: 'csv' },
          ],
        }),
      },
      [exportXlsxCommandId]: {
        order: 11,
        menuItemFactory: () => ({
          id: exportXlsxCommandId,
          title: 'EXPORT',
          tooltip: 'EXPORT',
          icon: 'ExportXlsxIcon',
          type: MenuItemType.BUTTON_SELECTOR,
          selections: [
            { id: exportXlsxCommandId, commandId: exportXlsxCommandId, label: { name: 'FORMAT_XLSX', selectable: false }, value: 'xlsx' },
            { id: exportXlsCommandId, commandId: exportXlsCommandId, label: { name: 'FORMAT_XLS', selectable: false }, value: 'xls' },
            { id: exportCsvCommandId, commandId: exportCsvCommandId, label: { name: 'FORMAT_CSV', selectable: false }, value: 'csv' },
          ],
        }),
      },
    },
    [ContextMenuPosition.MAIN_AREA]: {
      [ContextMenuGroup.OTHERS]: {
        order: 0,
        'sheet.operation.insert-hyper-link': { order: 1 },
        [addOutgoingLinkId]: {
          order: 2,
          menuItemFactory: () => ({
            id: addOutgoingLinkId,
            title: 'addOutgoingLink',
            icon: 'OutgoingLinkIcon',
            type: MenuItemType.BUTTON,
          }),
        },
        'sheet.operation.show-comment-modal': { order: 3 },
        'sheet.operation.add-note-popup': { order: 4 },
        [addEmbedLinkId]: {
          order: 5,
          menuItemFactory: () => ({
            id: addEmbedLinkId,
            title: 'addEmbedLink',
            icon: 'OutgoingLinkIcon',
            type: MenuItemType.BUTTON,
          }),
        },
      },
    },
  });

  return () => {
    try {
      commandService.unregisterCommand(importXlsxCommandId);
      commandService.unregisterCommand(importXlsCommandId);
      commandService.unregisterCommand(importCsvCommandId);
      commandService.unregisterCommand(exportXlsxCommandId);
      commandService.unregisterCommand(exportXlsCommandId);
      commandService.unregisterCommand(exportCsvCommandId);
      commandService.unregisterCommand(addOutgoingLinkId);
      commandService.unregisterCommand(addEmbedLinkId);
    } catch (e) { console.warn('[excel-lite] unregister commands failed:', e); }
  };
}

let appInstance: App | null = null;

export function setObsidianApp(app: App) {
  appInstance = app;
}

function showOutgoingLinkModal(univerAPI: FUniver, app: App): void {
  const activeWorkbook = univerAPI.getActiveWorkbook();
  if (!activeWorkbook) return;

  const activeSheet = activeWorkbook.getActiveSheet();
  if (!activeSheet) return;

  const selection = activeSheet.getSelection();
  if (!selection) return;

  const files = app.vault.getFiles();

  const container = activeWindow.createDiv({ cls: 'excel-outgoing-link-modal-overlay' });
  activeDocument.body.appendChild(container);

  const modal = activeWindow.createDiv({ cls: 'excel-outgoing-link-modal' });
  container.appendChild(modal);

  const textSection = activeWindow.createDiv({ cls: 'excel-outgoing-link-section' });
  const textLabel = textSection.createEl('label', { cls: 'excel-outgoing-link-label' });
  textLabel.textContent = '文本';

  const input = textSection.createEl('input', { cls: 'excel-outgoing-link-input' });
  input.type = 'text';
  input.placeholder = '输入文本';
  modal.appendChild(textSection);

  const linkSection = activeWindow.createDiv({ cls: 'excel-outgoing-link-section' });
  const linkLabel = linkSection.createEl('label', { cls: 'excel-outgoing-link-label' });
  linkLabel.textContent = '外链';

  const listWrap = activeWindow.createDiv({ cls: 'excel-outgoing-link-list-wrap' });
  const listEl = activeWindow.createDiv({ cls: 'excel-outgoing-link-list' });
  listWrap.appendChild(listEl);
  linkSection.appendChild(listWrap);
  modal.appendChild(linkSection);

  const renderList = (filter: string) => {
    listEl.empty();
    const filtered = filter
      ? files.filter(f => f.path.toLowerCase().includes(filter.toLowerCase()) && f.extension === 'md')
      : files.filter(f => f.extension === 'md');

    filtered.slice(0, 50).forEach(file => {
      const item = activeWindow.createDiv({ cls: 'excel-outgoing-link-item' });

      const nameEl = item.createSpan({ cls: 'excel-outgoing-link-item-name' });
      nameEl.textContent = file.basename;

      const pathEl = item.createSpan({ cls: 'excel-outgoing-link-item-path' });
      pathEl.textContent = file.path;

      item.addEventListener('click', () => {
        insertOutgoingLink(univerAPI, app, file);
        container.remove();
      });
      listEl.appendChild(item);
    });
  };

  input.addEventListener('input', () => renderList(input.value));
  renderList('');

  const handleClose = () => container.remove();
  container.addEventListener('click', (e: MouseEvent) => {
    if (e.target === container) handleClose();
  });

  input.focus();
}

function insertOutgoingLink(univerAPI: FUniver, app: App, file: TFile): void {
  const activeWorkbook = univerAPI.getActiveWorkbook();
  if (!activeWorkbook) return;

  const sourcePath = activeWorkbook.getId();
  const linkText = app.metadataCache.fileToLinktext(file, sourcePath, true);
  const wikiLink = `[[${linkText}]]`;

  const activeSheet = activeWorkbook.getActiveSheet();
  if (!activeSheet) return;

  const range = activeSheet.getSelection()?.getActiveRange();
  if (!range) return;

  const row = range.getRow();
  const col = range.getColumn();

  try {
    univerAPI.executeCommand(AddHyperLinkCommand.id, {
      unitId: activeWorkbook.getId(),
      subUnitId: activeSheet.getSheet().id,
      link: {
        id: `outgoing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        row,
        column: col,
        payload: wikiLink,
        display: file.basename,
      },
    });
  } catch (e) {
    console.error('Excel: insert outgoing link error:', e);
  }
}

function copyEmbedLink(univerAPI: FUniver): void {
  const activeWorkbook = univerAPI.getActiveWorkbook();
  if (!activeWorkbook) return;

  const workbookId = activeWorkbook.getId();
  const activeSheet = activeWorkbook.getActiveSheet();
  if (!activeSheet) return;

  let sheetName: string | undefined;
  try {
    sheetName = activeSheet.getName?.() || activeSheet.getSheet()?.name;
  } catch {
    sheetName = undefined;
  }
  if (!sheetName) {
    const sheetId = activeSheet.getSheetId();
    const workbookData = activeWorkbook.save();
    if (workbookData?.sheets?.[sheetId]?.name) {
      sheetName = workbookData.sheets[sheetId].name;
    }
  }

  const selection = activeSheet.getSelection()?.getActiveRange();

  let rangeStr = '';
  if (selection) {
    const startRow = selection.getRow();
    const startCol = selection.getColumn();
    const endRow = startRow + selection.getHeight() - 1;
    const endCol = startCol + selection.getWidth() - 1;
    rangeStr = `|${colToLetter(startCol)}${startRow + 1}:${colToLetter(endCol)}${endRow + 1}`;
  }

  const embedLink = `![[${workbookId}#${sheetName}${rangeStr}]]`;

  void navigator.clipboard.writeText(embedLink);
}

function colToLetter(col: number): string {
  let result = '';
  let c = col;
  while (c >= 0) {
    result = String.fromCharCode(65 + (c % 26)) + result;
    c = Math.floor(c / 26) - 1;
  }
  return result;
}

export function handleOutgoingLinkClick(url: string, app: App): void {
  if (url.startsWith('[[') && url.endsWith(']]')) {
    const linkText = url.slice(2, -2);
    void app.workspace.openLinkText(linkText, '', 'split');
  }
}
