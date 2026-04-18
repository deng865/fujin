

## 两个问题修复

### 问题 1 — 我的发布状态文案错误
当前 `MyPostsList.tsx` 显示「服务中 / 已下班」，用户要求改回「在线 / 离线」。

**修复**（`src/components/profile/MyPostsList.tsx`）：
- 移动商家状态文字统一为「🟢 在线 / 🔴 离线」
- 固定商家保持「🟢 营业中 / 🔴 已打烊」
- 保留「⏰ 已定时」徽章和定时锁定逻辑（点击上线时定时下班期仍提示）

### 问题 2 — 地图商家图标未默认展示
当前 `PostMarkers.tsx` 用了 GeoJSON + Symbol 图层 + sprite 注册逻辑，但 sprite 是异步加载的（`ensureIconSprite` 通过 `Image.onload` 才注册到 map），首次渲染时图标尚未就绪，只显示彩色圆点；用户点击后由于 DOM Marker（selected）才看到图标。

**根因**：sprite 注册依赖 `<img>` 异步加载 → map symbol layer 找不到 image → 静默不渲染图标。且 sprite 注册完成后没有触发 source 重绘。

**修复**（`src/components/PostMarkers.tsx`）：
1. `ensureIconSprite` 完成后调用 `map.triggerRepaint()` 强制重绘 symbol layer。
2. 在 useEffect 中，当 `catMap` 变化时，确保所有用到的图标在 sprite 注册完成后再触发一次 source data 更新（通过 setData 或 triggerRepaint）。
3. 监听 map 的 `styleimagemissing` 事件，作为兜底：当 symbol 找不到 image 时按需注册对应 sprite。

### 涉及文件
- `src/components/profile/MyPostsList.tsx` — 状态文案改回「在线/离线」（约 4 行）
- `src/components/PostMarkers.tsx` — sprite 加载完成后触发重绘 + styleimagemissing 兜底（约 20 行）

### 预期效果
- 我的发布页：移动商家显示「🟢 在线 / 🔴 离线」，固定商家显示「🟢 营业中 / 🔴 已打烊」，定时徽章和锁定逻辑保留。
- 地图首次加载时，所有商家标记直接显示对应分类的白色 Lucide 图标（在彩色圆背景上），无需点击。

