

# 修复分类相关的三个问题

## 问题分析

### 问题 1：管理后台分类配置页面无法滚动
全局 CSS 设置了 `html, body { overflow: hidden }`，管理后台的外层容器使用 `min-h-screen`，导致内容溢出但滚动容器计算异常。需要改为 `h-screen overflow-hidden`，让内部 `main` 的 `overflow-y-auto` 正确生效。

### 问题 2：前端"全部分类"面板最后一项被底部导航栏遮挡
全屏分类面板 z-index 为 50，底部导航栏 z-index 为 999。底部导航浮在面板之上，遮挡最后几个分类项。需要提高面板 z-index 并添加底部内边距。

### 问题 3：不知道如何添加子分类
管理后台虽有"父级分类"下拉框，但不够直观。需要在每个顶级分类行添加"添加子分类"快捷按钮。

## 改动方案

### 文件 1：`src/pages/AdminPortal.tsx`
- 外层容器从 `min-h-screen` 改为 `h-screen overflow-hidden`，修复滚动问题
- 每个顶级分类行增加"添加子分类"按钮（FolderPlus 图标），点击自动预填父级分类下拉框并聚焦到添加表单

### 文件 2：`src/components/CategoryScroll.tsx`
- 全屏分类面板 z-index 从 50 提升到 1000（高于 BottomNav 的 999）
- 分类列表底部添加 `pb-20` 内边距，确保最后一项不被遮挡

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/AdminPortal.tsx` | 修复滚动 + 添加子分类快捷按钮 |
| `src/components/CategoryScroll.tsx` | 提升 z-index + 底部内边距 |

