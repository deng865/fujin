

## 两个改动

### 1. 固定商家状态需根据营业时间动态变化
当前 `MyPostsList.tsx` 固定商家显示固定的「营业中/已打烊」文案，未跟随实际营业时间。

**修复**：引入 `isCurrentlyOpen(post.operating_hours)` 判断，固定商家：
- 营业时段 → 「🟢 营业中」
- 非营业时段 → 「🔴 已打烊」
- 未配置营业时间 → 沿用 `is_visible` 字段

### 2. 移动商家地图上显示模糊服务区域
当前 `PostMarkers.tsx` 移动商家显示精确点位（live_latitude/longitude）。需改为：
- 移动商家在地图上显示一个圆形的「服务区域」（半径约 500m），不显示精确图标点
- 圆心位置用真实坐标，但通过半径模糊化
- 订单成交后（暂不实现这部分流程，仅做地图展示层），由其他场景显示精确位置

**实现**：
- 在 `PostMarkers.tsx` 中将 posts 拆分为 `mobilePosts` 和 `fixedPosts` 两组
- 固定商家维持现有 GeoJSON + symbol 图层（精确点 + 图标）
- 移动商家用独立的 GeoJSON Source + Circle Layer 渲染半径 500m 的半透明圆（用 `circle-radius` 配合 zoom 插值，或使用 turf.js 生成实际地理圆 polygon）。为简单起见使用 `circle` 图层 + zoom-based radius 插值
- 移动商家圆形中心放置一个小图标点（仍使用分类色），但不展示精确符号
- 点击圆形或中心点 → 触发 `onSelectPost`

### 涉及文件
- `src/components/profile/MyPostsList.tsx` — 固定商家状态跟随营业时间（约 6 行）
- `src/components/PostMarkers.tsx` — 移动商家改为模糊圆形服务区（约 60 行）

### 预期效果
- 我的发布页固定商家状态实时反映营业时间（开店/打烊）
- 地图上移动商家不再显示精确位置点，而是显示一个分类色的半透明圆形区域，保护移动商家的精确位置隐私

