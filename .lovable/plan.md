

## 需求

1. **永不遮挡**：抽屉顶部的"附近 N 个结果"标题行必须始终完全可见，不能被地图按钮（搜索框、刷新、定位）或系统状态栏遮挡
2. **上滑即弹出**：用户在地图或抽屉顶部向上滑动时，抽屉自动平滑展开到更高档位

## 当前实现分析

需要读 `MapListSheet.tsx`、`MapHomeContent.tsx`、`ControlBar.tsx`、`MapControls.tsx` 来确认：
- 抽屉 peek 档位高度（标题行是否完全在 peek 高度内）
- 地图按钮（ControlBar 顶部搜索/MapControls 右侧浮动按钮）的 z-index 与抽屉 z-index 关系
- 是否有手势监听绑定到地图层

## 方案

### 1. 标题行永不被遮挡

- **抽屉 z-index 提升至最高层**（高于 ControlBar 的搜索框、MapControls 的浮动按钮），确保标题行覆盖在所有地图控件之上
- **peek 档位高度调整**：确保 peek 高度 ≥ 标题行 + 拖拽 handle 总高度（约 64-72px），让标题行完整露出
- **顶部状态栏避让**：抽屉始终在屏幕底部，与状态栏无冲突；但要确认 MapControls 的浮动按钮（定位、图层、罗盘）的底部偏移 (`bottomOffset={sheetHeight}`) 已经正确联动，按钮不会浮到抽屉标题行之上覆盖它
- **MapControls 已联动**（看到 `bottomOffset={sheetHeight}`），需确认 ControlBar 顶部搜索框不与抽屉标题冲突——它在屏幕顶部，抽屉在底部，物理上不会重叠

### 2. 上滑自动弹出

- **抽屉顶部（标题行 + handle）已能响应拖拽**（上次改动已完成），上滑触发档位切换
- **新增：地图区域的上滑手势捕获**——在地图容器上监听 `touchmove`，当检测到向上滑动且距离 > 阈值（如 30px）时，自动把抽屉档位从 peek → preview，再上滑 → full
- 注意不要破坏地图自身的平移/缩放手势：只在**双指未触发缩放、单指竖直方向滑动量 > 水平方向**且**起点在屏幕下半部分**时才触发抽屉弹出，避免误伤地图浏览

## 改动清单

| 文件 | 改动 |
|------|------|
| `src/components/MapListSheet.tsx` | 抽屉外层 `z-index` 提升到最高（高于 ControlBar/MapControls）；确保 peek 档位高度足够显示完整标题行 |
| `src/components/map/MapHomeContent.tsx` | 在地图容器外层包一层手势监听，单指竖直上滑且满足条件时调用抽屉的"展开下一档"方法 |
| `src/components/MapListSheet.tsx` | 暴露一个 `expandToNext()` 方法（或通过 ref/回调）供 MapHomeContent 触发 |

## 验证

- peek 档位下，标题"附近 N 个结果"完整可见，不被任何地图按钮覆盖
- 在地图上单指上滑 → 抽屉自动从 peek 展开到 preview
- 在抽屉标题行上滑 → 同样展开（已有功能）
- 地图的双指缩放、单指平移仍正常工作

