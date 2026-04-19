

## 真正的根因：地图查询缺字段

`MapHomeContent.tsx` 第 155 行的 posts SELECT 列表里**没有包含 `mobile_location_precise`**：

```
.select("id, title, ..., live_latitude, live_longitude, live_updated_at, user_id")
```

后果：
1. 每个移动商家在 `PostMarkers` 中 `post.mobile_location_precise` 都是 `undefined` → 全部走 `fuzzifyLocation` 偏移分支 → 用户即使选了"精确位置"，地图上看到的仍是模糊偏移坐标（与真实位置差 110–330m）
2. 由于 `hasFuzzyMobile` 永远为 true，`fuzzyTick` 每 60 秒触发一次 → `mobileGeojson` 重算 → Mapbox source 整体替换 → 在用户**正好放大**的瞬间 source 被替换，symbol layer 短暂为空 → **图标消失**

### 修复方案

**1. `src/components/map/MapHomeContent.tsx`**
- 在 posts 查询的 SELECT 中加入 `mobile_location_precise`
- 在 realtime UPDATE 处理中也保留该字段（payload.new 已包含全字段，无需额外动作；但 `setPosts` 合并时要保留）
- 在 `Post` 接口中加 `mobile_location_precise?: boolean`

**2. （加固）`src/components/PostMarkers.tsx`**
- 即便有 fuzzy 商家，也避免每分钟整个 source 被重算导致图标闪烁。把 `effectiveTick` 从 source data deps 中移除，改为：仅当 tick 变化时**对模糊 features 重算坐标**——但更稳妥的做法是把模糊偏移改为**只在挂载和真实坐标变化时计算**，移除 60 秒 tick 引发的全局 source 替换。
- 具体做：删除 `fuzzyTick` 定时器的 `setState`（或保留但不参与 mobileGeojson deps），让模糊位置在该 post 的 `live_*` 真实变化时才重算（`fuzzifyLocation` 内部会按当前 10 分钟窗口取偏移，但既然商家没移动，让图标稳定也没安全损失——商家移动时，`live_*` 推送会触发重算）。

这两步修完：
- 精确商家显示真实位置（跟随实时上报移动）
- 模糊商家显示稳定的偏移位置，不再每分钟闪烁
- 缩放时图标不再消失

### 涉及文件
- `src/components/map/MapHomeContent.tsx`（SELECT 增字段、Post 接口加字段，约 3 行）
- `src/components/PostMarkers.tsx`（移除 fuzzyTick 引发的 source 重算，约 5 行）

