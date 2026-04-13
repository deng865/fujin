

# 优化 Mapbox API 调用量

## 问题分析

当前 API 用量：
- **地图加载 3,379 次**：每个 `<MapGL>` 组件实例 = 1 次计费加载
- **Directions API 4,168 次**：最大消耗源，多处频繁调用
- **Geocoding 218 次**：相对较少，但仍可优化

## 优化方案

### 1. Directions API 优化（预计减少 60-70%）

**a) TripMessage：用静态图 + 缓存替代交互地图**
- `TripMessage.tsx` 每次渲染都创建一个 `<Map>` 实例并调用 Directions API 获取路线
- 改为：首次加载后将路线 GeoJSON 缓存到 `useRef`，避免重复请求
- 组件卸载再挂载时使用缓存数据

**b) LiveLocationMap：增大防抖间隔**
- 当前 5 秒防抖，改为 **15 秒**，位置变化 < 100m 时跳过请求

**c) DriverTracking：使用 `driving` 替代 `driving-traffic`**
- `driving-traffic` 按更高价格计费，`driving` 能满足 ETA 估算需求
- 同时增大防抖最小移动阈值从 50m → 150m

**d) ChatRoom 接单：一次性调用，缓存结果**
- 接单时的 Directions 调用是一次性的，可保留但加 try-catch fallback 用 Haversine 估算

**e) TripSharePanel：仅在用户确认发送时请求**
- 当前在 from/to 坐标变化时立即请求，改为延迟到用户点击发送时才获取驾车距离

### 2. 地图加载优化（预计减少 40-50%）

**a) TripMessage：用 Mapbox Static Images API 替代交互式地图**
- 聊天中的行程消息只是展示路线，用户不需要交互
- 用静态图片 URL 替代 `<Map>` 组件，每次仅消耗 Static Images API（不计入 Map Loads）

**b) InAppNavMap：懒加载**
- 仅在用户点击"应用内导航"时才挂载地图组件，不提前加载

### 3. Geocoding 优化（预计减少 30-40%）

**a) 搜索建议增大防抖**
- ControlBar 和 SearchBar 的搜索防抖从 300ms → 500ms
- 最小查询长度从 2 → 3 个字符

**b) 反向地理编码缓存**
- 在 ChatRoom 中为已解析过的坐标添加内存缓存，避免对同一位置重复请求

## 改动文件汇总

| 文件 | 优化内容 |
|------|----------|
| `src/components/chat/TripMessage.tsx` | 静态图替代交互地图 + 路线缓存 |
| `src/components/chat/LiveLocationMap.tsx` | 防抖 5s → 15s，移动阈值增大 |
| `src/components/chat/DriverTracking.tsx` | `driving-traffic` → `driving`，移动阈值 50m → 150m |
| `src/components/chat/TripSharePanel.tsx` | 延迟到发送时才请求 Directions |
| `src/components/SearchBar.tsx` | 防抖 300ms → 500ms，最小字符 3 |
| `src/components/ControlBar.tsx` | 防抖 300ms → 500ms，最小字符 3 |
| `src/pages/ChatRoom.tsx` | 反向地理编码缓存 |

