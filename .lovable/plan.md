

## 修复"精确位置"两个 bug

### 问题 1：显示的不是精确位置
**根因**：在 `CreatePost.tsx` 中，移动商家保存的 `latitude/longitude` 是用户在 `LocationPicker` 中**手动选择**的位置（或当前 GPS 一次性快照），而不是真实实时位置。即使勾选了"精确"，地图初始也只能显示这个静态坐标，直到 `useMobileTracking` 后台首次上报 `live_*` 坐标。如果用户发布完后没有打开 App / 没有移动超过 30m，`live_*` 永远不会更新。

需要确认 `useMobileTracking` 是否真正在跑、是否在精确模式下成功写入了 `live_latitude/live_longitude`。

### 问题 2：放大地图时移动商家图标消失
**根因推测**：`PostMarkers.tsx` 中移动商家用 Mapbox **GeoJSON layer** 渲染（`posts-mobile-center-icon` 等）。常见消失原因：
- `cluster: true` 在高 zoom 下展开后某些 feature 落到非 source 边界
- icon-image 在某些 zoom level 没加载，导致 layer 渲染空
- `paint`/`layout` 中带 `interpolate(["zoom"], …)`，高 zoom 时大小变 0
- 与 `posts-points`（固定商家 layer）的 filter 冲突，把移动商家的精确坐标也匹配进了 cluster 然后被过滤掉

需要查看 `PostMarkers.tsx` 的实际 layer 定义、cluster 配置和 zoom 表达式才能定位。

### 调查步骤（需切换到默认模式才能改代码）
1. 读 `src/components/PostMarkers.tsx` 完整内容（mobile layer 定义、cluster、zoom 表达式）
2. 读 `src/pages/CreatePost.tsx` 中 mobile + precise 的提交分支，确认 `live_latitude/live_longitude` 是否正确填入
3. 读 `src/hooks/useMobileTracking.ts`，确认精确模式下的写入逻辑
4. 用 SQL 查一条最近发布的精确移动帖子，对比 `latitude` vs `live_latitude` 的差距和 `live_updated_at`

### 修复方案
**问题 1**：
- CreatePost 提交精确移动帖子时，**忽略** `LocationPicker` 选的坐标，强制用 `navigator.geolocation.getCurrentPosition({enableHighAccuracy: true})` 拿一次真实当前位置同时写入 `latitude/longitude/live_latitude/live_longitude`
- 确保 `MobileTrackingProvider` 在发布后立刻刷新 posts 列表（已通过 realtime 订阅做了，验证生效）

**问题 2**（待读代码后定稿，预案）：
- 移除 mobile layer 上的 `cluster` 或排除移动 source 进 cluster
- 检查 icon-size / icon-allow-overlap 在高 zoom 是否被表达式压缩为 0
- 确保 mobile 精确帖子的 feature 不被 fixed-layer filter 吃掉

### 涉及文件
- `src/pages/CreatePost.tsx`（精确模式下强制使用真实 GPS）
- `src/components/PostMarkers.tsx`（修复高 zoom 消失的 layer 配置）
- 可能 `src/hooks/useMobileTracking.ts`（验证写入正常）

