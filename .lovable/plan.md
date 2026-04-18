

## 移动商家位置网格锚定 + 模糊化方案

### 目标
彻底切断"圆心 = 真实坐标"的关联，让圆心只表达"商家在某个网格附近"，从根本上保护移动商家的人身安全。

### 双层模糊策略

**第 1 层：500m 网格锚定（主防护）**
- 将地球表面划分为约 500m × 500m 的虚拟网格
- 商家真实坐标落在哪个网格 → 圆心吸附到该网格的中心点
- 只要商家不跨越网格边界，圆心绝对静止（即使商家在网格内移动 400m，地图上圆心不动）

**第 2 层：每 10 分钟轮转的随机偏移（叠加扰动）**
- 在网格中心基础上叠加一个 0.001°~0.003°（约 110m~330m）的随机偏移
- 偏移量基于 `(grid_id + 10分钟时间槽)` 哈希生成 → 同一网格在同一 10 分钟窗口内偏移恒定（避免抖动），跨窗口自动轮转

### 实现位置：纯前端计算（`PostMarkers.tsx`）

不改数据库（数据库继续保存真实 `live_latitude/longitude` 用于订单成交后展示精确位置），仅在地图渲染层做模糊化。

### 新增工具函数 `src/lib/fuzzyLocation.ts`

```typescript
// 500m ≈ 0.0045° 纬度；经度按 cos(lat) 修正
const GRID_SIZE_DEG = 0.0045;
const ROTATION_WINDOW_MS = 10 * 60 * 1000;

export function snapToGrid(lat: number, lng: number) {
  const gridLat = Math.floor(lat / GRID_SIZE_DEG) * GRID_SIZE_DEG + GRID_SIZE_DEG / 2;
  const lngStep = GRID_SIZE_DEG / Math.cos(lat * Math.PI / 180);
  const gridLng = Math.floor(lng / lngStep) * lngStep + lngStep / 2;
  return { gridLat, gridLng, gridId: `${Math.round(gridLat*1e5)}_${Math.round(gridLng*1e5)}` };
}

// 确定性伪随机：同 gridId + 同 10 分钟窗口 → 同偏移
function seededRandom(seed: string) { /* 简单 hash → [0,1) */ }

export function fuzzifyLocation(lat: number, lng: number, postId: string) {
  const { gridLat, gridLng, gridId } = snapToGrid(lat, lng);
  const window = Math.floor(Date.now() / ROTATION_WINDOW_MS);
  const seed = `${gridId}_${postId}_${window}`;
  const r1 = seededRandom(seed + "_lat");
  const r2 = seededRandom(seed + "_lng");
  // 0.001° ~ 0.003° 偏移，随机正负
  const offLat = (0.001 + r1 * 0.002) * (r1 > 0.5 ? 1 : -1);
  const offLng = (0.001 + r2 * 0.002) * (r2 > 0.5 ? 1 : -1);
  return { lat: gridLat + offLat, lng: gridLng + offLng };
}
```

### `PostMarkers.tsx` 改造
1. 构建 `mobileGeojson` 时，对每条移动帖子调用 `fuzzifyLocation(post.live_lat, post.live_lng, post.id)`，用结果替换坐标
2. 新增 `useEffect` 每 60s 重新计算一次 mobileGeojson 并 `setData`，确保 10 分钟窗口切换时圆心自动跳到下一个偏移位置（不影响同窗口内的稳定性）
3. 圆形半径与服务区视觉保持现状（500m 模糊圈仍能覆盖商家所在的 500m 网格 + 偏移范围）

### 涉及文件
- 新建 `src/lib/fuzzyLocation.ts` — 网格吸附 + 确定性偏移工具（约 40 行）
- `src/components/PostMarkers.tsx` — 移动商家坐标接入模糊化、定时刷新（约 15 行改动）

### 预期效果
- 商家在网格内移动：地图圆心**纹丝不动**
- 商家跨越网格：圆心跳到新网格中心 + 新偏移
- 每 10 分钟：所有移动商家的偏移量自动轮转，进一步混淆历史观察者
- 真实坐标永不出现在地图渲染层，仅在订单成交场景按需展示

