

# 改造"发送我的位置"消息样式

## 需求理解

用户想要把"发送我的位置"功能改为：
1. 地图预览上用**发送者的头像**作为标记（替代红色 pin 图标）
2. **不显示对方位置**（纯静态位置卡片）
3. 地图预览下方添加一个**跳转按钮**，点击直接打开 Google 地图（Android）或 Apple 地图（iOS），不再打开应用内全屏导航地图

## 当前实现

- `LocationMessage.tsx`：点击地图预览 → 打开 `InAppNavMap` 全屏导航
- 地图预览用 Mapbox Static API 的红色 pin 标记
- `InAppNavMap` 内部还会获取用户位置、画路线等（不需要了）

## 修改方案

### 文件 1: `src/components/chat/LocationMessage.tsx`

1. **新增 `senderAvatarUrl` prop** — 传入发送者头像 URL
2. **地图预览标记改为头像** — 使用 Mapbox Static API 的 custom marker（头像 URL 编码后作为 marker icon），或者改用简单方案：在静态地图预览上叠加一个头像 `<div>`
3. **移除点击打开 InAppNavMap 的逻辑** — 不再需要全屏导航
4. **底部添加"在地图中打开"按钮** — iOS 跳转 Apple Maps，Android 跳转 Google Maps（复用 `InAppNavMap` 已有的 UA 判断逻辑）

最终 LocationMessage 结构：
```
┌──────────────────────┐
│  地图静态预览          │
│    [发送者头像标记]     │
├──────────────────────┤
│ 📍 xxx的位置          │
│    地址文本            │
├──────────────────────┤
│ 🗺️  在地图中打开  →   │  ← 点击跳转外部地图
└──────────────────────┘
```

### 文件 2: `src/pages/ChatRoom.tsx`（约第 1239 行）

- 传入发送者头像：`isMe` 时传 `myAvatarUrl`，否则传 `otherUser?.avatar_url`

## 技术细节

- 头像叠加方案：在地图预览 `<img>` 上用 `absolute` 定位放一个圆形头像（比用 Mapbox marker URL 编码更可靠）
- 外部地图跳转链接：iOS → `https://maps.apple.com/?ll=lat,lng&q=地址`，Android → `https://www.google.com/maps/search/?api=1&query=lat,lng`
- 可以完全移除 `InAppNavMap` 的 import（如果没有其他地方使用的话保留文件）

