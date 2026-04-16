

## 问题分析

用户反馈：顶部搜索范围按钮（ControlBar 上显示的 `XXmi`）与地图实际可见范围不一致。默认应是 10 英里。

## 根因排查

查看 `MapHome.tsx` 中的逻辑：

1. **初始化**：`initialViewState` 用 `radiusToZoom(10, center.lat)` 计算 zoom，center 默认是 Dallas (32.77)。`searchRadius` state 初始值也是 10 ✓

2. **`boundsToRadius` 函数**：取地图可见边界，用 `Math.min(latRadius, lngRadius)`（取较短轴的一半）作为半径。

3. **`radiusToZoom` 函数**：基于经度方向 `Math.cos(lat)` 计算 zoom，假设半径覆盖地图宽度的一半。

**不一致根源**：
- `radiusToZoom` 计算的是 **经度方向半径 = 地图宽度/2** 的 zoom
- 但 `boundsToRadius` 取的是 **较短轴**（在横屏宽容器上是纬度方向，即高度的一半）
- 横屏（1157×889）下，地图高度 < 宽度，所以纬度半径 < 经度半径，`Math.min` 取到纬度方向的半径
- 导致：用 10mi 计算的 zoom，反向通过 bounds 算出的半径 ≈ 高度对应的距离，比 10 小

另外 `handleMoveEnd` 中通过 `boundsToRadius` 反推半径并 `setSearchRadius`，会在地图加载完成后立即覆盖初始的 10mi 值，让按钮显示 6-7mi 之类的"实际"较短轴数值。

## 修复方案

让 `radiusToZoom` 和 `boundsToRadius` 使用**相同的几何定义**——都基于"地图较短轴的一半"作为可见半径。

### 修改 `src/pages/MapHome.tsx`

1. **改 `radiusToZoom`**：根据当前地图容器宽高比，将 radius 视为较短轴一半。需要从 mapRef 获取容器尺寸，或者保守地使用一个略小的缩放系数（让 10mi 半径完整可见）。

   简化方案：`radiusToZoom` 计算时假设半径等于"地图较短维度的一半"。在地图加载前用窗口宽高比估算；加载后调用 `map.getContainer()` 取真实尺寸。

2. **保持 `boundsToRadius` 用 `Math.min`** —— 与显示逻辑一致：用户看到的"可达半径"就是较短轴的一半。

3. **核心公式调整**：
   ```ts
   function radiusToZoom(radiusMi, lat, mapEl?) {
     const w = mapEl?.clientWidth ?? window.innerWidth;
     const h = mapEl?.clientHeight ?? window.innerHeight;
     const shortSidePx = Math.min(w, h);
     const longSidePx = Math.max(w, h);
     // 基础 zoom 假设 radius = 宽度一半（经度方向）
     const baseZoom = Math.log2((C * Math.cos(latRad)) / (2 * radiusMi));
     // 如果较短轴是高度（横屏），需要按 h/w 比例放大 radius，相当于减小 zoom
     const ratio = shortSidePx / longSidePx;
     return baseZoom + Math.log2(ratio); // 在矩形地图上让短轴等于 radius*2
   }
   ```

4. **应用位置**：所有调用 `radiusToZoom` 的地方传入 `mapRef.current?.getMap().getContainer()`。

### 验证逻辑

修复后：
- 默认 10mi → 计算出更小的 zoom → 地图较短轴方向覆盖 20mi（半径 10mi）
- `handleMoveEnd` 反推时也得到 10mi，按钮维持 10mi
- 拖动滑块到 5mi → 地图 flyTo 更高的 zoom，短轴半径恰为 5mi
- 缩放/平移地图 → bounds 短轴半径准确同步到按钮

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/MapHome.tsx` | 修改 `radiusToZoom` 加入容器宽高比修正；调用处传入 map 容器 |

