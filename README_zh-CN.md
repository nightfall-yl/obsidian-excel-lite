# Excel Lite

基于 [Univer](https://github.com/dream-num/univer) 的轻量级 Obsidian 电子表格插件。

[![Version](https://img.shields.io/badge/version-26.1.3-blue)](https://github.com/nightfall-yl/obsidian-excel-lite) | [![Obsidian](https://img.shields.io/badge/Obsidian-1.11.0%2B-purple)](https://obsidian.md) | [![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

简体中文 | [English](README.md)

## ✨ 功能特性

### 核心功能

- **完整的电子表格编辑器** — 类 Excel 界面，支持多 Sheet 工作簿的创建与编辑
- **公式引擎** — SUM、AVERAGE、IF、VLOOKUP 等数百种公式，支持跨 Sheet 引用
- **单元格格式化** — 数字格式、字体、颜色、边框、对齐、合并单元格、冻结窗格
- **排序与筛选** — 灵活的行列排序与数据筛选下拉
- **超链接与批注** — 可点击链接、单元格备注及协作式线程评论

### 导入 / 导出

- **导入** `.xlsx` / `.xls`（Excel 97-2003）/ `.csv` 文件到 Obsidian
- **导出**工作簿为 `.xlsx`、`.xls` 或 `.csv`
- **下拉选择器** — 工具栏仅两个按钮，导入和导出各一个，点按选择格式
- **嵌入链接** — 在单元格中引用其他 Obsidian 笔记作为嵌入内容

### 移动端

- **预览模式**（默认） — 专为移动端阅读优化的只读视图，不弹键盘、滚动流畅
- **编辑模式** — 完整编辑功能，包含工具栏、Sheet 标签和单元格输入
- **一键切换** — 通过右上角书本/铅笔图标在预览和编辑模式间切换
- **Sheet 位置记忆** — 切换模式时自动保持当前活动 Sheet

### Obsidian 集成

- **`.sheet.md` 文件** — 工作簿以包含结构化 JSON 数据块的 Markdown 文件存储
- **Frontmatter 自动检测** — 含 `obsidian-excel: parsed` frontmatter 的 Markdown 文件自动以 Sheet 视图打开
- **功能区与命令** — 可从左侧功能区图标、命令面板或文件右键菜单创建新表格
- **暗色模式** — 自动跟随 Obsidian 主题设置
- **自动保存** — 编辑后 5 秒无操作自动保存

## 🚀 安装

1. 从 [Releases](../../releases) 下载最新版本
2. 解压到库的 `.obsidian/plugins/obsidian-excel-lite/` 目录
3. 重新加载 Obsidian（或在 **设置 → 社区插件** 中启用）

或从源码构建：

```bash
cd 你的库/.obsidian/plugins/
git clone https://github.com/nightfall-yl/obsidian-excel-lite.git
cd obsidian-excel-lite
npm install
npm run build
```

## 📖 使用方法

### 创建新表格

- 点击左侧功能区的 **电子表格** 图标
- 使用命令面板（`Ctrl/Cmd + P`）→ "Create new spreadsheet"
- 右键任意文件夹 → "Create new spreadsheet"

### 导入 / 导出

打开表格后，使用工具栏上的两个下拉按钮：

| 按钮 | 支持格式 |
|------|---------|
| **导入** | `.xlsx` · `.xls` · `.csv` |
| **导出** | `.xlsx` · `.xls` · `.csv` |

### 移动端模式

使用右上角的 **书本 / 铅笔图标** 在 **预览**（只读）和 **编辑**（完整功能）模式间切换。

## 🗂 文件格式

表格以纯文本 Markdown 文件存储，天然兼容 Git 版本控制：

```markdown
---
obsidian-excel: parsed
---

```sheet
{ ... Univer workbook JSON ... }
```
```

## 🔧 技术栈

| 组件 | 技术 |
|------|------|
| 电子表格引擎 | [Univer](https://univer.ai) 0.25.x |
| XLS/XLSX/CSV 读写 | [SheetJS (`@stackline/xlsx`)](https://sheetjs.com) |
| 构建工具 | Vite |
| 开发语言 | TypeScript |

## 🧪 开发

```bash
npm install        # 安装依赖
npm run build      # 生产构建
npm run dev        # 开发模式（监听变更）
npm test           # 运行单元测试
```

构建产物：`main.js`、`manifest.json`、`styles.css`（自动回写到项目根目录）。

## 🙏 致谢

- [Univer](https://github.com/dream-num/univer) — 底层电子表格引擎
- [SheetJS](https://sheetjs.com) — XLSX/XLS/CSV 导入导出支持
- [Obsidian](https://obsidian.md) — 让这一切成为可能的笔记应用

## 📄 许可证

[MIT](LICENSE)
