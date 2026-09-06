---
name: obsidian-plugin-dev
description: Obsidian 插件全栈开发。基于 TypeScript + Obsidian API + esbuild 技术栈。当用户需要：(1) 创建 Obsidian 插件项目；(2) 开发插件功能（命令、视图、设置、编辑器扩展、Markdown 处理等）；(3) 集成前端框架（React/Svelte/Vue）； (4) 调试测试插件；(5) 运行 ESLint 检查代码质量；(6) 发布到 Obsidian 社区时使用。
---

# Obsidian 插件开发工作室

## ⚠️ 强制规则（开发前必读）

> **生成任何 UI 代码之前，必须先阅读 [ui-patterns.md](references/ui-patterns.md) 对应章节。**
> SKILL.md 中的代码仅为速览摘要，**不包含**完整的 CSS 变量规范、移动端适配、特异性规则等关键约束。
> 违反 ui-patterns.md 规范的代码将被视为缺陷。

### 反模式清单（禁止事项）

| # | 禁止做法 | 正确做法 | 来源 |
|---|---------|---------|------|
| 1 | ❌ 卡片背景用 `--background-secondary` | ✅ 桌面端/移动端暗色用 `--background-primary-alt`；移动端亮色用 `--background-primary` | ui-patterns §10.2 |
| 2 | ❌ 激活/选中态用 `--interactive-accent-*`（变蓝） | ✅ 用 `--background-modifier-hover`（中性灰） | ui-patterns §10.4 |
| 3 | ❌ 硬编码任何 CSS 值（颜色 `#fff`、圆角 `12px`、间距 `6px`、字号 `14px`） | ✅ 使用 Obsidian CSS 变量（`--radius-l`、`--size-4-*`、`--font-ui-*` 等） | ui-patterns §10.1 |
| 4 | ❌ 设置面板用传统 `new Setting()` 平铺（无分组） | ✅ 使用 `SettingGroup` 链式调用 | ui-patterns §10.6 |
| 5 | ❌ 移动端不区分亮暗色模式 | ✅ 亮色用 `--background-primary`，暗色用 `--background-primary-alt` | ui-patterns §10.2 |
| 6 | ❌ 边框用 `color-mix(... transparent)` | ✅ 用 `--background-modifier-border` | ui-patterns §10.5 |
| 7 | ❌ 使用 `innerHTML`、`outerHTML`、`insertAdjacentHTML`、`eval()`、`Function()` | ✅ 用 `createEl()` 构建 DOM | Plugin guidelines |
| 8 | ❌ 导航按钮自定义字体/颜色/字重 | ✅ 添加 `setting-item-heading` class 继承原生标题样式 | ui-patterns §10.4 |
| 9 | ❌ 使用全局 `app` / `window.app` | ✅ 使用插件实例的 `this.app` | Plugin guidelines |
| 10 | ❌ 使用 `<h1>`、`<h2>` HTML 元素做设置标题 | ✅ 使用 `new Setting(containerEl).setName('title').setHeading()` | Plugin guidelines |
| 11 | ❌ 设置标题包含 "settings"（如 "Advanced settings"） | ✅ 省略 "settings"（如 "Advanced"） | Plugin guidelines |
| 12 | ❌ UI 文本使用 Title Case（如 "Create New Note"） | ✅ 使用 Sentence case（如 "Create new note"） | Plugin guidelines |
| 13 | ❌ 设置只有一个分组却添加标题（如 "General"、"Settings"） | ✅ 单分组不添加标题，多分组时通用设置放顶部无标题 | Plugin guidelines |
| 14 | ❌ 为命令设置默认快捷键 | ✅ 不设默认快捷键，让用户自行配置 | Plugin guidelines |
| 15 | ❌ 遍历 `getFiles()` 查找指定路径文件 | ✅ 使用 `getFileByPath()` / `getFolderByPath()` / `getAbstractFileByPath()` | Plugin guidelines |
| 16 | ❌ 使用 `Vault.modify()` 修改活动文件 | ✅ 使用 Editor API（保留光标、选区、折叠状态） | Plugin guidelines |
| 17 | ❌ 使用 `Vault.modify()` 后台修改非活动文件 | ✅ 使用 `Vault.process()`（原子操作，避免冲突） | Plugin guidelines |
| 18 | ❌ 手动解析/修改 YAML frontmatter | ✅ 使用 `FileManager.processFrontMatter()`（原子操作，布局一致） | Plugin guidelines |
| 19 | ❌ 使用 Adapter API (`app.vault.adapter`) 做文件操作 | ✅ 使用 Vault API（有缓存层 + 串行化避免竞态） | Plugin guidelines |
| 20 | ❌ 直接访问 `workspace.activeLeaf` | ✅ 使用 `getActiveViewOfType(T)` 或 `workspace.activeEditor?.editor` | Plugin guidelines |
| 21 | ❌ 持有自定义视图引用 `() => this.view = new MyView()` | ✅ `() => new MyView()`，通过 `getLeavesOfType()` 动态获取 | Plugin guidelines |
| 22 | ❌ `onunload()` 中调用 `detachLeaves()` | ✅ 不在 `onunload` 中 detach leaves（更新后 leaves 会自动恢复原位） | Plugin guidelines |
| 23 | ❌ 使用 `var` 声明变量 | ✅ 使用 `const` / `let` | Plugin guidelines |
| 24 | ❌ 使用 `.then()/.catch()` 链式 Promise | ✅ 使用 `async/await` + `try/catch` | Plugin guidelines |
| 25 | ❌ 在移动端使用 Node.js / Electron API | ✅ 使用 `Platform.isMobile` 检测，避免调用 Node/Electron API | Plugin guidelines |
| 26 | ❌ 使用正则 lookbehind（iOS 16.4 以下不支持） | ✅ 提供降级方案或使用 JS 库检测浏览器版本 | Plugin guidelines |
| 27 | ❌ 不必要的 `console.log` 日志输出 | ✅ 默认配置下只输出错误信息，debug 信息不应显示 | Plugin guidelines |
| 28 | ❌ 使用占位符类名 `MyPlugin`、`MyPluginSettings`、`SampleSettingTab` | ✅ 重命名为反映插件实际名称的类名 | Plugin guidelines |

