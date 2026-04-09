

# 所有场景中用头像代替位置标记点

## 现状分析

| 场景 | 当前效果 | 需要改动 |
|------|---------|---------|
| 主页地图 (MapHome) | Mapbox 默认蓝色圆点 (`GeolocateControl`) | ✅ 需要改 |
| 发送位置/导航地图 (InAppNavMap) | 蓝色小圆圈 `Marker` | ✅ 需要改 |
| 实时位置共享 (LiveLocationMap) | 已使用头像 | ❌ 不需要改 |

## 修改方案

### 共享：创建头像 Marker 组件
新建 `src/components/AvatarMarker.tsx`，封装用户头像圆形标记，带蓝色边框和阴影，可复用于所有地图场景。

### Step 1: MapHome — 用头像替代蓝点
- 获取当前用户的 `avatar_url`（已有 `user` state，补充查询 profile）
- 移除 `GeolocateControl` 的 `showUserLocation`，保留 `trackUserLocation` 用于获取坐标
- 监听 `geolocate` 事件获取用户坐标，存入 state
- 用 `<Marker>` + `<AvatarMarker>` 渲染头像到用户位置

### Step 2: InAppNavMap — 用头像替代蓝圈
- 传入 `myAvatarUrl` prop（从 ChatRoom 传递，已有 `myAvatarUrl` state）
- 将第 93-95 行的蓝色圆点替换为 `<AvatarMarker>`

### Step 3: LocationMessage — 传递 avatarUrl
- 从 ChatRoom 向 LocationMessage/InAppNavMap 传递 `myAvatarUrl`

## 修改文件清单
- **新建** `src/components/AvatarMarker.tsx` — 可复用头像标记组件
- `src/pages/MapHome.tsx` — 替换 GeolocateControl 蓝点为头像
- `src/components/chat/InAppNavMap.tsx` — 接收 avatarUrl prop，替换蓝圈
- `src/components/chat/LocationMessage.tsx` — 传递 avatarUrl 到 InAppNavMap
- `src/pages/ChatRoom.tsx` — 向 LocationMessage 传递 myAvatarUrl

