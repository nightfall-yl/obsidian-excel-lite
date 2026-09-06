import {
  Plugin,
  TFile,
  TFolder,
  WorkspaceLeaf,
  normalizePath,
  ViewState,
  SettingGroup,
  PluginSettingTab,
  AbstractInputSuggest,
  App,
} from 'obsidian';
import { around } from 'monkey-around';
import { VIEW_TYPE_SHEET, BLANK_CONTENT, SHEET_FRONTMATTER_KEYS } from './constants';
import { SheetView } from './SheetView';
import { t } from './i18n';
import { setObsidianApp } from './ImportExportPlugin';
import { registerEmbedLinkProcessor } from './embed-link-processor';
import './custom.css';

const SHEET_FILE_EXT = 'sheet';

interface ExcelSettings {
  folder: string;
  filenamePrefix: string;
  fileTimeFormat: string;
  embedTableHeight: number;
  showJumpToOriginal: boolean;
  showEmbedBottomContent: boolean;
}

const DEFAULT_SETTINGS: ExcelSettings = {
  folder: '/',
  filenamePrefix: '',
  fileTimeFormat: 'YYYY-MM-DD HH.mm.ss',
  embedTableHeight: 300,
  showJumpToOriginal: false,
  showEmbedBottomContent: false,
};

export default class ExcelPlugin extends Plugin {
  settings: ExcelSettings;

  async onload() {
    try {
      await this.loadSettings();
      setObsidianApp(this.app);

      this.registerView(VIEW_TYPE_SHEET, (leaf: WorkspaceLeaf) => new SheetView(leaf));
      this.registerExtensions([SHEET_FILE_EXT], VIEW_TYPE_SHEET);

      this.addRibbonIcon('sheet', t('CREATE_SHEET'), () => {
        void this.createAndOpenSheet(this.settings.folder);
      });

      this.addCommand({
        id: 'create-sheet',
        name: t('CREATE_SHEET'),
        hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'e' }],
        callback: () => {
          void this.createAndOpenSheet(this.settings.folder);
        },
      });

