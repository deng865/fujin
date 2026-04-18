

## 移动商家增加"精确/模糊位置"切换

### 现状
- **固定商家**：CreatePost 中有 `LocationPicker` 提供"精确/模糊"切换（模糊会在保存时给坐标加 ±0.01° 随机偏移）
- **移动商家**：当前没有这个选项。地图渲染时统一调用 `fuzzifyLocation`，强制对所有移动商家做 110–330m 偏移

### 目标
让移动商家在发布/编辑时也能选择：
- **精确位置**：地图显示真实实时坐标，跟随商家移动而移动
- **模糊位置**：地图显示 `fuzzifyLocation` 处理后的坐标（默认行为，保护人身安全）

### 实现方案

**1. 数据库**
新增 `posts.mobile_location_precise` (boolean, 默认 `false`) — 仅对 `is_mobile = true` 的帖子有意义。默认为模糊以保证安全。

**2. CreatePost.tsx**
当 `category && isMobile` 时，在"移动服务模式"提示卡之后新增一个简洁的双按钮切换器：
- 模糊位置（默认，推荐）— 显示安全提示
- 精确位置 — 显示风险警告："您的实时位置将公开显示，请确认安全"

把选择写入 `formData.mobileLocationPrecise`，提交时随 `mobile_location_precise` 字段一并保存。编辑模式下回填。

**3. PostMarkers.tsx**
构建 `mobileGeojson` 时，按每个 post 的 `mobile_location_precise` 决定坐标来源：
- `true` → 直接使用真实 `live_latitude/live_longitude`
- `false` → 走现有 `fuzzifyLocation` 逻辑

实时订阅已经会推送坐标更新，所以"精确模式"下图标会自然跟随商家移动。

**4. 类型**
`PostMarker` 类型增加 `mobile_location_precise?: boolean` 字段（`MapHomeContent.tsx` 的 posts 查询已 `select("*")`，无需改 SQL）。

### 涉及文件
- 新建迁移：添加 `posts.mobile_location_precise` 字段
- `src/pages/CreatePost.tsx` — 表单字段、UI 切换器、提交/编辑回填（约 30 行）
- `src/components/PostMarkers.tsx` — 按字段决定是否调用 `fuzzifyLocation`（约 5 行）
- `mem://features/mobile-fuzzy-location.md` — 更新策略说明

### 隐私默认
新建移动商家默认 `false`（模糊），用户必须主动开启精确并确认风险，符合"安全优先"原则。