### 代码生成检查点

生成 UI 代码后，必须逐项检查：
- [ ] CSS 变量是否遵循 ui-patterns.md §10 配色规范？
- [ ] 设置面板是否使用 `SettingGroup`？
- [ ] 移动端亮暗色是否分别处理？
- [ ] 激活态是否用中性灰而非强调色？
- [ ] 是否存在硬编码 CSS 值（颜色/圆角/间距/字号）？
- [ ] 导航按钮是否添加了 `setting-item-heading` class？
- [ ] 是否使用了全局 `app` 而非 `this.app`？
- [ ] 设置标题是否使用了 `setHeading()` 而非 `<h1>`/`<h2>`？
- [ ] UI 文本是否使用 Sentence case？
- [ ] 是否存在不必要的 `console.log`？
- [ ] 类名是否已从占位符重命名为实际插件名？
- [ ] 是否运行 ESLint 检查（`npx eslint src/`），`obsidianmd/` 规则 0 error？

## 需求分类决策树

收到开发请求时，通过以下问题快速判断复杂度和模板选择：

**Q1: 是否需要修改编辑器外观或行为？**（语法高亮、装饰、自动补全、实时预览）
→ **是**：使用 `template-editor-extension`，参考 [editor-extensions.md](references/editor-extensions.md)

**Q2: 是否需要独立面板/侧边栏视图？**（数据展示、列表管理、自定义界面）
→ **是**：使用 `template-view`，参考 [ui-patterns.md](references/ui-patterns.md)

**Q3: 其他需求？**（命令、菜单、文本处理、设置、通知等）
→ 使用 `template-simple`

**复杂插件**：组合多个模板的模式。例如"带侧边栏的编辑器扩展"= view + editor-extension。

**框架集成**：如果需要 React/Svelte/Vue，在任意模板基础上叠加框架配置。
→ 参考 [framework-integration.md](references/framework-integration.md)

