# 依赖升级计划：SheetJS 安全升级 + Univer 版本升级

## 背景

当前项目存在两个高优先级依赖问题：

1. **SheetJS (xlsx) 安全风险**：`xlsx@0.18.5` 是发布到 npm 的最后一个版本，存在已知 CVE：

   - CVE-2023-30533：原型污染

   - CVE-2024-22363：ReDoS 拒绝服务
     修复版本从未发布到 npm registry。

2. **Univer 版本落后**：所有 `@univerjs/*` 包固定在 `0.22.0`，最新版本为 `0.25.1`（即将发布 1.0），落后三个大版本，缺失大量 bug 修复和性能优化。

## 方案

### Phase 1: SheetJS 安全升级（低风险，零源码修改）

**方案**：将 `xlsx` 替换为 `@stackline/xlsx`（维护中的 fork，基于 SheetJS 0.20.3，已修复安全漏洞，API 完全兼容）。使用 npm alias 语法，不修改源码。

- 修改 `package.json`：`"xlsx": "^0.18.5"` → `"xlsx": "npm:@stackline/xlsx@^1.0.6"`

- 执行 `npm install` + `npm run build`

- 验证构建成功，手动测试导入/导出功能

### Phase 2: Univer 0.22.0 → 0.25.1（高风险，需迭代修复）

**方案**：将所有 30 个 `@univerjs/*` 包版本从 `0.22.0` 统一升级到 `0.25.1`，然后迭代修复编译错误。

**可能出问题的模块**（按概率排序）：

| 模块          | 文件                                   | 预期变化                                                                 |
| ----------- | ------------------------------------ | -------------------------------------------------------------------- |
| Authz 接口    | `MockAuthzService.ts`                | `IAuthzIoService` 接口可能新增/变更方法签名                                      |
| FUniver API | `univer-facade.d.ts`, `SheetView.ts` | 事件系统、生命周期、dispose 方法可能变化                                             |
| 插件注册        | `setup-univer.ts`                    | 插件构造参数、注册选项可能变化                                                      |
| 菜单/组件       | `ImportExportPlugin.ts`              | `IMenuManagerService`、`MenuItemType` 等 API 可能变化                      |
| 暂未使用的依赖     | 无源码引用                                | `sheets-conditional-formatting-ui`、`sheets-data-validation-ui` 可安全移除 |
| 子路径导出       | `global.d.ts`                        | locale 导入路径 `@univerjs/*/lib/es/locale/*` 可能变化                       |
| Facade 导入   | `setup-univer.ts`                    | `@univerjs/*/facade` 子路径可能被移除                                        |

## 执行步骤

```
Step 1: 修改 package.json (xlsx → npm:@stackline/xlsx@^1.0.6)
Step 2: npm install + npm run build (预期成功)
Step 3: 修改 package.json (30 个 @univerjs/* 包 0.22.0 → 0.25.1)
Step 4: 清理安装: rm -rf node_modules package-lock.json && npm install
Step 5: npm run build (预期失败，进入迭代修复)
Step 6: 根据编译错误逐个修复 (MockAuthzService → univer-facade.d.ts → setup-univer.ts → ...)
Step 7: 重复 Step 5-6 直到构建成功
Step 8: 在 Obsidian 中完整测试
```

## 验证方式

1. `npm run build` 成功，无 TypeScript 错误
2. `main.js` 和 `styles.css` 输出正常
3. 手动测试 Obsidian 中：打开 .sheet.md、导入 xlsx、导出 xlsx、公式、排序筛选、嵌入链接

