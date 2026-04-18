

## 理解需求

用户在截图上画了两个圈，标出要**移除**的两块白色空白：

1. **抽屉底部到 BottomNav 之间的横条**：抽屉 `bottom: calc(72px + safe-area)` 把抽屉推得离 BottomNav 太高，中间露出地图（看起来像白条）
2. **BottomNav 图标下方的整块白条**：safe-area filler 撑开了 ~34px 的纯白区域

## 根因

- `BottomNav.tsx`：独立的 safe-area filler `<div>`（67-72 行）+ 容器 `paddingBottom: calc(env(safe-area-inset-bottom) * 0.4)` → 图标下方有大块白色
- `MapListSheet.tsx`：抽屉 `bottom` 偏移过大，与 BottomNav 之间留缝

## 方案

### BottomNav
- **删除** safe-area filler `<div>`（67-72 行整段）
- 容器 `paddingBottom` 从 `* 0.4` 改为 `* 0.15`，让图标几乎贴底
- 按钮 `py-2` → `py-1.5`，紧凑高度

### MapListSheet
- 抽屉 `bottom` 从 `calc(72px + env(safe-area-inset-bottom))` 改为 `calc(56px + env(safe-area-inset-bottom) * 0.15)`，与新 BottomNav 高度对齐，消除中间缝隙

## 改动清单

| 文件 | 改动 |
|------|------|
| `src/components/BottomNav.tsx` | 删 safe-area filler；padding 系数 0.4→0.15；按钮 py-2→py-1.5 |
| `src/components/MapListSheet.tsx` | `bottom` 偏移与 BottomNav 新高度对齐 |

## 验证

iPhone 16：图标贴近 Home Indicator，下方无白条；抽屉底部紧贴 BottomNav 顶部，无中间缝隙。