## 核心约束

生成的所有代码**必须**遵守以下规则：

1. **路径规范化**：所有文件路径使用 `normalizePath()` 处理
2. **资源清理**：`onunload()` 中清理所有事件、定时器、DOM 元素。⚠️ 不要在 `onunload()` 中 `detachLeaves()`（更新插件后 leaves 会自动恢复原位）
3. **自动清理注册**：使用 `registerEvent()`/`registerInterval()` 而非直接 `addEventListener`/`setInterval`
4. **视图引用**：不直接持有视图引用，使用 `getLeavesOfType()` 动态获取
5. **设置模式**：使用 `loadData()`/`saveData()` + `Object.assign({}, DEFAULT, loaded)` 标准模式。推荐使用 `Partial<Settings>` 定义默认值。⚠️ `Object.assign()` 是浅拷贝，嵌套属性需深拷贝
6. **平台检测**：使用 `Platform.isMobile`/`Platform.isDesktop` 而非 User-Agent
7. **类型安全**：访问 CM6 EditorView 使用 `@ts-expect-error` 标注
8. **安全规范**：禁止 `innerHTML`、`outerHTML`、`insertAdjacentHTML`、`eval()`、`Function()`，使用 `createEl()` 构建 DOM
9. **设置页风格**：**必须使用 `SettingGroup` 组件**（Obsidian 原生分组组件）。`SettingGroup` 自动处理标题样式、分割线、卡片背景，代码更简洁且主题兼容性最好。完整规范见 [ui-patterns.md](references/ui-patterns.md)
10. **最低版本**：`minAppVersion` 设置为 `0.15.0`（除非使用新 API）
11. **CSS 变量**：所有颜色、间距、圆角必须使用 Obsidian CSS 变量，禁止硬编码。完整变量表见 [ui-patterns.md §10.9 G](references/ui-patterns.md)
12. **移动端适配**：卡片背景必须区分移动端亮色（`--background-primary`）和暗色（`--background-primary-alt`）。详见 [ui-patterns.md §10.2](references/ui-patterns.md)

## 快速开始

### 项目结构

```
my-plugin/
├── main.ts              # 插件入口（必须）
├── manifest.json        # 插件清单（必须）
├── package.json         # npm 依赖
├── tsconfig.json        # TypeScript 配置
├── esbuild.config.mjs   # 构建配置
├── styles.css           # 样式文件（可选）
├── view.ts              # 自定义视图（可选）
├── settings.ts          # 设置模块（可选）
├── extension.ts         # 编辑器扩展（可选）
└── widget.ts            # 装饰小部件（可选）
```

### 脚本初始化

```powershell
# PowerShell 初始化
& "$env:USERPROFILE\.trae-cn\skills\obsidian-plugin-dev\scripts\init-obsidian-plugin.ps1" `
  -Name "my-plugin" -Template "simple" -VaultPath "D:\MyVault"
```

```bash
# macOS / Linux 初始化
~/.trae-cn/skills/obsidian-plugin-dev/scripts/init-obsidian-plugin.sh \
  --name my-plugin --template simple --vault-path "$HOME/Documents/MyVault"
```

### 手动创建

1. 创建项目目录并 `npm init -y`
2. 安装依赖：`npm install --save-dev obsidian @types/node typescript esbuild builtin-modules`
3. 从合适的 `assets/template-*/` 目录复制模板文件
4. 替换 `{{PLUGIN_ID}}`、`{{PLUGIN_NAME}}` 和 `{{PLUGIN_CLASS}}` 占位符
5. `npm run dev` 启动开发构建

### 开发调试

```bash
# 开发构建（监听模式）
npm run dev

# 生产构建
npm run build
```

将构建产物（main.js, manifest.json, styles.css）复制到 Vault 的 `.obsidian/plugins/your-plugin-id/` 目录。
在 Obsidian 设置 → 第三方插件 → 启用插件。使用 Ctrl+R 重新加载。

推荐安装 [Hot-Reload](https://github.com/pjeby/hot-reload) 插件实现自动重载。

## 插件骨架代码

### main.ts 基础结构

```typescript
import { Plugin, Notice, PluginSettingTab, Setting, SettingGroup } from 'obsidian';

