# UI 组件完整代码模式

## 快速决策表

| 我要开发... | 直接跳到 | 关键约束 |
|------------|---------|---------|
| 命令 | §1 命令 | `addCommand()` 四种模式：`callback` / `checkCallback` / `editorCallback` / `editorCheckCallback` |
| 右键菜单 | §2 右键菜单 | `Menu` + `registerEvent` |
| 弹窗/对话框 | §3 模态框 | `Modal` / `SuggestModal` / `FuzzySuggestModal` |
| **设置面板** | **§4 设置面板 → §11.6 完整模板** | **必须用 `SettingGroup`，禁止传统 `Setting` 平铺** |
| 功能区图标 | §5 功能区图标 | `addRibbonIcon()` |
| 状态栏 | §6 状态栏 | `addStatusBarItem()`，移动端不可用 |
| 侧边栏/面板 | §7 自定义视图 | `ItemView` + `registerView()` |
| CSS 样式 | §11 Obsidian 官方设计语言 | **必须用 CSS 变量，禁止硬编码颜色** |

> ⚠️ **设置面板开发前必读**：§4 的传统 `Setting` 写法仅用于极简场景（1-2 个设置项）。新项目**必须**使用 `SettingGroup`（见 §11.6 完整模板），否则无法通过代码审查。

## 1. 命令（Commands）

### 简单命令

```typescript
this.addCommand({
  id: 'simple-command',
  name: 'Simple Command',
  callback: () => {
    new Notice('Command executed!');
  },
});
```

### 编辑器命令

```typescript
this.addCommand({
  id: 'editor-command',
  name: 'Transform Selection',
  editorCallback: (editor: Editor, ctx: MarkdownView) => {
    const selection = editor.getSelection();
    editor.replaceSelection(selection.toUpperCase());
  },
});
```

### 条件命令

```typescript
this.addCommand({
  id: 'conditional-command',
  name: 'Only When Markdown Active',
  checkCallback: (checking: boolean) => {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) {
      if (!checking) {
        // 实际执行操作
        const editor = view.editor;
        editor.replaceSelection('Inserted text');
      }
      return true; // 命令可用
    }
    return false; // 命令不可用
  },
});
```

### 带热键的命令

> ⚠️ **不推荐为命令设置默认快捷键**，可能导致插件间冲突或覆盖用户已配置的快捷键。让用户自行在设置中配置。

```typescript
this.addCommand({
  id: 'hotkey-command',
  name: 'Command with hotkey',
  hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'a' }],
  callback: () => { /* ... */ },
});
// Mod = Ctrl (Windows) / Cmd (macOS)
```

## 2. 右键菜单（Context Menus）

### 自定义菜单

```typescript
const menu = new Menu();
menu.addItem((item) =>
  item
    .setTitle('Copy')
    .setIcon('documents')
    .onClick(() => {
      new Notice('Copied');
    })
);
menu.addSeparator();
menu.addItem((item) =>
  item
    .setTitle('Delete')
    .setIcon('trash')
    .onClick(() => {
      new Notice('Deleted');
    })
);
menu.showAtMouseEvent(event);
```

### 文件菜单扩展

```typescript
this.registerEvent(
  this.app.workspace.on('file-menu', (menu, file) => {
    menu.addItem((item) => {
      item
        .setTitle('Custom action')
        .setIcon('star')
        .onClick(async () => {
          new Notice(`Action on: ${file.path}`);
        });
    });
  })
);
```

### 编辑器右键菜单扩展

```typescript
this.registerEvent(
  this.app.workspace.on('editor-menu', (menu, editor, info) => {
    menu.addItem((item) => {
      item
        .setTitle('Selection info')
        .setIcon('info')
        .onClick(() => {
          new Notice(`Selected: ${editor.getSelection()}`);
        });
    });
  })
);
```

## 3. 模态框（Modals）

### 基础模态框

```typescript
import { App, Modal } from 'obsidian';

class AlertModal extends Modal {
  message: string;

  constructor(app: App, message: string) {
    super(app);
    this.message = message;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Alert' });
    contentEl.createEl('p', { text: this.message });
  }

  onClose() {
    this.contentEl.empty();
  }
}

// 使用
new AlertModal(this.app, 'Hello World!').open();
```

### 输入模态框（带回调）

```typescript
import { App, Modal, Setting } from 'obsidian';

class InputModal extends Modal {
  result: string = '';
  onSubmit: (result: string) => void;

  constructor(app: App, onSubmit: (result: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Enter value' });

    new Setting(contentEl)
      .setName('Value')
      .addText((text) =>
        text.onChange((value) => {
          this.result = value;
        })
      );

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText('Submit')
          .setCta()
          .onClick(() => {
            this.close();
            this.onSubmit(this.result);
          })
      );
  }

  onClose() {
    this.contentEl.empty();
  }
}

// 使用
new InputModal(this.app, (result) => {
  new Notice(`You entered: ${result}`);
}).open();
```

### 建议列表模态框

```typescript
import { App, SuggestModal } from 'obsidian';

interface BookSuggestion {
  title: string;
  author: string;
}

const ALL_BOOKS: BookSuggestion[] = [
  { title: 'Clean Code', author: 'Robert C. Martin' },
  { title: 'Design Patterns', author: 'Gang of Four' },
];

class BookSuggestModal extends SuggestModal<BookSuggestion> {
  getSuggestions(query: string): BookSuggestion[] {
    return ALL_BOOKS.filter((book) =>
      book.title.toLowerCase().includes(query.toLowerCase())
    );
  }

  renderSuggestion(book: BookSuggestion, el: HTMLElement) {
    el.createEl('div', { text: book.title });
    el.createEl('small', { text: book.author });
  }

  onChooseSuggestion(book: BookSuggestion, evt: MouseEvent | KeyboardEvent) {
    new Notice(`Selected: ${book.title}`);
  }
}
```

### 模糊搜索模态框

```typescript
import { App, FuzzySuggestModal } from 'obsidian';

class FileSuggestModal extends FuzzySuggestModal<TFile> {
  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  getItemText(file: TFile): string {
    return file.basename;
  }

  onChooseItem(file: TFile, evt: MouseEvent | KeyboardEvent) {
    new Notice(`Selected: ${file.path}`);
  }
}
```

## 4. 设置面板（Settings）

