

# 性能优化方案

## 问题分析

经过代码审查，主要性能瓶颈在以下几个方面：

### 1. ChatRoom.tsx 巨型单文件（1522 行）
这个文件包含了聊天、语音通话、行程管理、实时位置、媒体上传等所有功能。每次任何 state 变化都会触发整个组件重新渲染，包括消息列表中**每条消息的 JSON.parse 解析**。

### 2. 消息渲染无虚拟化
消息列表直接用 `messages.map()` 渲染全部消息（第 1206 行）。聊天记录多时，每次输入一个字符都会重新渲染所有消息气泡。

### 3. 每条消息重复 JSON.parse
渲染每条消息时执行多达 8 次 `parse*` 函数调用（第 1298-1343 行），每次都 `JSON.parse`，且这些调用在每次渲染都重新执行。

### 4. 所有页面同步加载（无懒加载）
`App.tsx` 直接 import 所有页面组件，首次加载就打包了 ChatRoom、MapHome、AdminPortal 等所有页面的代码。

### 5. scrollToBottom 在每次 messages 变化时触发
第 205-207 行：`useEffect(() => { scrollToBottom(); }, [messages])` — 包括 read_at 更新也会触发。

## 优化方案

### 改动 1：路由懒加载（App.tsx）
用 `React.lazy` + `Suspense` 按需加载各页面，减少首屏 JS 体积约 40-60%。

```tsx
const ChatRoom = lazy(() => import("./pages/ChatRoom"));
const MapHome = lazy(() => import("./pages/MapHome"));
// ... 其他页面
```

### 改动 2：消息组件 memo 化（ChatRoom.tsx）
将消息渲染逻辑提取为独立的 `MessageBubble` 组件，用 `React.memo` 包裹，避免未变化的消息重新渲染。

### 改动 3：消息解析结果缓存（ChatRoom.tsx）
用 `useMemo` 预处理消息类型，避免渲染时重复 JSON.parse：

```tsx
const parsedMessages = useMemo(() => 
  messages.map(m => ({ ...m, parsed: parseMessageType(m.content) })), 
  [messages]
);
```

### 改动 4：scrollToBottom 优化（ChatRoom.tsx）
仅在消息数量增加时滚动，忽略 read_at 更新：

```tsx
const prevCountRef = useRef(0);
useEffect(() => {
  if (messages.length > prevCountRef.current) scrollToBottom();
  prevCountRef.current = messages.length;
}, [messages.length]);
```

### 改动 5：输入框隔离渲染（ChatRoom.tsx）
将输入栏提取为独立组件，`input` 状态不再触发消息列表重新渲染。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/App.tsx` | 路由懒加载 |
| `src/pages/ChatRoom.tsx` | 消息 memo 化 + 解析缓存 + scroll 优化 + 输入栏隔离 |

## 预期效果
- 首屏加载速度提升 40%+
- 聊天页面输入/渲染流畅度显著提升
- 消息列表滚动更顺滑

