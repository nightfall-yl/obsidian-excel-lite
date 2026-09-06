# Excel Lite

> 基于 [Univer](https://github.com/dream-num/univer) 的免费 Obsidian 电子表格插件。

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/nightfall/obsidian-excel)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-0.15.0%2B-purple)](https://obsidian.md)
中文 | [English](README.md)

## 功能特性

### 核心功能

- **完整的电子表格编辑器** — 类似 Excel 的界面，支持创建和编辑多 Sheet 工作簿
- **公式引擎** — 支持 SUM、AVERAGE、IF、VLOOKUP 等数百种公式
- **单元格格式化** — 数字格式、字体、颜色、边框、对齐、合并单元格、冻结窗格
- **条件格式** — 基于规则高亮单元格（色阶、数据条、图标集）
- **数据验证** — 下拉列表、数字范围、日期约束
- **排序与筛选** — 行/列排序，按条件筛选
- **超链接与批注** — 添加可点击链接和单元格备注
- **线程评论** — 协作式的单元格讨论

### 导入 / 导出

- **导入 `.xlsx` / `.csv` 文件** — 直接打开现有 Excel 工作簿或 CSV 文件
- **导出为 `.xlsx` / `.csv`** — 将表格保存为标准 Excel 或 CSV 文件
- **嵌入链接** — 在单元格中引用其他 Obsidian 笔记作为嵌入内容

### 移动端支持

- **预览模式**（默认） — 专为移动端阅读优化的只读视图，不弹键盘、滚动流畅
- **编辑模式** — 完整编辑功能，包含工具栏、Sheet 标签和单元格输入
- **一键切换** — 通过右上角图标按钮在预览和编辑模式间切换
- **Sheet 位置记忆** — 切换模式时自动保持当前活动 Sheet

### Obsidian 集成

- **`.sheet.md` 文件** — 表格以包含结构化数据块的 Markdown 文件存储
- **Frontmatter 检测** — 含 `obsidian-excel: parsed` frontmatter 的 Markdown 文件自动以 Sheet 视图打开
- **功能区与命令** — 可从左侧功能区图标、命令面板或文件右键菜单创建新表格
- **暗色模式** — 自动跟随 Obsidian 主题设置
- **自动保存** — 编辑后 5 秒无操作自动保存

## 安装

1. 从 [Releases](../../releases) 下载最新版本
2. 解压到库的 `.obsidian/plugins/obsidian-excel/` 目录
3. 重新加载 Obsidian（或在 设置 → 社区插件 中启用）

或手动安装：

```bash
cd 你的库/.obsidian/plugins/
git clone https://github.com/nightfall_yl/obsidian-excel.git
cd obsidian-excel
npm install
npm run build
```

## 使用方法

### 创建新表格

- 点击左侧功能区的 **电子表格** 图标
- 使用命令面板（`Ctrl/Cmd + P`）→ "Create new spreadsheet"
- 右键任意文件夹 → "Create new spreadsheet"

### 打开已有表格

- 点击 `.sheet.md` 文件以 Sheet 视图打开
- 含 `obsidian-excel: parsed` frontmatter 的文件自动打开

### 导入 XLSX

1. 打开或创建一个表格
2. 点击工具栏中的 **Import XLSX** 按钮
3. 选择要导入的 `.xlsx` 文件

### 导出为 XLSX

1. 打开一个表格
2. 点击工具栏中的 **Export XLSX** 按钮
3. 工作簿将下载为 `.xlsx` 文件

### 移动端模式切换

在移动设备上，使用右上角的 **书本/铅笔图标** 切换：
- **预览模式** — 只读，适合查看
- **编辑模式** — 启用全部编辑功能

## 文件格式

表格以纯文本 Markdown 文件存储：

```markdown
---
obsidian-excel: parsed
---

```sheet
{ ... Univer workbook JSON ... }
```
```

这意味着表格完全兼容 Git 版本控制，也可以在需要时直接编辑文本。

## 技术栈

| 组件 | 技术 |
|------|------|
| 电子表格引擎 | [Univer](https://univer.ai) 0.25.x |
| 构建工具 | Vite |
| 开发语言 | TypeScript |
| XLSX 读写 | [SheetJS (xlsx)](https://sheetjs.com) |

## 开发

```bash
# 安装依赖
npm install

# 生产构建
npm run build

# 开发模式（监听变更）
npm run dev
```

构建产物输出到 `dist/main.js`、`dist/styles.css` 和 `dist/manifest.json`，并自动回写到项目根目录。

## 致谢

- [Univer](https://github.com/dream-num/univer) — 底层电子表格引擎
- [SheetJS](https://sheetjs.com) — XLSX 导入/导出支持
- [Obsidian](https://obsidian.md) — 让这一切成为可能的笔记应用

## 许可证

[MIT](LICENSE)
