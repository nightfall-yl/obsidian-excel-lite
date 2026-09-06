# 更新日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

> 说明：本更新日志自 `26.1.1` 起维护。

## [26.1.1] - 2026-09-06

### 问题修复

- **修复：Windows 暗色模式界面异常（菜单栏、状态栏、公式栏等呈白色）。** 根因是构建阶段全局剥离 `!important` 后，Tailwind 的 `dark:` 变体依赖 `:where(.univer-dark, .univer-dark *)`，该选择器特异性为 0，导致 `univer-bg-white` 与 `dark:!univer-bg-gray-800` 平手并因源码顺序而白色胜出。现改为将 `:where` 重写为 `:is`，使暗色变体特异性升至 (0,2,0)，在不引入 `!important` 的前提下稳定恢复暗色。见 `vite.config.ts`。

### 工程与代码质量

- **升级版本号至 `26.1.1`**，构建同步更新 `manifest.json`。