> **⚠️ 核心规则：必须使用 `SettingGroup`。** 传统 `new Setting()` 平铺方式仅适用于极简场景（1-2 个设置项且无需分组）。任何需要分组的设置页都必须使用 `SettingGroup`。完整模板见 [§11.6](#116-完整设置面板模板含导航--跨平台适配)。

### 设置面板设计决策树

```
设置项数量？
├─ ≤ 2 项且无需分组
│   └─ 直接用 Setting（极简场景，见下方"传统方式"）
└─ > 2 项或需要分组
    ├─ 需要 Tab 导航切换不同类别？
    │   ├─ 是：手动构建导航 + SettingGroup 分组（见 §11.6 完整模板）
    │   └─ 否：直接用 SettingGroup 分组（见下方"推荐方式"）
    └─ 需要条件显示/隐藏某些设置？
        └─ 使用 toggleClass + CSS 控制（见 §11.6 模板中的 conditional 模式）
```

**关键生命周期**：
- `display()`：构建设置 UI，在面板打开时调用
- `hide()`：清理资源（如框架 unmount），在面板关闭时调用

### 推荐方式：SettingGroup（必须使用）

```typescript
import { App, Plugin, PluginSettingTab, Setting, SettingGroup } from 'obsidian';

interface MyPluginSettings {
  apiKey: string;
  enableFeature: boolean;
  dateFormat: string;
  fontSize: number;
  theme: string;
}

const DEFAULT_SETTINGS: Partial<MyPluginSettings> = {
  apiKey: '',
  enableFeature: true,
  dateFormat: 'YYYY-MM-DD',
  fontSize: 14,
  theme: 'default',
};

// ⚠️ Object.assign() is a shallow copy. If your settings contain nested objects,
// you must deep-copy each nested property recursively. Otherwise, mutations to
// nested properties in one copy will affect all copies.

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new MySettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class MySettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('my-settings-root');  /* 与配套 CSS 选择器对应 */

    new SettingGroup(containerEl)
      .setHeading('General')
      .addSetting((setting) =>
        setting
          .setName('API Key')
          .setDesc('Enter your API key')
          .addText((text) =>
            text
              .setPlaceholder('Enter key...')
              .setValue(this.plugin.settings.apiKey)
              .onChange(async (value) => {
                this.plugin.settings.apiKey = value;
                await this.plugin.saveSettings();
              })
          )
      )
      .addSetting((setting) =>
        setting
          .setName('Enable feature')
          .setDesc('Toggle this feature on or off')
          .addToggle((toggle) =>
            toggle
              .setValue(this.plugin.settings.enableFeature)
              .onChange(async (value) => {
                this.plugin.settings.enableFeature = value;
                await this.plugin.saveSettings();
              })
          )
      );

    new SettingGroup(containerEl)
      .setHeading('Appearance')
      .addSetting((setting) =>
        setting
          .setName('Theme')
          .setDesc('Select a theme')
          .addDropdown((dropdown) =>
            dropdown
              .addOption('default', 'Default')
              .addOption('dark', 'Dark')
              .addOption('light', 'Light')
              .setValue(this.plugin.settings.theme)
              .onChange(async (value) => {
                this.plugin.settings.theme = value;
                await this.plugin.saveSettings();
              })
          )
      )
      .addSetting((setting) =>
        setting
          .setName('Font size')
          .setDesc('Adjust the font size')
          .addSlider((slider) =>
            slider
              .setLimits(10, 30, 1)
              .setValue(this.plugin.settings.fontSize)
              .setDynamicTooltip()
              .onChange(async (value) => {
                this.plugin.settings.fontSize = value;
                await this.plugin.saveSettings();
              })
          )
      );

    new SettingGroup(containerEl)
      .setHeading('Advanced')
      .addSetting((setting) =>
        setting
          .setName('Reset settings')
          .setDesc('Restore default settings')
          .addButton((btn) =>
            btn
              .setButtonText('Reset')
              .setWarning()
              .onClick(async () => {
                this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS);
                await this.plugin.saveSettings();
                this.display();
              })
          )
      );
  }
}
```

### SettingGroup 支持的控件类型速查

| 控件 | 方法 | 示例 |
|------|------|------|
| 文本输入 | `.addText()` | 见上方 API Key |
| 开关 | `.addToggle()` | 见上方 Enable feature |
| 下拉选择 | `.addDropdown()` | 见上方 Theme |
| 滑块 | `.addSlider()` | 见上方 Font size |
| 多行文本 | `.addTextArea()` | `.addTextArea((text) => text.setPlaceholder('...').onChange(...))` |
| 按钮 | `.addButton()` | 见上方 Reset settings |
| 颜色选择 | `.addColorPicker()` | `.addColorPicker((cp) => cp.setValue('#fff').onChange(...))` |
| 搜索 | `.addSearch()` | `.addSearch((search) => search.setPlaceholder('...').onChange(...))` |

### 传统方式：直接使用 Setting（仅限极简场景）

> ⚠️ **仅在设置项 ≤ 2 且无需分组时使用。** 其他情况必须使用 `SettingGroup`。

```typescript
class SimpleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;
  constructor(app: App, plugin: MyPlugin) { super(app, plugin); this.plugin = plugin; }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName('Setting name').setDesc('Description')
      .addText((text) => text.setValue(this.plugin.settings.apiKey)
        .onChange(async (v) => { this.plugin.settings.apiKey = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl)
      .setName('Toggle').addToggle((toggle) => toggle.setValue(this.plugin.settings.enableFeature)
        .onChange(async (v) => { this.plugin.settings.enableFeature = v; await this.plugin.saveSettings(); }));
  }
}
```

### SettingGroup vs 传统 Setting 对比

| 特性 | SettingGroup | 传统 Setting 平铺 |
|------|-------------|-----------------|
| 分组卡片 | ✅ 自动 | ❌ 需手动创建 DOM |
| 标题样式 | ✅ 原生 `.setting-item-heading` | ❌ 需自定义 CSS |
| 分割线 | ✅ 自动 | ❌ 需手动添加 |
| 主题兼容 | ✅ 完全原生 | ⚠️ 需自行处理 CSS 变量 |
| 代码量 | 少（链式调用） | 多（每个 Setting 独立） |
| 推荐度 | ⭐⭐⭐⭐⭐ | ⭐⭐（仅极简场景） |

## 5. 功能区图标（Ribbon Actions）

```typescript
// 添加功能区按钮
const ribbonIconEl = this.addRibbonIcon('dice', 'My Plugin Tooltip', (evt: MouseEvent) => {
  new Notice('Ribbon icon clicked!');
});
ribbonIconEl.addClass('my-plugin-ribbon-class');
```

## 6. 状态栏（Status Bar）

```typescript
// 添加状态栏项
const statusBarItem = this.addStatusBarItem();
statusBarItem.setText('Ready');

// 动态更新
this.registerEvent(
  this.app.workspace.on('active-leaf-change', () => {
    const file = this.app.workspace.getActiveFile();
    statusBarItem.setText(file ? file.basename : 'No file');
  })
);

// 注意：移动端不支持状态栏
```

## 7. 自定义视图（Views）

### 完整视图模式

```typescript
import { ItemView, WorkspaceLeaf, Plugin } from 'obsidian';

export const VIEW_TYPE_EXAMPLE = 'example-view';

export class ExampleView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_EXAMPLE;
  }

  getDisplayText(): string {
    return 'Example View';
  }

  getIcon(): string {
    return 'list';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl('h4', { text: 'Example View' });

    const list = container.createEl('ul');
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files.slice(0, 10)) {
      list.createEl('li', { text: file.basename });
    }
  }

  async onClose(): Promise<void> {
    // 清理 DOM 和事件
  }
}

// 在 Plugin 中注册和使用
export default class MyPlugin extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE_EXAMPLE, (leaf) => new ExampleView(leaf));

    this.addRibbonIcon('list', 'Open Example View', () => {
      this.activateView();
    });

    this.addCommand({
      id: 'open-example-view',
      name: 'Open Example View',
      callback: () => this.activateView(),
    });
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_EXAMPLE, active: true });
    }

    workspace.revealLeaf(leaf);
  }
}
```

## 8. HTML 元素创建

```typescript
// 创建元素
const div = containerEl.createEl('div', {
  text: 'Hello',
  cls: 'my-class',
  attr: { id: 'my-id', 'data-value': '42' },
});

// 嵌套创建
const card = containerEl.createEl('div', { cls: 'card' });
card.createEl('h3', { text: 'Title', cls: 'card-title' });
card.createEl('p', { text: 'Description', cls: 'card-desc' });
card.createEl('a', { text: 'Link', href: 'https://example.com' });

// 动态类名
element.toggleClass('active', isActive);
element.addClass('highlight');
element.removeClass('highlight');
```

## 9. 图标系统

```typescript
import { addIcon, setIcon } from 'obsidian';

// 注册自定义 SVG 图标（viewBox 必须是 0 0 100 100）
addIcon('my-icon', `<circle cx="50" cy="50" r="40" fill="currentColor" />`);

// 在功能区使用自定义图标
this.addRibbonIcon('my-icon', 'My Custom Icon', () => {});

// 设置已有元素的图标
const el = document.createElement('span');
setIcon(el, 'star');

// Obsidian 内置图标来自 Lucide: https://lucide.dev
// 常用图标名: star, trash, settings, search, file-text, folder, link, edit, eye, copy
```

## 10. 样式文件基础规范（styles.css）

> 设置页完整设计规范（配色、间距、属性实测值）见 [§11](#11-obsidian-官方设计语言规范)

```css
/* 使用 Obsidian CSS 变量确保主题兼容 */

/* 页面级容器 — 用 --background-primary */
.my-plugin-container {
  padding: 10px;
  background-color: var(--background-primary);
  color: var(--text-normal);
}

/* 卡片/面板区域 — 用 --background-primary-alt（与原生 SettingGroup 一致） */
.my-plugin-card {
  padding: var(--size-4-5);
  background-color: var(--background-primary-alt);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-l);
  overflow: hidden;
}

/* 卡片内部 item — 重置 Obsidian 默认样式 */
.my-plugin-card .setting-item {
  margin: 0 !important;
  padding: 16px 0;
  background: transparent !important;
  border-top: 1px solid var(--background-modifier-border);
  box-shadow: none !important;
}

.my-plugin-card .setting-item:first-child {
  border-top: 0;
}

.my-plugin-container h3 {
  color: var(--text-accent);
  margin-bottom: 8px;
}

.my-plugin-container .item {
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
}

.my-plugin-container .item:hover {
  background-color: var(--background-modifier-hover);
}

/* 激活态必须用中性灰，不用强调色！ */
.my-plugin-container .item.active {
  background-color: var(--background-modifier-hover);  /* ✅ 中性灰，不是蓝色 */
  font-weight: 600;
}

/* 常用 Obsidian CSS 变量（速查版，完整列表见 [§11.9 G](#119-g-关键变量速查)）:
  --background-primary            主背景
  --background-primary-alt        卡片/面板区域背景 ⭐ 核心变量（桌面/移动暗色；移动亮色用 --primary），见 §11.2
  --background-secondary          侧边栏背景
  --background-modifier-border    边框/分割线
  --background-modifier-hover     悬停/激活态背景（中性灰）
  --text-normal / --text-muted / --text-accent  文本色
  --interactive-accent            交互强调色
*/
```

## 11. Obsidian 官方设计语言规范

> 来源：[Obsidian 官方开发者文档](https://raistlind.github.io/obsidian-dev-docs-zh/zh/home.html) | 核心原则：**严格遵循 Obsidian CSS 变量体系，不使用硬编码颜色值。**

### 11.1 CSS 变量选择器规范（官方规定）

| 选择器 | 用途 | 使用频率 |
|--------|------|----------|
| `body` | 全局通用样式（明暗模式共用的） | ✅ **首选，最常用** |
| `.theme-light` | 仅亮色模式下的差异化样式 | 按需使用 |
| `.theme-dark` | 仅暗色模式下的差异化样式 | 按需使用 |
| `:root` | 插件级自定义变量 | ⚠️ 谨慎使用 |

```css
/* ✅ 正确：全局通用样式用 body */
body {
  --my-plugin-card-radius: 12px;
}

/* ✅ 正确：明暗模式需要不同值时用 .theme-light / .theme-dark */
/* 仅在必须覆盖 Obsidian 原生变量时使用（如自定义主题扩展） */
.theme-dark body {
  --my-custom-accent: var(--interactive-accent);
}
```

### 11.2 ⚠️ 核心发现：卡片背景变量（桌面端统一，移动端分亮暗）

**Obsidian 原生 `SettingGroup` 组件内部使用的卡片背景变量是 `--setting-items-background`，默认值为 `--background-primary-alt`。但在 Modal 弹窗内，Obsidian 核心有更高特异性的规则可能将其覆盖为 `--background-primary`，导致主设置页与弹窗行为不一致。**

#### 为什么移动端要分？

Obsidian 默认主题的 CSS 变量值：

| 变量 | 亮色模式 | 暗色模式 |
|------|---------|---------|
| `--background-primary` | **#ffffff**（纯白） | #1a1a1a |
| `--background-primary-alt` | ~#fafafa（极近白） | ~#222 |
| `--background-secondary` | **#f5f5f5**（浅灰） | #2d2d2d |

在**移动端亮色**下，页面底色是 `secondary`(#f5f5f5)，如果卡片用 `primary-alt`(~#fafafa)，两者差值仅 ~5 个灰阶，肉眼几乎无法区分。解决方案是在容器上通过变量覆盖为最亮的 `--primary`(#ffffff)。而在**移动端暗色**下，`primary-alt`(~#222) 与 `secondary`(#2d2d2d) 有足够对比度，保持 `--primary-alt` 即可。

> **⚠️ 场景差异**：Modal 弹窗（`.modal-container`）与 PluginSettingTab 主设置页（`.vertical-tab-content`）的父容器不同，直接覆盖 `.setting-items` 的 `background-color` 在 Modal 内不可靠。**必须使用 §11.3 的变量法。**

#### 完整规则表

| 平台 | 模式 | 页面底色 (L0) | 卡片背景 (L1) | 层次方向 |
|------|------|--------------|--------------|---------|
| **桌面端** | 亮+暗 | `--background-primary` | **`--background-primary-alt`** | 浅 → 中 / 深 → 中深 |
| **移动端** | **亮色** | `--background-secondary` (#f5f5f5) | **`--background-primary`** (#ffffff) | 灰 → 白 ✅ |
| **移动端** | **暗色** | `--background-secondary` (深) | **`--background-primary-alt`** (中浅) | 深 → 中 ✅ |

> **关键结论**：
> - **桌面端**：统一用 `--background-primary-alt`
> - **移动端亮色**：通过 `--setting-items-background` 变量设为 `--background-primary`
> - **移动端暗色**：通过 `--setting-items-background` 变量设为 `--background-primary-alt`
>
> 实测验证来源：[§11.9 B](#119-b-分组卡片) — Obsidian 核心 `app.css` v1.8.x 实测 + 移动端截图对比

### 11.3 设置面板配色标准写法

> **卡片背景规则**：桌面端用 `--background-primary-alt`；移动端**亮色**用 `--background-primary`，移动端**暗色**用 `--background-primary-alt`。完整规则见 [§11.2](#112-核心发现卡片背景变量桌面端统一移动端分亮暗)。

> **⚠️ P0 关键约束：移动端亮暗色必须通过 CSS 变量 `--setting-items-background` 在容器级别声明，禁止直接覆盖 `.setting-items` 的 `background-color`。**
>
> 原因：Obsidian 的 Modal 容器内部有核心样式直接给 `.setting-items` 设背景色（特异性 ≥ 0-2-0）。如果用 `.theme-light .setting-items { background-color: ... }` 覆盖，在 Modal 内会被 Obsidian 核心规则覆盖导致失效。而 PluginSettingTab（主设置页）内可能生效也可能不生效，造成两者行为不一致。
>
> 正确做法：在容器上声明 `--setting-items-background` 变量，SettingGroup 内部读取该变量时无论核心规则优先级多高都会使用我们设定的值。这是唯一可靠的跨场景覆盖方式。

```css
/* ══════════════════════════════════════ */
/* SettingGroup 移动端亮暗色覆盖          */
/* ══════════════════════════════════════ */

/* 桌面端 / 默认：--background-primary-alt（由 SettingGroup 自动处理） */
/* 无需额外 CSS，SettingGroup 默认就用 --setting-items-background = --primary-alt */

/* 移动端：通过容器级变量覆盖 */
@media (max-width: 768px) {
  /* 主设置页（PluginSettingTab） */
  .my-plugin-settings-root {
    --setting-items-background: var(--background-primary);   /* 卡片纯白 */
  }

  /* 弹窗（Modal）— 变量法同样有效，不受核心规则影响 */
  .my-plugin-modal {
    --setting-items-background: var(--background-primary);   /* 卡片纯白 */
  }

  /* 暗色模式覆盖 */
  .theme-dark .my-plugin-settings-root,
  .theme-dark .my-plugin-modal {
    --setting-items-background: var(--background-primary-alt);
  }
}
```

#### 层次对比原理

```
【桌面端】                          【移动端亮色】
L0: --background-primary            L0: --background-secondary (灰)
 L1: --background-primary-alt        L1: --background-primary (白) ← 变量覆盖后
     ↑ 比 L0 稍深                       ↑ 比 L0 亮，对比度充足
（完整表格见 §11.2）

【移动端暗色】
L0: --background-secondary (深)
 L1: --background-primary-alt (中浅) ← 变量覆盖后
     ↑ 比 L0 稍浅
```

### 11.4 交互状态配色（导航按钮、选中态）

**规则：选中/激活态使用中性灰色变量，不用强调色变量。**

| 状态 | 推荐变量 | 颜色特征 | 禁止使用 |
|------|---------|---------|---------|
| 默认态 | `transparent` 或无背景 | 无背景 | — |
| **激活/选中态** | `--background-modifier-hover` | **中性灰** | ❌ `--interactive-accent-*`（蓝色！） |
| Hover 态 | `--background-modifier-hover` | 中性灰微高亮 | ❌ `--interactive-accent` |

```css
/* ✅ 圆角在基础态统一设置，所有状态共享，避免点击闪烁 */
.nav-button {
  border-radius: var(--radius-m); /* 桌面端 8px */
}

.nav-button.is-active {
  background: var(--background-modifier-hover);
  /* border-radius 继承基础选择器，不要在此重复声明 */
  font-weight: 600;
}

@media (max-width: 768px) {
  .nav-button {
    border-radius: var(--touch-radius-xs); /* 移动端触控圆角 */
  }

  .nav-button.is-active {
    background: var(--background-modifier-hover);
  }
}

/* ❌ 用强调色变量会变成蓝色 */
.nav-button.is-active {
  background: var(--interactive-accent-hover);
}
```

> **⚠️ 关键约束**：
> 1. **`border-radius` 必须写在基础选择器上**，而非仅在 `.is-active` 中。点击瞬间存在时序窗口——`:active` 伪类触发但 JS 尚未添加 `.is-active` class，此时若基础态 `border-radius: 0`，会出现方形背景闪烁。正确做法是所有状态共享同一圆角值，仅背景色随状态切换。
> 2. **导航按钮必须添加 `setting-item-heading` class**，继承原生标题行样式（字体大小/字重/颜色/行高），不要自定义这些属性。示例：`createEl('button', { cls: 'setting-item-heading nav-button' })`

### 11.5 常见错误清单

```css
/* ═══════════════ 错误 1：硬编码白色 ═══════════════ */
.settings-group { background: #ffffff; }           /* ❌ 主题不兼容 */

/* ═══════════════ 错误 2：color-mix 混合作为卡片背景 ═══════════════ */
.settings-group {
  background: color-mix(in srgb, var(--background-secondary) 94%, white 6%);  /* ❌ */
}

/* ═══════════════ 错误 3：边框混入过多透明度 ═══════════════ */
.settings-group {
  border: 1px solid color-mix(in srgb, var(--background-modifier-border) 58%, transparent);  /* ❌ */
}

/* ═══════════════ 错误 4：激活态用强调色变量 ═══════════════ */
.nav-button.active { background: var(--interactive-accent-hover); }  /* ❌ 蓝色！ */

/* ═══════════════ 错误 5（最隐蔽）：移动端亮色未用 --background-primary ═══════════════ */
/* 正确写法见 [§11.2](#112-核心发现卡片背景变量桌面端统一移动端分亮暗) */
/* ❌ 错误：直接覆盖 .setting-items 的 background-color，Modal 内会被 Obsidian 核心规则覆盖 */
@media (max-width: 768px) {
  .theme-light .settings-group .setting-items {
    background: var(--background-primary);   /* Modal 内❌ 不生效 */
  }
}

/* ✅ 正确：通过容器级变量 --setting-items-background 控制（见 §11.3） */
.my-settings-root {
  /* 桌面端默认即可，SettingGroup 自动使用 --primary-alt */
}
@media (max-width: 768px) {
  .my-settings-root {
    --setting-items-background: var(--background-primary);   /* ✅ 主设置页 + 弹窗均可靠生效 */
  }
  .theme-dark .my-settings-root {
    --setting-items-background: var(--background-primary-alt);
  }
}

/* ═══════════════ 错误 6：导航按钮 border-radius 声明位置不当（闪烁 + 特异性覆盖） ═══════════════ */
/* 两个表现：
 *   A. 基础态 border-radius:0 → 点击瞬间 :active 触发但 .is-active 未添加时，方形背景闪烁
 *   B. .is-active 重复声明 border-radius → 特异性 (0,2,0) > 移动端媒体查询基础选择器 (0,1,0)，覆盖移动端圆角
 * 根因：border-radius 应只在基础选择器声明一次，所有状态共享 */

/* ❌ 错误 A：非激活态 border-radius:0 */
.nav-button:not(.is-active) {
  border-radius: 0;   /* 点击瞬间方形背景！ */
}

/* ❌ 错误 B：.is-active 重复声明 border-radius */
.nav-button.is-active {
  border-radius: var(--radius-m);   /* 移动端也被强制 8px，touch-radius-xs 被覆盖！ */
}

/* ✅ 正确：border-radius 只在基础选择器声明，.is-active 不重复声明 */
.nav-button {
  border-radius: var(--radius-m);   /* 桌面端 */
}
@media (max-width: 768px) {
  .nav-button { border-radius: var(--touch-radius-xs); }  /* 移动端 */
}
.nav-button.is-active {
  background: var(--background-modifier-hover);
  /* border-radius 继承基础选择器 */
}

/* ═══════════════ 错误 7：硬编码圆角值 ═══════════════ */
.card { border-radius: 12px; }           /* ❌ 主题切换时无法跟随 */
.nav-button { border-radius: 20px; }     /* ❌ */

/* ✅ 正确：使用 CSS 变量 */
.card { border-radius: var(--radius-l); }        /* 12px，跟随主题 */
.nav-button { border-radius: var(--radius-m); }  /* 8px，跟随主题 */

/* ═══════════════ 错误 8：硬编码间距值 ═══════════════ */
.container { gap: 6px; padding: 10px; }  /* ❌ 不跟随 Obsidian 间距体系 */
.item { margin: 28px 0; }                /* ❌ */

/* ✅ 正确：使用 --size-4-* 变量体系 */
.container { gap: var(--size-4-2); padding: var(--size-4-3); }  /* 8px, 12px */
.item { margin: var(--size-4-6) 0; }     /* 24px */
```

### 11.6 完整设置面板模板（含导航 + 跨平台适配）

> 以下模板展示带 Tab 导航的高级设置页。导航部分需要手动构建 DOM，但**每个 Tab 内的设置项仍应使用 `SettingGroup`**。

#### SettingGroup DOM 结构

`new SettingGroup(containerEl).setHeading("Title")` 渲染为：

```
.setting-group
├── .setting-item-heading   ← setHeading() 生成
└── .setting-items          ← addSetting() 的容器
    └── .setting-item       ← 每个 Setting 实例
```

> **用途**：需要查询/操作子元素时（如折叠、条件显示），使用上述类名。样式覆盖优先使用 `--setting-items-*` CSS 变量（见 §11.9 G），而非直接覆盖类样式。

```typescript
// settings.ts — 多 Tab 导航 + SettingGroup 分组卡片
import { PluginSettingTab, Setting, SettingGroup, setIcon } from 'obsidian';

interface SettingsSection {
  id: string;
  label: string;
  icon: string;
}

const SECTIONS: SettingsSection[] = [
  { id: 'homepage', label: 'Homepage', icon: 'home' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar-days' },
];

class MySettingTab extends PluginSettingTab {
  activeSection: string = SECTIONS[0].id;

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('my-settings-root');  /* 与配套 CSS 选择器对应 */

    // 导航栏（需手动构建，SettingGroup 不支持导航）
    const navEl = containerEl.createDiv({ cls: 'settings-nav' });
    SECTIONS.forEach((section) => {
      const btn = navEl.createEl('button', { cls: 'setting-item-heading settings-nav-btn' });
      btn.toggleClass('is-active', section.id === this.activeSection);
      setIcon(btn.createSpan({ cls: 'settings-nav-icon' }), section.icon);
      btn.createSpan({ text: section.label });
      btn.addEventListener('click', () => {
        this.activeSection = section.id;
        this.display();
      });
    });

  // 内容区 — 每个 Tab 使用 SettingGroup
    const contentEl = containerEl.createDiv({ cls: ['settings-section', this.activeSection] });
    if (this.activeSection === 'homepage') {
      new SettingGroup(contentEl)
        .setHeading('Enable Homepage')
        .addSetting((setting) =>
          setting
            .setName('Enable')
            .setDesc('Enable the homepage feature')
            .addToggle((t) => t.onChange(async (v) => {}))
        );
    }

    if (this.activeSection === 'calendar') {
      new SettingGroup(contentEl)
        .setHeading('Calendar')
        .addSetting((setting) =>
          setting
            .setName('Default view')
            .setDesc('Choose the default calendar view')
            .addDropdown((d) =>
              d.addOption('month', 'Month').addOption('week', 'Week').onChange(async (v) => {})
            )
        );
    }
  }
}
```

#### 配套移动端 CSS（必须配合使用）

> **⚠️ P0 约束**：移动端亮暗色必须通过 `--setting-items-background` 变量覆盖，见 [§11.3](#113-设置面板配色标准写法)。

```css
/* settings.css — 与上述 TS 模板配套 */

/* ── 导航栏（桌面端 + 移动端） ── */
.settings-nav {
  display: flex;
  flex-wrap: nowrap;                     /* 桌面端：不换行 */
  gap: var(--size-4-2) var(--size-4-4);
  margin-bottom: var(--size-4-5);
}
.settings-nav-btn {
  appearance: none;
  -webkit-appearance: none;
  display: inline-flex;
  align-items: center;
  gap: var(--size-4-2);
  border: 0 !important;
  border-bottom: none !important;
  border-radius: var(--radius-m);           /* 桌面端 8px */
  background: transparent;
  cursor: pointer;
  box-shadow: none;
  outline: none;
  transition: background-color 140ms ease, color 140ms ease;
}
.settings-nav-btn.is-active {
  background: var(--background-modifier-hover);
  color: var(--text-normal);
  /* border-radius 继承基础选择器，不重复声明 */
}
.settings-nav-btn:hover:not(.is-active) {
  background: var(--background-modifier-hover);
}
.settings-nav-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 移动端：卡片背景变量 + 导航按钮圆角 */
@media (max-width: 768px) {
  /* 主设置页容器 */
  .my-settings-root {
    --setting-items-background: var(--background-primary);
  }

  /* 弹窗容器 */
  .my-settings-modal {
    --setting-items-background: var(--background-primary);
  }

  /* 导航栏：等宽分布，触控圆角 */
  .settings-nav {
    flex-wrap: nowrap;
    justify-content: space-between;
  }
  .settings-nav-btn {
    flex: 1;
    border-radius: var(--touch-radius-xs);
  }
  .settings-nav-icon {
    display: none;   /* 移动端隐藏图标以节省空间 */
  }

  /* 暗色模式 */
  .theme-dark .my-settings-root,
  .theme-dark .my-settings-modal {
    --setting-items-background: var(--background-primary-alt);
  }
}
```

### 11.6b 弹窗扩展模式

> 以下模式仅适用于 **Modal 弹窗**（`extends Modal`），不适用于 PluginSettingTab 主设置页。

#### 模式 A：Footer 底部操作栏

弹窗底部放置"取消 / 确认"操作按钮的标准写法。**使用公共 CSS class，每个弹窗零额外样式代码。**

```typescript
// TS — 在 onOpen() 末尾
const footerEl = contentEl.createDiv({ cls: 'elements-modal-footer' });

const cancelBtn = footerEl.createEl('button', {
  text: '取消',
  cls: 'elements-modal-footer__btn elements-modal-footer__btn--cancel',
});
cancelBtn.addEventListener('click', () => this.close());

const confirmBtn = footerEl.createEl('button', {
  text: '确认',
  cls: 'elements-modal-footer__btn elements-modal-footer__btn--confirm',
});
confirmBtn.addEventListener('click', () => { /* 提交逻辑 */ this.close(); });
```

```css
/* CSS — 公共样式（一次定义，所有弹窗复用） */
.elements-modal-footer {
  display: flex;
  justify-content: center;
  gap: var(--size-4-3);
  padding: var(--size-4-4) 0;
  margin-top: var(--size-4-5);
  border-top: 1px solid var(--background-modifier-border);   /* 分割线 */
}
.elements-modal-footer__btn {
  font-family: inherit;
  font-size: var(--font-ui-small);
  font-weight: var(--input-font-weight);
  color: var(--text-normal);
  background-color: var(--interactive-normal);
  border-radius: var(--radius-m);
  corner-shape: var(--button-corner-shape);
  height: var(--input-height);
  flex: 0 0 25%;              /* 桌面端各占 25% */
  box-shadow: var(--input-shadow);
}
.elements-modal-footer__btn--confirm {
  background-color: var(--interactive-accent);
  color: var(--text-on-accent);    /* 蓝色确认按钮 */
}

/* 移动端：按钮全宽 */
@media (max-width: 768px) {
  .elements-modal-footer__btn {
    flex: 0 1 100%;
    border-radius: var(--touch-radius-xs);
  }
}
```

**DOM 结构**：
```
div.my-modal (contentEl)
├── div.setting-group ...        ← SettingGroup 卡片组
└── div.elements-modal-footer     ← 底部操作栏
    ├── button.--cancel          ← 取消
    └── button.--confirm         ← 确认（蓝色强调）
```

**要点**：
- 使用 BEM 命名：`elements-modal-footer` + `__btn` + `--cancel/--confirm`
- 确认按钮用 `--interactive-accent` 强调色
- 移动端自动切换为全宽布局

---

#### 模式 B：Tab 子导航（多面板切换）

当弹窗内容较多时，用 Tab 切换分为多个子面板。

```typescript
// TS — 在 onOpen() 中 SettingGroup 之前
const navEl = contentEl.createDiv({ cls: 'my-modal-nav' });
const tabs = [
  { label: '基础设置', id: 'basic' },
  { label: '高级设置', id: 'advanced' },
];
tabs.forEach((tab, i) => {
  const btn = navEl.createEl('button', {
    cls: 'setting-item-heading my-modal-nav-btn',   /* 继承原生标题样式 */
    text: tab.label,
  });
  btn.toggleClass('is-active', i === this.activeTab);  /* ⚠️ is-active 是 Tab 状态，不是设备状态 */
  btn.addEventListener('click', () => {
    this.activeTab = i;
    this.render();                                     /* 全量重绘内容区 */
  });
});

const panelContent = contentEl.createDiv({ cls: 'my-modal-content' });
if (this.activeTab === 0) {
  this.renderBasicPanel(panelContent);                  /* 渲染基础设置 SettingGroup */
} else {
  this.renderAdvancedPanel(panelContent);               /* 渲染高级设置 SettingGroup */
}
```

```css
/* CSS — Tab 导航栏 */
.my-modal-nav {
  display: flex;
  gap: var(--size-4-2);
  margin-bottom: var(--size-4-5);
}
.my-modal-nav-btn {
  appearance: none;
  -webkit-appearance: none;
  display: inline-flex;
  align-items: center;
  border: 0 !important;
  border-bottom: none !important;
  border-radius: var(--radius-m);
  background: transparent;
  cursor: pointer;
  box-shadow: none;
  outline: none;
  transition: background-color 140ms ease, color 140ms ease;
}
.my-modal-nav-btn.is-active {
  background-color: var(--background-modifier-hover);
  color: var(--text-normal);
  box-shadow: none;
}
.my-modal-nav-btn:hover:not(.is-active) {
  background-color: var(--background-modifier-hover);
}

/* 移动端：Tab 按钮圆角统一为触控圆角 */
@media (max-width: 768px) {
  .my-modal-nav-btn {
    border-radius: var(--touch-radius-xs);
  }
}

/* 内容区：由 render() 全量重建控制显隐，无需 CSS display:none */
.my-modal-content {
  /* 每次 Tab 切换时清空 → 重建 DOM，不需要手动管理显隐 */
}
```

**DOM 结构**：
```
div.my-modal (contentEl)
├── nav.my-modal-nav                ← Tab 栏
│   ├── button.is-active "基础设置"
│   └── button "高级设置"
└── div.my-modal-content            ← 内容区（render 时重建）
    └── setting-group ...           ← 当前 Tab 的 SettingGroup
```

**要点**：
- Tab 按钮 class 必须包含 `setting-item-heading` 以继承原生标题样式
- `.is-active` 表示 **Tab 面板状态**（不是设备状态），与 `is-mobile` 无关
- 点击 Tab 后调用 `this.render()` **全量重绘**内容区（清空 → 重建 DOM）
- 内容区在每次 render 时重新创建，不需要手动管理显隐

---

#### 模式 C：Group 外独立 Setting（操作入口行）

在 SettingGroup 卡片组之外放置操作按钮（如"新增项"），用于视觉上区分"配置项"和"操作入口"。

```typescript
// TS — 放在所有 SettingGroup 之后
new Setting(contentEl)
  .setDesc('添加新项')
  .addButton(btn =>
    btn.setButtonText('+').setCta().onClick(async () => { /* 新增逻辑 */ })
  );
```

**视觉效果**：无卡片背景，浮动于页面上方。
**适用场景**：操作按钮 / 分隔区域。

> **注意**：Group 外的 `new Setting()` 不被 `.setting-items` 包裹，因此**不会获得卡片背景/圆角/边框**。如果需要卡片外观但不需要标题，请使用无 `setHeading()` 的 `SettingGroup`（见 §11.6）。

---

### 11.7 配色速查卡

> **卡片背景规则**：桌面端用 `--background-primary-alt`；移动端**亮色**用 `--background-primary`，移动端**暗色**用 `--background-primary-alt`。完整规则见 [§11.2](#112-核心发现卡片背景变量桌面端统一移动端分亮暗)。

开发时随时参考此表：

| 我想要... | 桌面端用 | 移动端用 | 绝不用... |
|-----------|---------|---------|----------|
| 卡片背景（核心！） | 桌面: `--primary-alt`（SettingGroup 自动处理） / 移动亮: 容器设 `--setting-items-background: --primary`（见 §11.3） / 移动暗: `--setting-items-background: --primary-alt` | 见 §11.2 + §11.3 | 直接覆盖 `.setting-items` 的 `background-color`（Modal 内失效）/ `--secondary` / 移动端不区分亮暗 |
| 按钮/Tab 激活态 | `--background-modifier-hover` | 同左 | `--interactive-accent-*` |
| 边框/分割线 | `--background-modifier-border` | 同左 | `color-mix(... transparent)` |
| 输入框背景 | `--background-modifier-form-field` | 同左 | `--background-primary/secondary` |
| 文字正常 | `--text-normal` | 同左 | `#000`, `black` |
| 强调文字（链接等） | `--text-accent` | 同左 | `--interactive-accent`（那是背景色） |

### 11.8 设置页间距规范

> **完整属性数据已整合至 [§11.9](#119-设置页完整属性规范obsidian-app-css-v18x-全量提取)。本节仅保留速查要点。**

#### 核心原则

间距使用 `--size-4-*` 变量体系，不硬编码像素值。

| 变量 | 值 | 用途 |
|------|-----|------|
| `--size-4-4` | 16px | item padding、heading margin-bottom |
| `--size-4-5` | 20px | 分组容器 padding |
| `--size-4-6` | **24px** | **分组间距**（group + group margin-top） |

#### 关键规则

```css
/* ✅ 使用官方变量 */
.subgroup-title { margin-top: var(--size-4-6); margin-bottom: var(--size-4-4); }
.group + .group { margin-top: var(--size-4-6); }  /* 卡片间距 24px */

/* ❌ 硬编码 */
.subgroup-title { margin-top: 28px; }
```

> 完整的容器层/卡片层/item 层/标题层所有属性值 → 见 [§11.9 A-D](#119-a-容器层)

### 11.9 设置页完整属性规范（Obsidian app.css v1.8.x 全量提取）

> **重要**：当你的自定义 CSS 选择器特异性 ≥ `0-1-1` 时，你必须显式声明以下所有属性。
> 否则 Obsidian 核心规则可能覆盖你的遗漏项。

#### A. 容器层

| 选择器 | 特异性 | 属性 | 官方值 | 说明 |
|--------|-------|------|--------|------|
| `.vertical-tab-content` | 0-1-1 | `background-color` | `var(--background-primary)` | 设置页背景 |
| `.vertical-tab-content` | 0-1-1 | `padding-inline-start/end` | `var(--size-4-12)` = 48px | 左右内边距 |
| `.vertical-tab-content` | 0-1-1 | `padding-top` | `var(--size-4-8)` = 32px | 顶部间距 |
| `.vertical-tab-content` | 0-1-1 | `padding-bottom` | `var(--size-4-16)` = 64px | 底部间距 |
| `.vertical-tab-content` | 0-1-1 | `overflow-y` | `auto` | 可滚动 |
| `.vertical-tab-content-container` | 0-1-1 | `overflow` | `hidden` | 溢出隐藏 |
| `.vertical-tab-content-container` | 0-1-1 | `flex-grow` | `1` | 填满剩余空间 |

#### B. 分组卡片

| 选择器 | 特异性 | 属性 | 官方值 |
|--------|-------|------|--------|
| `.setting-group` | 0-1-0 | `display` | `flex; flex-direction: column; gap: var(--size-4-2)` |
| `.setting-group + .setting-group` | 0-2-0 | `margin-top` | `var(--size-4-6)` = **24px** |
| `.setting-group .setting-items` | 0-2-0 | `background-color` | `var(--setting-items-background)` = `var(--background-primary-alt)` |
| `.setting-group .setting-items` | 0-2-0 | `padding` | `var(--setting-items-padding)` = `var(--size-4-5)` = **20px** |
| `.setting-group .setting-items` | 0-2-0 | `border-radius` | `var(--setting-items-radius)` = `var(--radius-l)` = **12px** |
| `.setting-group .setting-items` | 0-2-0 | `border` | `var(--setting-items-border-width) solid var(--setting-items-border-color)` = `0 solid ...` (默认无边框) |
| `.setting-group .setting-items` | 0-2-0 | `corner-shape` | `var(--corner-shape)` |

#### C. 设置项

| 选择器 | 特异性 | 属性 | 官方值 |
|--------|-------|------|--------|
| `.setting-group .setting-item` | 0-3-0 | `display` | `flex; align-items: center; row-gap: var(--size-4-3)` |
| `.setting-group .setting-item` | 0-3-0 | `padding` | `var(--size-4-4) 0` = **16px 0** |
| `.setting-group .setting-item` | 0-3-0 | `border-top` | `var(--border-width) solid var(--background-modifier-border)` = **1px** |
| `.setting-group .setting-item` | 0-3-0 | `border-radius` | **0** |
| `.setting-group .setting-item` | 0-3-0 | `background-color` | **transparent** |
| `.setting-group .setting-item` | 0-3-0 | `margin-bottom` | **0** |
| `.setting-group .setting-item:first-child` | 0-4-0 | `padding-top` | **0** |
| `.setting-group .setting-item:first-child` | 0-4-0 | `border-top` | **none** |
| `.setting-group .setting-item:last-child` | 0-4-0 | `padding-bottom` | **0** |

> ⚠️ 注意：`.setting-group .setting-item` 的特异性是 `0-3-0`。如果你的自定义 class 选择器只有 `0-1-0` 或 `0-2-0`，核心规则会胜出。

#### D. 标题/Heading（⚠️ 高频出错区）

| 选择器 | 特异性 | 属性 | 官方值 |
|--------|-------|------|--------|
| `.setting-item-heading` | 0-1-1 | `color` | **`var(--text-normal)`** ← 不是 muted！ |
| `.setting-item-heading` | 0-1-1 | `font-size` | **`var(--font-ui-medium)`** = 15px |
| `.setting-item-heading` | 0-1-1 | `font-weight` | **`var(--font-semibold)`** = 600 |
| `.setting-item-heading` | 0-1-1 | `padding` | `0 var(--size-4-4)` = **0 16px** |
| `.setting-item-heading` | 0-1-1 | `margin` | `0 0 var(--size-4-4)` = **0 0 16px** |
| `.setting-item-heading` | 0-1-1 | `text-transform` | **none** ← 不是 uppercase！ |
| `.setting-item-heading` | 0-1-1 | `letter-spacing` | **normal** |
| `.setting-item-heading` | 0-1-1 | `background-color` | **transparent** |
| `.setting-item-heading` | 0-1-1 | `border-top` | **none** |
| `.vertical-tab-content h3` | 0-1-1 | 同上全部 | **同上全部** |
| `.setting-item + .setting-item-heading` | 0-2-1 | `margin-top` | `0.75em` ≈ **12px** |
| `.setting-item ~ :is(h1,h2,h3,h4,.setting-item-heading)` | 0-2-1 | `margin-top` | `var(--size-4-6)` = **24px** |

#### E. 设置项名称与描述

| 选择器 | 属性 | 官方值 |
|------|------|--------|
| `.setting-item-name` | `color` | `var(--text-normal)` |
| `.setting-item-name` | `font-size` | `var(--font-ui-medium)` = 15px |
| `.setting-item-name` | `line-height` | `var(--line-height-tight)` |
| `.setting-item-name` | `overflow` | hidden + text-overflow: ellipsis |
| `.setting-item-description` | `color` | `var(--text-muted)` ← 描述用灰色 |
| `.setting-item-description` | `font-size` | `var(--font-ui-smaller)` = 12px |
| `.setting-item-description` | `padding-top` | `var(--size-4-1)` = 4px |
| `.setting-item-description` | `line-height` | `var(--line-height-tight)` |
| `.setting-item-info` | `flex` | `1 1 auto` |
| `.setting-item-info` | `min-width` | `0` |

#### F. 控件区域

| 选择器 | 属性 | 官方值 |
|------|------|--------|
| `.setting-item-control` | `flex` | `1 1 auto` |
| `.setting-item-control` | `text-align` | `end` |
| `.setting-item-control` | `display` | flex; justify-content: flex-end; align-items: center |
| `.setting-item-control` | `gap` | `var(--size-4-2)` = 8px |
| `.setting-item-control select` | `width` | inherit; max-width: 400px |

#### G. 关键变量速查

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--setting-group-heading-color` | `var(--text-normal)` | 标题颜色（深色） |
| `--setting-group-heading-size` | `var(--font-ui-medium)` = 15px | 标题字号 |
| `--setting-group-heading-weight` | `var(--font-semibold)` = 600 | 标题字重 |
| `--setting-items-background` | `var(--background-primary-alt)` | 卡片背景色（桌面端/移动端暗色）；**移动端亮色用 `--background-primary`**，见 §11.2 |
| `--setting-items-padding` | `var(--size-4-5)` = 20px | 卡片内边距 |
| `--setting-items-radius` | `var(--radius-l)` = 12px | 卡片圆角 |
| `--setting-items-border-width` | 0 | 卡片边框宽度（默认无） |
| `--setting-items-border-color` | `var(--background-modifier-border)` | 卡片边框颜色 |
| `--font-ui-small` | 13px | 小号 UI 字体 |
| `--font-ui-smaller` | 12px | 最小 UI 字体 |
| `--font-ui-medium` | 15px | 中等 UI 字体 |
| `--font-normal` | 400 | 正常字重 |
| `--font-semibold` | 600 | 半粗字重 |
| `--line-height-tight` | 1.25 | 紧凑行高 |
| `--text-faint` | 更淡的灰色 | 次要次要文字 |
| `--text-muted` | 灰色 | 次要文字（描述等） |
| `--text-normal` | 深色/黑色 | 主要文字（标题、名称等） |
| `--background-primary` | 主背景色 | 页面背景 |
| `--background-primary-alt` | 稍不同的主背景 | 卡片背景（桌面端/移动端暗色） |
| `--radius-s` | 4px | 小圆角 |
| `--radius-m` | 8px | 中圆角（导航按钮桌面端） |
| `--radius-l` | 12px | 大圆角（卡片） |
| `--radius-xl` | 16px | 超大圆角 |
| `--touch-radius-xs` | — | 移动端触控圆角（导航按钮移动端），值由主题决定 |
| `--corner-shape` | — | 圆角形状（配合 border-radius 使用） |

#### H. 自定义选择器安全清单

当你创建自定义 class 时，按此清单检查每个属性：

```css
/* ✅ 安全：只声明增量差异，让核心规则处理其余 */
.my-custom-title {
  /* 只写你确实需要不同的值 */
}

/* ⚠️ 危险：如果选择器特异性 ≥ 0-1-1，必须显式声明所有属性 */
.lip-settings-root .my-custom-element {
  display: flex;           /* ✓ 核心无此元素，需自己声明 */
  align-items: center;     /* ✓ */

  color: ???               /* ⚠️ 必须声明：见 §11.9 D/G 变量表 */
  font-size: ???           /* ⚠️ */
  font-weight: ???         /* ⚠️ */
  text-transform: ???      /* ⚠️ */
  letter-spacing: ???      /* ⚠️ */
  padding: ???             /* ⚠️ */
  margin: ???              /* ⚠️ */
  background-color: ???    /* ⚠️ */
}
```

#### I. 特异性对抗表（常见冲突）

| 你的选择器 | 特异性 | Obsidian 核心 | 特异性 | 谁赢？ |
|-----------|-------|--------------|-------|--------|
| `.my-class` | 0-1-0 | `.vertical-tab-content h3` | 0-1-1 | **核心赢** ✅ 安全 |
| `.container .my-class` | 0-2-0 | `.vertical-tab-content h3` | 0-1-1 | **你赢** ⚠️ 需声明全部属性 |
| `.lip-settings-root h3` | 0-2-1 | `.vertical-tab-content h3` | 0-1-1 | **你赢** ⚠️ 需声明全部属性 |
| `.lip-settings-root .my-class` | 0-2-0 | `.setting-group .setting-item` | 0-3-0 | **核心赢** ✅ 安全 |
| `.my-class` | 0-1-0 | `.setting-item` | 0-1-0 | **平局** → 后定义的赢 ⚠️ |
| `.nav-btn.is-active` | 0-2-0 | `@media .nav-btn` | 0-1-0 | **你赢** ⚠️ `.is-active` 的 `border-radius` 会覆盖移动端媒体查询中的基础值！不要在 `.is-active` 中重复声明 `border-radius` |
