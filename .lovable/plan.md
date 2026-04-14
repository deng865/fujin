

# 修复移动商家和用户评分不显示的问题

## 根因

`usePostRatings` hook 只按 `post_id` 查询 `reviews` 表，但：
- **移动商家**的评价通过 ChatRoom 提交时 `post_id` 为 `null`，只有 `receiver_id`
- **用户**评价同理，`post_id` 也为 `null`
- 只有固定商家通过 ReviewDialog 提交时会带 `post_id`

所以移动商家和用户的评分永远查不到。

## 修复方案

### 1. 升级 `usePostRatings` hook

改为**双维度查询**：既按 `post_id` 查，也按帖子的 `user_id`（即 `receiver_id`）查。合并两种来源的评分数据。

具体逻辑：
- 输入改为 `{ postId, userId, isMobile }[]`
- 对固定商家：查 `post_id = postId` 的评价
- 对移动商家/用户：查 `receiver_id = userId` 的评价（不限 post_id）
- 合并去重后计算 avgRating / totalReviews / topTag

### 2. 更新 MapListSheet 和 Discovery

传入 `user_id` 信息，让 hook 能按 receiver_id 查询。

MapListSheet 的 Post 接口已无 `user_id`，需要在 fetch 时加上 `user_id` 字段。

### 3. 确保 ChatRoom 评价关联 post_id

当从移动商家帖子进入对话时，行程评价也应尽量携带 `post_id`，这样两种查询都能命中。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/hooks/usePostRating.ts` | 支持按 receiver_id 查询，合并两种数据源 |
| `src/components/MapListSheet.tsx` | Post 接口加 user_id，传递给 hook |
| `src/pages/Discovery.tsx` | 同上，fetch 时加 user_id |
| `src/pages/MapHome.tsx` | fetch posts 时包含 user_id |

