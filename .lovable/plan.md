
## 问题分析

用户反馈两个核心问题：
1. **方向反了**：放大地图（zoom in）时，搜索范围数字应该变小（覆盖范围更小），但实际出现"先变小再变大"的异常波动。
2. **数值不准**：按钮显示的英里数与实际可见的"以中心为半径的圆"不匹配。

## 根因

查看 `MapHome.tsx` 中现有的 `radiusToZoom` 和 `boundsToRadius`：

```ts
function radiusToZoom(radiusMi, lat) {
  return Math.log2((C * Math.cos(lat)) / (2 * radiusMi));
}
function boundsToRadius(map) {
  // 取 latRadius 和 lngRadius 的最小值
  return Math.round(Math.min(latRadius, lngRadius));
}
```

**问题1（反向波动）**：
- `radiusToZoom` 假设半径 = 地图**宽度的一半**（经度方向）
- `boundsToRadius` 取**较短轴的一半**（手机竖屏时是宽度，横屏时是高度）
- 在当前 1157×889 的横屏视口中，**高度更短** → bounds 反推时取纬度方向半径（较小值）
- 默认初始化用 10mi 计算 zoom（基于宽度），但 onMoveEnd 立刻用更短的高度反推 → 显示约 7-8mi
- 用户放大时，宽度方向缩小得快，最短轴可能切换到宽度，造成数值跳动

**问题2（语义不准）**：
按钮上的"搜索范围"应表示"以我为中心的圆形可达半径"，正确语义应是 **bounds 较短轴的一半**——这样这个圆才能完整地显示在屏幕内。当前 `radiusToZoom` 与此不一致。

## 修复方案

统一两个函数的几何定义为：**radius = 地图较短可见轴的一半**。

### 修改 `src/pages/MapHome.tsx`

**1. 重写 `radiusToZoom`** — 接收地图容器尺寸，按较短轴计算：

```ts
function radiusToZoom(radiusMi, lat, mapEl?) {
  const w = mapEl?.clientWidth ?? window.innerWidth;
  const h = mapEl?.clientHeight ?? window.innerHeight;
  const shortPx = Math.min(w, h);
  const longPx = Math.max(w, h);
  // 基础公式：假设 radius 占满宽度一半
  const baseZoom = Math.log2((C * Math.cos(latRad)) / (2 * radiusMi));
  // 修正：让较短轴恰好等于 radius*2
  return baseZoom + Math.log2(shortPx / longPx);
}
```

**2. 保持 `boundsToRadius` 用 `Math.min`** — 与新公式语义一致

**3. 调用处传入容器** — `mapRef.current?.getMap().getContainer()` 传给 `radiusToZoom`

**4. 修复 `handleMoveEnd` 防抖处理初始化时序** — 确保第一次 fetchPosts 后不会立即用错误的容器尺寸覆盖初始 10mi

### 验证逻辑

- **默认 10mi**：地图较短轴方向恰好覆盖 20mi 直径（半径 10mi 的圆完全可见）
- **放大地图**：bounds 收缩 → 较短轴半径单调减小 → 按钮数字单调下降，无跳动
- **拖动滑块到 5mi**：flyTo 让较短轴半径 = 5mi
- **横竖屏切换**：基于实时容器尺寸计算，始终准确

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/MapHome.tsx` | 重写 `radiusToZoom` 加入容器宽高比修正；调用处传入 map 容器元素 |
