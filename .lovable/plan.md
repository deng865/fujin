

# 修复：两部手机实时共享位置互相看不见

## 根因分析

当前 `LiveLocationMap` **不直接监听 Realtime 频道**，完全依赖一条脆弱的数据链路获取对方坐标：

```text
对方手机广播 → Supabase频道 → LiveLocationBanner.on("broadcast") 
→ onOtherPositionUpdate回调 → ChatRoom.setOtherCachedPos 
→ initialOtherPos prop → LiveLocationMap.useEffect → setOtherPos
```

这条链路有多个断点风险：
1. Banner 的频道与 Map 无关，Map 被动等待 prop 更新
2. `initialOtherPos` 是对象引用，React 的 `useEffect` 依赖比较可能不稳定
3. Banner 和 Map 各自运行独立的 GPS watch，但只有 Banner 在广播——如果 Map 打开时 Banner 因故未收到广播，Map 就永远看不到对方

## 修复方案

**让 `LiveLocationMap` 直接订阅 Realtime 频道**，不再依赖 prop 传递对方坐标。

### 文件: `src/components/chat/LiveLocationMap.tsx`

1. **添加自己的频道订阅**：在 Map 组件中直接订阅 `live-loc-${conversationId}`，监听 `broadcast` 事件，收到对方坐标后直接更新 `otherPos` state

2. **添加调试日志**：在频道订阅回调中 `console.log` 打印正在监听的 `partner_id` 和收到的广播内容，方便排查 ID 匹配问题

3. **保留 `initialOtherPos` 作为初始值**：首次打开地图时如果已有缓存坐标，立即显示；后续通过频道实时更新

4. **性能保证**：已有的 Marker 更新逻辑只更新坐标 (`setLngLat`)，不会重建地图实例

### 文件: `src/pages/ChatRoom.tsx`

5. **渲染条件增加 `otherUserId` 检查**：Banner 渲染条件从 `liveShare && userId && conversationId` 改为 `liveShare && userId && conversationId && otherUserId`，确保 Banner 始终能拿到有效的对方 ID

### 核心代码逻辑

```typescript
// LiveLocationMap.tsx — 新增频道订阅
useEffect(() => {
  const ch = supabase.channel(`live-loc-map-${conversationId}`);
  
  console.log("[LiveLocationMap] 正在监听 partner_id:", otherUserId);
  
  ch.on("broadcast", { event: "live-location" }, (msg) => {
    const p = msg?.payload;
    if (p?.userId === otherUserId) {
      console.log("[LiveLocationMap] 收到对方坐标:", p.lat, p.lng);
      setOtherPos({ lat: p.lat, lng: p.lng });
    }
  });
  
  ch.subscribe();
  
  return () => { supabase.removeChannel(ch); };
}, [conversationId, otherUserId]);
```

**注意**：频道名用 `live-loc-map-${conversationId}`（加 `-map` 后缀）避免与 Banner 的频道名冲突。不需要，因为 Supabase broadcast 允许多个订阅者。但实际上同一个客户端不能重复订阅同名频道——所以 Map 必须用不同的频道名，或者共享 Banner 的频道引用。

**修正**：由于 Supabase 不允许同一客户端订阅同名频道，Map 不能再创建 `live-loc-${conversationId}`。解决方案：**通过 ref 将 Banner 的频道引用传给 Map**，或者让 Map 用不同频道名但 Banner 同时向两个频道广播。

**最终方案**：最简单可靠的方式是 **将 Banner 的频道引用通过 ChatRoom 的 ref 传递给 Map**：
- Banner 新增 `channelRef` prop，将自己的频道引用存入父级 ref
- Map 使用该 ref 添加自己的 broadcast listener
- 这样只有一个频道实例，不会冲突

## 修改文件
- `src/components/chat/LiveLocationBanner.tsx` — 新增 `channelRef` prop，将频道引用暴露给父级
- `src/components/chat/LiveLocationMap.tsx` — 接收频道引用，直接监听对方广播，添加调试日志
- `src/pages/ChatRoom.tsx` — 创建 channelRef 并传递给 Banner 和 Map；Banner 渲染条件增加 `otherUserId` 检查