interface MyPluginSettings {
  option1: string;
  option2: boolean;
}

const DEFAULT_SETTINGS: Partial<MyPluginSettings> = {
  option1: 'default',
  option2: false,
};

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: 'my-command',
      name: 'My Command',
      callback: () => { new Notice('Hello!'); },
    });

    this.addRibbonIcon('dice', 'My Plugin', () => { new Notice('Clicked!'); });

    this.addStatusBarItem().setText('My Plugin');

    this.addSettingTab(new MySettingTab(this.app, this));
  }

  onunload() {
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

    new SettingGroup(containerEl)
      .setHeading('General')
      .addSetting((setting) =>
        setting
          .setName('Option 1')
          .setDesc('Description for option 1')
          .addText((text) =>
            text
              .setPlaceholder('Enter value...')
              .setValue(this.plugin.settings.option1)
              .onChange(async (value) => {
                this.plugin.settings.option1 = value;
                await this.plugin.saveSettings();
              })
          )
      )
      .addSetting((setting) =>
        setting
          .setName('Option 2')
          .setDesc('Toggle option 2')
          .addToggle((toggle) =>
            toggle
              .setValue(this.plugin.settings.option2)
              .onChange(async (value) => {
                this.plugin.settings.option2 = value;
                await this.plugin.saveSettings();
              })
          )
      );
  }
}
```

### manifest.json

```json
{
  "id": "{{PLUGIN_ID}}",
  "name": "{{PLUGIN_NAME}}",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "Description of your plugin.",
  "author": "Your Name",
  "authorUrl": "https://github.com/your-name",
  "isDesktopOnly": false
}
```

### esbuild.config.mjs

```javascript
import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete", "@codemirror/collab",
    "@codemirror/commands", "@codemirror/language",
    "@codemirror/lint", "@codemirror/search",
    "@codemirror/state", "@codemirror/view",
    "@lezer/common", "@lezer/highlight", "@lezer/lr",
    ...builtins,
  ],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

## 核心 API 速览

### App — 应用入口（通过 `this.app` 访问）

| 属性 | 说明 |
|------|------|
| `vault: Vault` | 文件库操作 |
| `workspace: Workspace` | 工作区布局 |
| `metadataCache: MetadataCache` | 文件元数据缓存 |
| `fileManager: FileManager` | 文件管理器 |

### Vault — 文件操作

| 方法 | 说明 |
|------|------|
| `read(file)` / `cachedRead(file)` | 读取文件内容 |
| `create(path, data)` | 创建文件 |
| `modify(file, data)` | 修改文件（⚠️ 活动文件优先用 Editor API） |
| `process(file, fn)` | 原子修改文件（推荐用于非活动文件，避免冲突） |
| `append(file, data)` | 追加内容 |
| `delete(file)` / `trash(file, system)` | 删除文件 |
| `rename(file, newPath)` | 重命名/移动 |
| `getMarkdownFiles()` | 获取所有 Markdown 文件 |
| `getFileByPath(path)` | 按路径获取文件（⚠️ 优于遍历 `getFiles()`） |
| `getFolderByPath(path)` | 按路径获取文件夹 |
| `getAbstractFileByPath(path)` | 按路径获取文件或文件夹（不确定类型时使用） |

### FileManager — 文件管理

| 方法 | 说明 |
|------|------|
| `processFrontMatter(file, fn)` | 原子修改 frontmatter（⚠️ 优于手动解析 YAML） |

### Workspace — 工作区

| 方法 | 说明 |
|------|------|
| `getActiveFile()` | 获取当前活跃文件 |
| `getActiveViewOfType(T)` | 获取特定类型的活跃视图 |
| `getLeavesOfType(type)` | 获取所有指定类型的叶子 |
| `detachLeavesOfType(type)` | 关闭指定类型的所有叶子 |
| `getLeaf(newLeaf?)` | 获取或创建叶子 |
| `getRightLeaf(false)` | 获取右侧边栏叶子 |
| `onLayoutReady(cb)` | 布局就绪回调 |