      this.addCommand({
        id: 'toggle-sheet-preview',
        name: 'Toggle mobile preview mode',
        callback: () => {
          const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SHEET);
          for (const leaf of leaves) {
            const view = leaf.view;
            if (view instanceof SheetView) {
              view.toggleMobileModeExternal();
            }
          }
        },
      });

      this.registerEvent(
        this.app.workspace.on('file-menu', (menu, file) => {
          menu.addItem((item) => {
            item
              .setTitle(t('CREATE_SHEET'))
              .setIcon('sheet')
              .onClick(() => {
                const folder = file instanceof TFolder ? file.path : file.parent?.path || '/';
                void this.createAndOpenSheet(folder);
              });
          });
        }),
      );

      this.registerMonkeyPatches();
      this.switchToSheetAfterLoad();
      registerEmbedLinkProcessor(this);

      this.addSettingTab(new ExcelSettingTab(this, this.app));
    } catch (e) {
      const errStr = e instanceof Error ? `${e.message}\n${e.stack || ''}` : String(e);
      console.error('[excel-lite] onload error:', errStr);
      try {
        await this.app.vault.adapter.write(
          'excel-error-log.txt',
          `[${new Date().toISOString()}]\n${errStr}`
        );
      } catch (e) { console.warn('[excel-lite] writing error log failed:', e); }
    }
  }

  onunload() {
    // Intentionally not detaching leaves to preserve user layout
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private registerMonkeyPatches() {
    const { app } = this;

    this.register(
      around(WorkspaceLeaf.prototype, {
        setViewState(next) {
          return function (state: ViewState, ...rest: any[]) {
            if (
              state.type === 'markdown'
              && state.state?.file
            ) {
              const filepath = state.state.file as string;
              const cache = app.metadataCache.getCache(filepath);

              if (
              (cache?.frontmatter && SHEET_FRONTMATTER_KEYS.some(key => cache.frontmatter![key]))
              || filepath.endsWith('.univer.md')
            ) {
                const newState = {
                  ...state,
                  type: VIEW_TYPE_SHEET,
                };
                return next.apply(this, [newState, ...rest]);
              }
            }

            return next.apply(this, [state, ...rest]);
          };
        },
      }),
    );
  }

  private switchToSheetAfterLoad(): void {
    this.app.workspace.onLayoutReady(() => {
      const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');
      for (const leaf of markdownLeaves) {
        if (leaf.view instanceof SheetView) continue;
        const file = (leaf.view as { file?: TFile }).file;
        if (file && this.isSheetFile(file)) {
          void this.setSheetView(leaf);
        }
      }
    });
  }

  isSheetFile(f: TFile): boolean {
    if (f.extension === SHEET_FILE_EXT) return true;
    if (f.path.endsWith('.sheet.md')) return true;
    if (f.path.endsWith('.univer.md')) return true;
    const cache = this.app.metadataCache.getFileCache(f);
    if (!cache?.frontmatter) return false;
    return SHEET_FRONTMATTER_KEYS.some(key => cache.frontmatter![key]);
  }

  private async setSheetView(leaf: WorkspaceLeaf): Promise<void> {
    await leaf.setViewState({
      type: VIEW_TYPE_SHEET,
      state: leaf.view.getState(),
      popstate: true,
    } as ViewState);
  }

  private formatFilenameWithTimestamp(prefix: string, format: string): string {
    const timestamp = format ? window.moment().format(format) : '';
    return `${prefix}${timestamp}`.trim() || 'Excel';
  }

  private async checkAndCreateFolder(folderPath: string): Promise<void> {
    const folder = normalizePath(folderPath);
    const existing = this.app.vault.getAbstractFileByPath(folder);
    if (existing instanceof TFolder) return;
    if (existing instanceof TFile) return;
    await this.app.vault.createFolder(folder);
  }

  private async createAndOpenSheet(folderPath: string): Promise<void> {
    const folder = normalizePath(folderPath);
    await this.checkAndCreateFolder(folder);
    const filename = this.formatFilenameWithTimestamp(this.settings.filenamePrefix, this.settings.fileTimeFormat);
    const filepath = normalizePath(`${folder}/${filename}.sheet.md`);

    let finalPath = filepath;
    let counter = 0;
    while (this.app.vault.getAbstractFileByPath(finalPath)) {
      finalPath = normalizePath(`${folder}/${filename}_${counter}.sheet.md`);
      counter++;
    }

    const file = await this.app.vault.create(finalPath, BLANK_CONTENT);
    await this.openSheetFile(file);
  }

  private async openSheetFile(file: TFile): Promise<void> {
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file);
    await this.setSheetView(leaf);
  }
}

class ExcelSettingTab extends PluginSettingTab {
  plugin: ExcelPlugin;
  private folderSuggests: FolderSuggest[] = [];

  constructor(plugin: ExcelPlugin, app: App) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    this.closeFolderSuggests();
    containerEl.empty();

