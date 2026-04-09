

# 修复：实时位置共享看不到对方位置（频道不断重建）

## 根因

`LiveLocationBanner` 的核心 `useEffect`（负责创建频道、广播 GPS、监听对方位置）的依赖数组包含了 `broadcastPosition`、`onOtherPositionUpdate`、`onError` 等回调函数。

在 `ChatRoom.tsx` 中，这些回调都是**内联箭头函数**：
```tsx
onPositionUpdate={(pos) => setCachedMyPos(pos)}
onOtherPositionUpdate={(pos) => setOtherCachedPos(pos)}
```

每次 ChatRoom 重新渲染（任何状态变化），这些箭头函数都会生成新的引用 → `broadcastPosition`（useCallback 依赖它们）也会变 → useEffect 的依赖变了 → **频道被拆除并重建**。

结果：频道在不断地 unsubscribe/subscribe 循环中，导致对方的广播几乎永远收不到。同时 "等待中..." 一直显示，因为 `otherCachedPos` 从未被更新。

## 修复方案

**在 `LiveLocationBanner` 中使用 ref 存储回调**，避免回调变化导致 useEffect 重跑。

### 文件: `src/components/chat/LiveLocationBanner.tsx`

1. 添加 `callbacksRef = useRef({ onPositionUpdate, onOtherPositionUpdate, onError })`，每次 render 时更新 ref
2. `broadcastPosition` 的 useCallback 改为从 ref 读取回调，依赖数组只保留 `userId`
3. useEffect 依赖数组移除所有回调函数，只保留 `conversationId` 和 `userId`
4. 频道监听器中通过 ref 读取最新的 `otherUserId` 和 `onOtherPositionUpdate`

### 文件: `src/pages/ChatRoom.tsx`

无需修改（内联箭头函数不再导致问题）。

## 只修改一个文件
- `src/components/chat/LiveLocationBanner.tsx`