### Editor — 编辑器操作

| 方法 | 说明 |
|------|------|
| `getValue()` / `setValue(content)` | 读写全文 |
| `getSelection()` / `replaceSelection(text)` | 选区操作 |
| `getCursor()` / `setCursor(pos)` | 光标操作 |
| `getLine(n)` / `setLine(n, text)` | 行操作 |
| `replaceRange(text, from, to?)` | 范围替换 |
| `transaction(tx)` | 批量编辑事务 |

更完整的 API 参考见 [api-quick-reference.md](references/api-quick-reference.md)。

## UI 组件速览

> ⚠️ **以下仅为速览摘要。开发 UI 组件时，必须阅读 [ui-patterns.md](references/ui-patterns.md) 获取完整规范（含 CSS 变量、移动端适配、特异性规则）。**

| 组件 | 核心 API | 关键约束 | 完整文档 |
|------|---------|---------|---------|
| 命令 | `addCommand()` | 四种模式：`callback` / `checkCallback` / `editorCallback` / `editorCheckCallback` | [ui-patterns §1](references/ui-patterns.md) |
| 右键菜单 | `new Menu()` | 必须用 `registerEvent()` 注册 | [ui-patterns §2](references/ui-patterns.md) |
| 模态框 | `Modal` / `SuggestModal` / `FuzzySuggestModal` | `onOpen()` 构建 UI，`onClose()` 清理 | [ui-patterns §3](references/ui-patterns.md) |
| **设置面板** | **`SettingGroup`** | **必须用 `SettingGroup`，禁止 `Setting` 平铺** | [ui-patterns §4 + §10.6](references/ui-patterns.md) |
| 功能区图标 | `addRibbonIcon()` | 返回 `HTMLElement`，可添加 class | [ui-patterns §5](references/ui-patterns.md) |
| 状态栏 | `addStatusBarItem()` | 移动端不可用 | [ui-patterns §6](references/ui-patterns.md) |
| 自定义视图 | `ItemView` + `registerView()` | ⚠️ 不要在 `onunload()` 中 `detachLeavesOfType()` | [ui-patterns §7](references/ui-patterns.md) |

## 事件系统

使用 `registerEvent` 和 `registerInterval` 注册事件，确保插件卸载时自动清理。

```typescript
this.registerEvent(this.app.vault.on('create', (file) => {}));
this.registerEvent(this.app.vault.on('modify', (file) => {}));
this.registerEvent(this.app.vault.on('delete', (file) => {}));
this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {}));

this.registerEvent(this.app.workspace.on('file-open', (file) => {}));
this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => {}));
this.registerEvent(this.app.workspace.on('layout-change', () => {}));
this.registerEvent(this.app.workspace.on('file-menu', (menu, file, source) => {
  menu.addItem((item) => item.setTitle('My Action').onClick(() => {}));
}));
this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor, info) => {
  menu.addItem((item) => item.setTitle('Editor Action').onClick(() => {}));
}));
this.registerEvent(this.app.workspace.on('editor-change', (editor, info) => {}));

this.registerEvent(this.app.metadataCache.on('changed', (file, data, cache) => {}));
this.registerEvent(this.app.metadataCache.on('resolved', () => {}));

this.registerInterval(window.setInterval(() => {}, 5 * 60 * 1000));
```

## 编辑器扩展入口

编辑器扩展用于修改**编辑模式**下的外观和行为，基于 CodeMirror 6。

- **State Field**：管理独立于文档的自定义状态 → [editor-extensions.md](references/editor-extensions.md)
- **View Plugin**：响应视口变化、操作 DOM → [editor-extensions.md](references/editor-extensions.md)
- **Decoration**：修改文档外观（高亮、替换、插入小部件）→ [editor-extensions.md](references/editor-extensions.md)
- **Markdown 后处理器**：修改**阅读模式**渲染 → 使用 `registerMarkdownPostProcessor`
- **代码块处理器**：自定义代码块渲染 → 使用 `registerMarkdownCodeBlockProcessor`

