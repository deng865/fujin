

# 修复：行程评价未写入 reviews 表

## 问题根因

`handleRateTrip`（ChatRoom.tsx 第 966-1013 行）在用户提交评价时：
1. ✅ 将评价内容作为聊天消息发送到 `messages` 表
2. ✅ 直接更新对方 `profiles` 的 `rating_sum` / `total_ratings`
3. ❌ **从未插入到 `reviews` 表**

而"我的评价"页面的 `ReviewList` 组件从 `reviews` 表读取数据，所以永远显示"暂无评价"。

## 方案

### 文件：`src/pages/ChatRoom.tsx`

在 `handleRateTrip` 函数中，消息发送成功后，增加一条 `reviews` 表的插入操作：

```typescript
// 在 messages.insert 成功后，插入 reviews 表
await supabase.from("reviews").insert({
  sender_id: userId,
  receiver_id: ratedUserId,
  rating,
  comment: comment || null,
  post_id: null,
  tags: [],
});
```

同时移除手动更新 `profiles.rating_sum/total_ratings/average_rating` 的代码（第 998-1012 行），因为 `reviews` 表已有触发器 `trg_recalculate_rating` 会自动更新这些字段，避免重复计算。

### 改动总结

| 位置 | 改动 |
|------|------|
| `handleRateTrip` 函数 | 添加 `reviews` 表插入 |
| `handleRateTrip` 函数 | 删除手动更新 profiles 评分的代码（触发器会自动处理） |

