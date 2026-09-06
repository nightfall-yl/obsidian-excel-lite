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
import { xlsxToWorkbookData, workbookDataToXlsx, csvToWorkbookData, workbookDataToCsv } from './xlsx-converter';
import type { App, TFile } from 'obsidian';

type OnImportCallback = (data: IWorkbookData) => void;

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

  const importCommandId = 'excel.import-xlsx';
  const exportCommandId = 'excel.export-xlsx';
  const importCsvCommandId = 'excel.import-csv';
  const exportCsvCommandId = 'excel.export-csv';
  const addOutgoingLinkId = 'excel.add-outgoing-link';
  const addEmbedLinkId = 'excel.add-embed-link';

  const handleImport = () => {
    const input = activeWindow.createEl('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const buffer = await file.arrayBuffer();
        const workbookData = xlsxToWorkbookData(buffer, file.name.replace(/\.xlsx?$/i, ''));
        onImport(workbookData);
      } catch (err) {
        console.error('Import xlsx error:', err);
      }
    };
  };

  const handleExport = () => {
    const activeWorkbook = univerAPI.getActiveWorkbook();
    if (!activeWorkbook) return;

    try {
      const workbookData = activeWorkbook.save();
      const buffer = workbookDataToXlsx(workbookData);

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = activeWindow.createEl('a');
      a.href = url;
      a.download = 'export.xlsx';
      activeDocument.body.appendChild(a);
      a.click();
      activeDocument.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export xlsx error:', err);
    }
  };

  const handleImportCsv = () => {
    const input = activeWindow.createEl('input');
    input.type = 'file';
    input.accept = '.csv';
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const workbookData = csvToWorkbookData(text, file.name.replace(/\.csv$/i, ''));
        onImport(workbookData);
      } catch (err) {
        console.error('Import csv error:', err);
      }
    };
  };

  const handleExportCsv = () => {
    const activeWorkbook = univerAPI.getActiveWorkbook();
    if (!activeWorkbook) return;

    try {
      const workbookData = activeWorkbook.save();
      const csvString = workbookDataToCsv(workbookData);

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = activeWindow.createEl('a');
      a.href = url;
      a.download = 'export.csv';
      activeDocument.body.appendChild(a);
      a.click();
      activeDocument.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export csv error:', err);
    }
  };

  const importCommand: ICommand = {
    type: CommandType.OPERATION,
    id: importCommandId,
    handler: () => {
      handleImport();
      return true;
    },
  };

  const exportCommand: ICommand = {
    type: CommandType.OPERATION,
    id: exportCommandId,
    handler: () => {
      handleExport();
      return true;
    },
  };

  const importCsvCommand: ICommand = {
    type: CommandType.OPERATION,
    id: importCsvCommandId,
    handler: () => {
      handleImportCsv();
      return true;
    },
  };

  const exportCsvCommand: ICommand = {
    type: CommandType.OPERATION,
    id: exportCsvCommandId,
    handler: () => {
      handleExportCsv();
      return true;
    },
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

  commandService.registerCommand(importCommand);
  commandService.registerCommand(exportCommand);
  commandService.registerCommand(importCsvCommand);
  commandService.registerCommand(exportCsvCommand);
  commandService.registerCommand(addOutgoingLinkCommand);
  commandService.registerCommand(addEmbedLinkCommand);

  menuManagerService.mergeMenu({
    [RibbonOthersGroup.OTHERS]: {
      [importCommandId]: {
        order: 10,
        menuItemFactory: () => ({
          id: importCommandId,
          title: 'importXlsx',
          tooltip: 'importXlsx',
          icon: 'FolderOpenIcon',
          type: MenuItemType.BUTTON,
        }),
      },
      [exportCommandId]: {
        order: 11,
        menuItemFactory: () => ({
          id: exportCommandId,
          title: 'exportXlsx',
          tooltip: 'exportXlsx',
          icon: 'ExportXlsxIcon',
          type: MenuItemType.BUTTON,
        }),
      },
      [importCsvCommandId]: {
        order: 12,
        menuItemFactory: () => ({
          id: importCsvCommandId,
          title: 'importCsv',
          tooltip: 'importCsv',
          icon: 'FolderOpenIcon',
          type: MenuItemType.BUTTON,
        }),
      },
      [exportCsvCommandId]: {
        order: 13,
        menuItemFactory: () => ({
          id: exportCsvCommandId,
          title: 'exportCsv',
          tooltip: 'exportCsv',
          icon: 'ExportXlsxIcon',
          type: MenuItemType.BUTTON,
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
      commandService.unregisterCommand(importCommandId);
      commandService.unregisterCommand(exportCommandId);
      commandService.unregisterCommand(importCsvCommandId);
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
