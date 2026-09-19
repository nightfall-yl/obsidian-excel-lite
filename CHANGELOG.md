# 更新日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

> 说明：本更新日志自 `26.1.1` 起维护。

## [26.1.3] - 2026-09-20

### 问题修复

- **修复：筛选功能无 UI 入口。** `UniverSheetsFilterPlugin`（后端逻辑）在 desktop / mobile preview / mobile edit 三处均已注册，但对应的 `UniverSheetsFilterUIPlugin`（工具栏筛选按钮、筛选面板）全部漏掉，导致"有引擎没驾驶室"。现已在三个 `registerPlugin` 位置成对补齐。见 `setup-univer.ts`。

### 文档

- **同步更新 README（中英双语）。** 修正版本徽章（1.0.0 → 26.1.3）、GitHub 仓库地址、Obsidian 最低版本（0.15.0+ → 1.11.0+）；移除未实际注册的"条件格式"和"数据验证"功能描述；导入/导出章节补充 `.xls` 格式和下拉菜单说明；安装路径与 git clone URL 统一为 `obsidian-excel-lite`；新增 emoji 分区与开发命令 `npm test`。

## [26.1.2] - 2026-09-19

### 新功能

- **新增 `.xls`（Excel 97-2003）格式导入与导出支持。** SheetJS 后端已原生支持 BIFF8 二进制格式，`xlsx-converter.ts` 新增 `WorkbookExportFormat` 类型，`workbookDataToXlsx()` 接受格式参数，导入通过文件扩展名自动走同一条 SheetJS 解码路径。
- **导入 / 导出按钮合并为下拉菜单。** 原工具栏 4 个独立按钮（Import XLSX、Export XLSX、Import CSV、Export CSV）收敛为 2 个 `BUTTON_SELECTOR` 下拉：导入菜单提供 `.xlsx` / `.xls` / `.csv` 三选一，导出菜单同理。命令 ID 同步细化为 `excel.{import,export}.{xlsx,xls,csv}`，i18n 补齐中英双语条目。

## [26.1.1] - 2026-09-06

### 问题修复

- **修复：Windows 暗色模式界面异常（菜单栏、状态栏、公式栏等呈白色）。** 根因是构建阶段全局剥离 `!important` 后，Tailwind 的 `dark:` 变体依赖 `:where(.univer-dark, .univer-dark *)`，该选择器特异性为 0，导致 `univer-bg-white` 与 `dark:!univer-bg-gray-800` 平手并因源码顺序而白色胜出。现改为将 `:where` 重写为 `:is`，使暗色变体特异性升至 (0,2,0)，在不引入 `!important` 的前提下稳定恢复暗色。见 `vite.config.ts`。