```typescript
this.registerEditorExtension([myViewPlugin, myStateField]);
this.registerMarkdownPostProcessor((el, ctx) => { /* 处理阅读视图 DOM */ });
this.registerMarkdownCodeBlockProcessor('csv', (source, el, ctx) => { /* 渲染 CSV */ });
```

## 框架集成入口

| 框架 | 适用场景 | 关键依赖 |
|------|----------|----------|
| **React** | 复杂交互 UI、状态驱动界面 | `react react-dom` |
| **Svelte** | 轻量高性能、简洁语法 | `svelte esbuild-svelte` |
| **Vue** | 模板偏好、UI 库生态（Naive UI 等） | `vue @vitejs/plugin-vue` |

详见 [framework-integration.md](references/framework-integration.md)。

## 开发工作流

1. **环境搭建**：Node.js 16+ → `npm install` → `npm run dev`
2. **Hot-Reload**：安装 pjeby/hot-reload 插件，修改代码后自动重载
3. **调试**：Ctrl+Shift+I 打开 DevTools，使用 `console.log` 和断点
4. **移动端测试**：通过 ADB 连接 Android 或 Safari 远程调试 iOS
5. **Vault 路径**：可在 esbuild 配置中设置 `outdir` 直接输出到 Vault 插件目录

```javascript
const VAULT_PLUGIN_DIR = "D:/MyVault/.obsidian/plugins/my-plugin";
outfile: prod ? "main.js" : `${VAULT_PLUGIN_DIR}/main.js`,
```

## ESLint 检查

