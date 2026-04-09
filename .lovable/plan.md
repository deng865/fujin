

# 修复：实时位置共享看不到对方位置

## 根因

`LiveLocationBanner`（line 102）和 `ChatRoom`（line 248）都订阅了同名频道 `live-loc-${conversationId}`。Supabase 不允许同一个客户端重复订阅同名频道，导致 ChatRoom 的监听器静默失败，永远收不到对方的坐标广播。

## 修复方案

**核心思路**：Banner 已经成功订阅了频道，让 Banner 同时监听对方的广播，通过回调传给 ChatRoom，不再在 ChatRoom 中重复订阅。

### Step 1: LiveLocationBanner 增加监听对方位置

**文件**: `src/components/chat/LiveLocationBanner.tsx`

- 新增 `onOtherPositionUpdate` prop：`(pos: { lat: number; lng: number }) => void`
- 新增 `otherUserId` prop
- 在频道订阅的回调中（`ch.subscribe` 之前），添加 `ch.on("broadcast", { event: "live-location" }, ...)` 监听
- 收到广播时，如果 `payload.userId !== userId`（即来自对方），调用 `onOtherPositionUpdate`

### Step 2: ChatRoom 移除重复频道订阅

**文件**: `src/pages/ChatRoom.tsx`

- **删除** line 246-258 的 `useEffect`（`live-loc-${conversationId}` 监听器）
- 在渲染 `LiveLocationBanner` 时传入新 props：
  - `otherUserId={otherUserId}`
  - `onOtherPositionUpdate={(pos) => setOtherCachedPos(pos)}`

## 修改文件
- `src/components/chat/LiveLocationBanner.tsx` — 增加对方位置监听 + 2个新 props
- `src/pages/ChatRoom.tsx` — 删除重复频道订阅，传递新 props

