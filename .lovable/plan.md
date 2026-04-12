

# 修复：新发布行程被误标记为"已结束"

## 问题根因

行程状态匹配使用 `from|to` 文本组合作为唯一键（如 `"350 Continental Drive|200 Lake Park Road"`）。当用户发布一个与之前已完成/已取消行程**相同出发地和目的地**的新行程时，系统会在 `completedSet` 或 `cancelledSet` 中找到匹配，错误地将新行程标记为"已结束"。

数据库中可以看到用户多次发布了 "350 Continental Drive" 出发的行程，之前的行程已完成（`trip_complete`），导致后续相同路线的新行程一发布就显示"订单已完成"或"已结束预约"。

## 解决方案

为每个行程生成唯一 ID（`tripId`），用 `tripId` 替代 `from|to` 作为状态匹配键。

### 改动

#### 1. `src/pages/ChatRoom.tsx`

**发送行程时生成 `tripId`：**
- `handleSendTrip`：在构建 trip JSON 时加入 `tripId: crypto.randomUUID()`
- `handleAcceptTrip`：将接受消息中的 `tripId` 从原始行程传递过来
- `handleCounterTrip`：同理传递 `tripId`
- `handleCancelTrip`、`confirmCompleteTrip`：从行程数据中取 `tripId` 写入消息

**状态计算改用 `tripId`：**
- `tripState` useMemo 中，`cancelledSet`/`completedSet`/`ratedByMe` 改用 `tripId` 作为 key（保留 `from|to` 作为 fallback 兼容旧数据）
- `isActiveForTrip`、`isCancelledForAccept`、`isCompletedForAccept`、`hasRatedForAccept` 都优先使用 `tripId` 匹配

#### 2. `src/components/chat/TripMessage.tsx`

- 各 parse 函数增加 `tripId` 可选字段
- `AcceptTripCard` 接收并传递 `tripId`

#### 3. `src/lib/tripLock.ts`

- 匹配逻辑同步改用 `tripId`（保留 `from|to` fallback 兼容旧数据）

### 兼容性

旧消息没有 `tripId` 字段，系统 fallback 到 `from|to` 匹配，不影响历史数据显示。只有新创建的行程会使用 `tripId`，彻底解决相同路线重复发布的状态混淆问题。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/ChatRoom.tsx` | 发送时生成 tripId，状态匹配优先用 tripId |
| `src/components/chat/TripMessage.tsx` | parse 函数增加 tripId 字段 |
| `src/lib/tripLock.ts` | 匹配逻辑增加 tripId 支持 |