使用 [eslint-plugin-obsidianmd](https://github.com/obsidianmd/eslint-plugin) 官方 ESLint 插件检查代码质量，确保遵循 Obsidian 插件开发规范。

### 安装

```bash
npm install --save-dev eslint eslint-plugin-obsidianmd @typescript-eslint/parser
```

### 配置

创建 `eslint.config.mjs`（ESLint v9+ flat config 格式）：

```javascript
// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },
]);
```

### 运行

```bash
# 检查所有源文件
npx eslint src/

# 只看 Obsidian 官方规则（过滤 TypeScript 严格规则）
npx eslint src/ 2>&1 | grep "obsidianmd/"

# 自动修复可修复的问题
npx eslint src/ --fix
```

### 核心 Obsidian 规则速览

| 规则 | 说明 | 级别 |
|------|------|------|
| `prefer-active-doc` | 用 `activeDocument` 替代 `document`（弹出窗口兼容） | warn |
| `no-unsupported-api` | 禁止使用低于 `minAppVersion` 的 API | error |
| `no-static-styles-assignment` | 禁止 `element.style.xxx`，改用 CSS 类 | warn |
| `detach-leaves` | 禁止在 `onunload` 中 detach leaves | error |
| `no-forbidden-elements` | 禁止附加禁止的 DOM 元素 | error |
| `no-global-this` | 禁止 `global`/`globalThis`，用 `window` | error |
| `no-nodejs-modules` | 禁止导入 Node.js 模块（除非 `Platform.isDesktop` 守卫） | error |
| `no-sample-code` | 禁止模板占位代码 | error |
| `no-tfile-tfolder-cast` | 禁止类型断言为 `TFile`/`TFolder`，用 `instanceof` | error |
| `no-view-references-in-plugin` | 禁止在插件中持有视图引用 | error |
| `object-assign` | 不鼓励双参数 `Object.assign` | error |
| `platform` | 禁止用 navigator API 检测 OS | error |
| `prefer-abstract-input-suggest` | 用内置 `AbstractInputSuggest` 替代手写 Suggest | error |
| `prefer-instanceof` | 用 `.instanceOf(T)` 替代 `instanceof T`（跨窗口安全） | error |
| `prefer-window-timers` | 用 `window.setTimeout` 替代裸全局定时器 | error |
| `regex-lookbehind` | 禁止正则 lookbehind（iOS 16.4 以下不支持） | error |
| `sample-names` | 重命名模板占位类名 | error |
| `ui/sentence-case` | UI 文本使用 Sentence case | error |
| `validate-manifest` | 验证 `manifest.json` 结构 | error |
| `vault/iterate` | 避免遍历所有文件查找指定路径 | error |
| `hardcoded-config-path` | 禁止硬编码 `.obsidian` 路径，用 `Vault#configDir` | error |
| `editor-drop-paste` | editor-drop/paste 处理器需检查 `evt.defaultPrevented` | error |
| `no-plugin-as-component` | 禁止将 plugin 作为 Component 传给 `MarkdownRenderer.render` | error |
| `prefer-get-language` | 用 `getLanguage()` 替代 `localStorage.getItem('language')` | error |

### 何时运行 ESLint

- **开发完成后**：运行 `npx eslint src/` 检查代码质量
- **发布前**：确保 0 个 `obsidianmd/` 规则的 error
- **CI/CD**：可在 GitHub Actions 中集成 ESLint 检查

## 发布流程

### 发布检查清单（简版）

- [ ] `manifest.json` 中 `id`、`name`、`version`、`minAppVersion` 正确
- [ ] `versions.json` 包含版本到最低 Obsidian 版本的映射
- [ ] 所有路径使用 `normalizePath()`
- [ ] `onunload()` 中清理了所有资源（但不调用 `detachLeaves()`）
- [ ] 没有使用 `innerHTML`/`outerHTML`/`insertAdjacentHTML`（XSS 风险）
- [ ] 不包含追踪代码或远程请求（除核心功能外）
- [ ] 不包含 `eval()` 或 `Function()` 调用
- [ ] 没有使用全局 `app` / `window.app`
- [ ] 没有不必要的 `console.log` 日志
- [ ] 占位符类名已重命名为实际插件名
- [ ] 命令没有设置默认快捷键
- [ ] 使用 `Vault.process()` 而非 `Vault.modify()` 后台修改文件
- [ ] 使用 `FileManager.processFrontMatter()` 修改 frontmatter
- [ ] 使用 `getFileByPath()` 而非遍历 `getFiles()` 查找路径
- [ ] 移动端兼容：未使用 Node.js / Electron API
- [ ] 移动端兼容：正则 lookbehind 有降级方案
- [ ] UI 文本使用 Sentence case
- [ ] 设置标题不含 "settings" 重复词
- [ ] 使用 `const`/`let` 而非 `var`，使用 `async/await` 而非 `.then()/.catch()`
- [ ] 代码文件使用文件夹组织（多于一个 `.ts` 文件时）
- [ ] 运行 `npx eslint src/` 检查，`obsidianmd/` 规则 0 error

### GitHub Release

1. 更新 `manifest.json` 和 `versions.json` 中的版本号
2. 创建 Git 标签：`git tag -a 1.0.0 -m "Release 1.0.0"`
3. 推送标签：`git push origin 1.0.0`
4. GitHub Actions 自动构建并上传 `main.js`、`manifest.json`、`styles.css`

### 社区提交

1. 确保插件仓库为公开 GitHub 仓库，且包含 `main.js`、`manifest.json`、`styles.css`
2. 访问 [Obsidian 社区插件](https://community.obsidian.md/search?type=plugin) 页面
3. 点击 "Submit plugin" 提交插件信息
4. 等待审核通过后，插件将出现在社区插件列表中

详见 [publishing-checklist.md](references/publishing-checklist.md)。

## 参考文档索引

| 文档 | 阅读时机 |
|------|----------|
| [api-quick-reference.md](references/api-quick-reference.md) | 查找具体 API 方法签名时 |
| [ui-patterns.md](references/ui-patterns.md) | **开发任何 UI 组件时（必须阅读）** |
| [editor-extensions.md](references/editor-extensions.md) | 开发 CM6 编辑器扩展（State Field/View Plugin/Decoration）时 |
| [framework-integration.md](references/framework-integration.md) | 集成 React/Svelte/Vue 框架时 |
| [publishing-checklist.md](references/publishing-checklist.md) | 准备发布插件到社区时 |
| [troubleshooting.md](references/troubleshooting.md) | 遇到调试问题或常见错误时 |