    new SettingGroup(containerEl)
      .setHeading(t('SETTINGS_FILE_TITLE'))
      .addSetting((setting) => {
        setting
          .setName(t('SETTING_FILENAME_PREFIX'))
          .setDesc(t('SETTING_FILENAME_PREFIX_DESC'))
          .addText((text) => text
            .setPlaceholder('Excel ')
            .setValue(this.plugin.settings.filenamePrefix)
            .onChange((value) => {
              this.plugin.settings.filenamePrefix = value;
              void this.plugin.saveSettings();
            }));
      })
      .addSetting((setting) => {
        setting
          .setName(t('SETTING_FOLDER'))
          .setDesc(t('SETTING_FOLDER_DESC'))
          .addText((text) => {
            text
              .setPlaceholder('/')
              .setValue(this.plugin.settings.folder)
              .onChange((value) => {
                this.plugin.settings.folder = value || '/';
                void this.plugin.saveSettings();
              });

            const inputEl = text.inputEl;
            inputEl.addClass('excel-folder-input');
            inputEl.setAttribute('autocomplete', 'off');
            inputEl.setAttribute('readonly', '');
            inputEl.addEventListener('mousedown', () => {
              inputEl.removeAttribute('readonly');
            }, { once: true });
            this.folderSuggests.push(new FolderSuggest(this.app, inputEl, async (folderPath) => {
              this.plugin.settings.folder = folderPath;
              await this.plugin.saveSettings();
            }));
          });
      })
      .addSetting((setting) => {
        setting
          .setName(t('SETTING_FILE_TIME_FORMAT'))
          .setDesc(t('SETTING_FILE_TIME_FORMAT_DESC'))
          .addText((text) => text
            .setPlaceholder('YYYY-MM-DD HH.mm.ss')
            .setValue(this.plugin.settings.fileTimeFormat)
            .onChange((value) => {
              this.plugin.settings.fileTimeFormat = value;
              void this.plugin.saveSettings();
            }));
      });

    new SettingGroup(containerEl)
      .setHeading(t('SETTINGS_EMBED_TITLE'))
      .addSetting((setting) => {
        setting
          .setName(t('SETTING_EMBED_HEIGHT'))
          .setDesc(t('SETTING_EMBED_HEIGHT_DESC'))
          .addText((text) => text
            .setPlaceholder('300')
            .setValue(String(this.plugin.settings.embedTableHeight))
            .onChange((value) => {
              const num = parseInt(value);
              this.plugin.settings.embedTableHeight = isNaN(num) ? 300 : Math.max(50, Math.min(2000, num));
              void this.plugin.saveSettings();
            }));
      })
      .addSetting((setting) => {
        setting
          .setName(t('SETTING_SHOW_JUMP_ORIGINAL'))
          .setDesc(t('SETTING_SHOW_JUMP_ORIGINAL_DESC'))
          .addToggle((toggle) => toggle
            .setValue(this.plugin.settings.showJumpToOriginal)
            .onChange((value) => {
              this.plugin.settings.showJumpToOriginal = value;
              void this.plugin.saveSettings();
            }));
      })
      .addSetting((setting) => {
        setting
          .setName(t('SETTING_SHOW_EMBED_BOTTOM'))
          .setDesc(t('SETTING_SHOW_EMBED_BOTTOM_DESC'))
          .addToggle((toggle) => toggle
            .setValue(this.plugin.settings.showEmbedBottomContent)
            .onChange((value) => {
              this.plugin.settings.showEmbedBottomContent = value;
              void this.plugin.saveSettings();
            }));
      });
  }

  hide(): void {
    this.closeFolderSuggests();
    super.hide();
  }

  private closeFolderSuggests(): void {
    for (const suggest of this.folderSuggests) {
      suggest.close();
    }
    this.folderSuggests = [];
  }
}

class FolderSuggest extends AbstractInputSuggest<string> {
  constructor(
    app: App,
    textInputEl: HTMLInputElement,
    private readonly onSelectFolder: (folderPath: string) => Promise<void>,
  ) {
    super(app, textInputEl);
  }

  protected getSuggestions(query: string): string[] {
    const allFolders = this.getFolderPaths();
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || normalizedQuery === '/') return allFolders;

    const matches = allFolders.filter((folderPath) => (
      folderPath.toLowerCase().includes(normalizedQuery)
    ));

    return matches.length > 0 ? matches : allFolders;
  }

  renderSuggestion(folderPath: string, el: HTMLElement): void {
    el.setText(folderPath);
  }

  selectSuggestion(folderPath: string): void {
    this.setValue(folderPath);
    void this.onSelectFolder(folderPath);
    this.close();
  }

  private getFolderPaths(): string[] {
    const folders = this.app.vault.getAllLoadedFiles()
      .filter((file): file is TFolder => file instanceof TFolder)
      .map((folder) => folder.path)
      .filter((path) => path !== '/')
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return ['/', ...folders];
  }
}
