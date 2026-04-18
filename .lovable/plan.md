

## 诊断：评价为何可被无限重复提交

我深入检查了 `ReviewDialog.tsx`、迁移文件和数据库约束，发现「连续评价」漏洞由 **3 个层面共同造成**。

### 根本原因

**1. 客户端：只有 `fixed_merchant` 触发资格检查**
`ReviewDialog.tsx` 第 47-65 行 effect 里写了 `if (!open || targetType !== "fixed_merchant" || ...)` 才调用 `can_user_review_post` RPC。第 128 行的提交前再校验也是同样条件。
→ 结果：**`mobile_merchant`（移动商家 / 司机）和 `user`（聊天评价）完全跳过频率检查**，可无限点击提交。

**2. 数据库：UNIQUE 约束遇到 NULL 失效**
`reviews` 表的唯一键是 `(sender_id, receiver_id, post_id)`。在 PostgreSQL 中，`NULL` 永不等于 `NULL`，所以聊天里 `post_id` 为 null 的评价（行程评分、用户互评）**任何数量都不会触发 23505 重复错误**。
→ 结果：同一个对话里点几次评分按键 = 数据库里塞几条评价。

**3. RPC 校验函数对移动商家无 24h 限制场景**
`can_user_review_post` 函数虽然写了 24h 设备频率检查与"已评价过"检查，但只有 fixed_merchant 这一条路径会调用它；移动商家与聊天用户评价根本不走这函数。

### 修复方案

**Step 1 — 客户端：所有 targetType 都做资格校验（前置 + 提交前）**
- `ReviewDialog.tsx`：把 effect 和 handleSubmit 中的条件从 `targetType === "fixed_merchant"` 改为「只要 `postId` 存在就 RPC」。聊天里如果有 `postId`（比如点评对方的某条 post）就走 RPC；行程评分场景则用本地 24h 检查 + DB 唯一约束兜底。
- 提交失败时清晰提示"24 小时内已评价过该商家/用户"。

**Step 2 — 数据库：补全 RPC 函数，使其对移动商家与用户互评同样生效**
更新 `can_user_review_post`：移除函数末尾"仅 fixed_merchant 才检查 visit"的硬限制 → 仅在 fixed_merchant 时附加 visit 校验，但 24h 频率与"已评价过"检查对所有 target 类型都执行。（现有函数其实已经做到了这一点，只是客户端没调用。所以本步骤更多是「确认 + 兜底」。）

**Step 3 — 数据库：新增"按 sender + receiver + 24h"评价频率函数**
新增一个 SQL 函数 `can_user_rate_target(_sender uuid, _receiver uuid)`：检查同一发送者对同一接收者 24 小时内是否已评价（适用于 `post_id` 为 null 的聊天行程评分）。客户端在没有 `postId` 时调用此函数。

**Step 4 — 数据库：补强 UNIQUE 约束（处理 post_id 为 null 的场景）**
新增一个 partial unique index：当 `post_id IS NULL` 时，禁止同一 (sender_id, receiver_id) 在 24 小时内重复 ——
```sql
CREATE UNIQUE INDEX reviews_unique_chat_rating
  ON reviews (sender_id, receiver_id, date_trunc('day', created_at))
  WHERE post_id IS NULL;
```
（或更精确：让 trigger 在 INSERT 时检查 24h 窗口内是否已存在并 raise exception。）

**Step 5 — UI：评价提交后禁用按钮 + 关闭弹窗**
当前虽然提交后会 `onOpenChange(false)`，但若 RPC 还没失败/网络慢，用户连击 Submit 按钮可发出多个请求。在 ReviewDialog 提交按钮上加 `submitting` 立即 disable（已有 `submitting` 状态，但 race condition 仍存在）。改为提交开始的瞬间就把按钮置灰并防止重复 RPC 调用。

### 涉及的文件
- `src/components/reviews/ReviewDialog.tsx` — 扩展资格校验条件至所有 targetType（约 30 行改动）
- 新建迁移文件 `supabase/migrations/<timestamp>_review_rate_limit.sql` — 新增 `can_user_rate_target` 函数 + partial unique index / 24h trigger（约 50 行 SQL）

### 预期效果
- 移动商家（司机/上门服务）24 小时内同一用户只能评价一次。
- 聊天行程评分（user 类型，无 postId）同一对发送者→接收者 24 小时内只能评价一次。
- 客户端遇到重复时显示明确提示「24 小时内已评价过」。
- 即使绕过前端，DB 层 trigger / unique index 也会硬阻挡。

