

# 修复：行程进行中不显示实时追踪地图

## 问题根因

通过数据库验证，**最新的 `trip_accept` 消息缺少 `fromCoords`/`toCoords` 坐标数据**：

```json
// trip_accept（❌ 无坐标 → DriverTracking 不渲染）
{"type":"trip_accept","from":"350 Continental Drive...","to":"425 Jones Street...","price":"28","tripId":"f07f7d7d-..."}

// 原始 trip 消息（✅ 有坐标）
{"type":"trip","from":"350 Continental Drive...","to":"425 Jones Street...","fromCoords":{"lat":33.01,"lng":-96.99},"toCoords":{"lat":33.06,"lng":-97.00},...}
```

**两个断裂点：**

1. **还价流程丢失坐标**：`handleCounterTrip` 构建 `trip_counter` 消息时没有携带 `fromCoords`/`toCoords`，导致从还价消息点"接受"时传入 `handleAcceptTrip` 的对象也没有坐标。

2. **DriverTracking 渲染条件过严**：`if (!activeAccept?.fromCoords) return null;`（第 1162 行）——只要 accept 消息没坐标就不渲染，但没有回退到原始 trip 消息查找坐标。

## 修复方案

### 1. `src/pages/ChatRoom.tsx` — 坐标补全

在 `handleAcceptTrip` 中，如果传入的 trip 对象缺少坐标，**从消息历史中查找同 tripId（或同路线）的原始 trip 消息获取坐标**：

```typescript
const handleAcceptTrip = async (trip) => {
  let { fromCoords, toCoords } = trip;
  
  // 如果缺少坐标，从原始 trip 消息中补全
  if (!fromCoords || !toCoords) {
    for (const m of messages) {
      const t = parseTripMessage(m.content);
      if (t && t.from === trip.from && t.to === trip.to && t.fromCoords && t.toCoords) {
        fromCoords = t.fromCoords;
        toCoords = t.toCoords;
        break;
      }
    }
  }
  
  // 使用补全后的坐标构建 accept 消息
  const acceptContent = JSON.stringify({
    type: "trip_accept", from: trip.from, to: trip.to, 
    price: trip.price, fromCoords, toCoords, tripId
  });
};
```

### 2. `src/pages/ChatRoom.tsx` — DriverTracking 坐标回退

修改 DriverTracking 渲染逻辑（第 1151-1172 行），当 accept 消息缺少坐标时，从原始 trip 消息或 `tripState.activeAcceptData` 回退查找：

```typescript
// 如果 activeAccept 没有坐标，从原始 trip 消息中查找
if (!activeAccept?.fromCoords) {
  for (const m of messages) {
    const t = parseTripMessage(m.content);
    if (t && t.from === activeAccept.from && t.to === activeAccept.to && t.fromCoords) {
      activeAccept = { ...activeAccept, fromCoords: t.fromCoords, toCoords: t.toCoords };
      break;
    }
  }
}
if (!activeAccept?.fromCoords) return null;
```

### 3. `src/pages/ChatRoom.tsx` — 还价也携带坐标

修改 `handleCounterTrip`，将 `fromCoords`/`toCoords` 传入 counter 消息，防止后续丢失。同时修改 `TripMessage.tsx` 中还价接受按钮的 `onAccept` 调用，传入已有的坐标字段。

### 4. `src/components/chat/TripMessage.tsx` — 还价接受传递坐标

修改还价消息的"接受"按钮（第 466 行），把 `fromCoords`/`toCoords` 也传入：

```typescript
onAccept({ from: counterData.from, to: counterData.to, price: counterData.price, 
           tripId: counterData.tripId, fromCoords: counterData.fromCoords, toCoords: counterData.toCoords })
```

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/ChatRoom.tsx` | handleAcceptTrip 坐标补全 + handleCounterTrip 携带坐标 + DriverTracking 渲染回退 |
| `src/components/chat/TripMessage.tsx` | counter 解析/接受按钮传递坐标，parseTripCounterMessage 增加坐标字段 |

