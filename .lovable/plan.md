

# 修复实时位置共享：显示"已结束"和看不到双方位置

## 问题根因

1. **频道冲突**：`LiveLocationMap` 在第 142 行创建了一个与 `LiveLocationBanner` 同名的 Supabase 频道 (`live-loc-${conversationId}`)。Supabase 客户端不允许同名频道重复订阅，导致其中一个静默失败 → 收不到对方坐标。
2. **第一个频道无用**：Map 的第一个频道 `live-loc-map-${conversationId}-${Date.now()}` 名称唯一，但没有人向它广播，所以永远收不到数据。
3. **Banner 清理发 stop**：`LiveLocationBanner` 的 `useEffect` cleanup 会在组件卸载时发送 `live-location-stop`，如果 React 重渲染或用户短暂离开页面，会误触发"已结束"。
4. **ChatRoom 的 stop 监听** (line 247) 只要收到 stop 广播就立刻 `setLiveShare(null)`，不区分是主动结束还是组件重载。

## 修复方案

### 核心思路：Map 不再自建频道，改为纯显示组件

ChatRoom 统一监听广播，维护 `otherPos` 状态，通过 props 传给 Map。Map 只负责自身 GPS 定位和地图渲染。

### Step 1: ChatRoom 新增对方位置状态

**文件**: `src/pages/ChatRoom.tsx`

- 新增 `otherCachedPos` state
- 在现有的 `live-loc-stop-listen` 频道上同时监听 `live-location` 事件，当收到 `otherUserId` 的坐标时更新 `otherCachedPos`
- 传递 `cachedMyPos` 和 `otherCachedPos` 给 `LiveLocationMap`
- 删除 stop 监听里"任何 stop 就清除 liveShare"的逻辑；改为只在 DB UPDATE 事件（`status === "ended"`）时才清除

### Step 2: 简化 LiveLocationMap

**文件**: `src/components/chat/LiveLocationMap.tsx`

- **删除两个 Supabase 频道订阅**（line 104-138, 141-170），Map 不再订阅任何频道
- `otherPos` 完全依赖 props (`initialOtherPos`) 的实时更新，用 `useEffect` 同步
- 保留自身 GPS `watchPosition` 逻辑不变
- 新增 `onStopShare` prop，地图顶部显示"结束共享"按钮

### Step 3: 修复 Banner 误发 stop

**文件**: `src/components/chat/LiveLocationBanner.tsx`

- cleanup 中不再发送 `live-location-stop` 广播。Stop 信号只通过 `handleStop` → ChatRoom 的 `handleStopLiveShare` 来处理（更新 DB status → 触发 realtime UPDATE）
- 这样组件卸载（如重渲染）不会误发 stop

### Step 4: 地图显示"结束共享"按钮

**文件**: `src/components/chat/LiveLocationMap.tsx`

- 在地图头部右侧区域添加"结束共享"红色按钮
- 点击调用 `onStopShare` 回调（由 ChatRoom 传入 `handleStopLiveShare`）
- 结束后自动关闭地图

## 数据流（修复后）

```text
User A (Banner)                     User B (Banner)
    │                                   │
    ├─broadcast→ live-loc-{convId} ←broadcast─┤
    │                                   │
ChatRoom A                         ChatRoom B
    │ listen live-location event       │
    ├─ update otherCachedPos           ├─ update otherCachedPos
    │                                   │
    └─ props → Map A                   └─ props → Map B
         ├─ myPos (own GPS)                 ├─ myPos (own GPS)
         └─ otherPos (from props)           └─ otherPos (from props)
```

## 修改文件清单

- `src/pages/ChatRoom.tsx` — 新增 otherCachedPos，统一位置监听，移除误触 stop 逻辑
- `src/components/chat/LiveLocationMap.tsx` — 移除频道订阅，改为纯 props 驱动，加结束按钮
- `src/components/chat/LiveLocationBanner.tsx` — cleanup 不再发 stop 广播

