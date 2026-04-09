

# 修复：对方头像不显示 + 实时位置看不到对方

## 问题根因

### 1. 对方头像看不到
`profiles` 表的 RLS 策略只允许用户查看**自己**的资料（`auth.uid() = id`）。通过 `public_profiles` 视图（带 `security_invoker=true`）查询对方的 `avatar_url` 时，RLS 拒绝访问，返回空数据。

### 2. 实时位置看不到对方
`LiveLocationBanner` 在频道 `live-loc-${conversationId}` 上广播坐标，但 `ChatRoom` 监听的是 `live-loc-listen-${conversationId}`。**频道名称不匹配**，所以 ChatRoom 永远收不到对方的坐标。

## 修复方案

### Step 1: 添加 RLS 策略允许认证用户查看其他人的基本资料
**操作**: 数据库迁移

为 `profiles` 表新增一条 SELECT 策略，允许已认证用户查看所有用户的基本资料（因为 `public_profiles` 视图已经限制了只暴露 `name`, `avatar_url`, `user_type` 等非敏感字段）。

```sql
CREATE POLICY "Authenticated users can view profiles via public_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);
```

### Step 2: 修复频道名称不匹配
**文件**: `src/pages/ChatRoom.tsx`

将监听频道名称从 `live-loc-listen-${conversationId}` 改为 `live-loc-${conversationId}`，与 Banner 广播的频道名一致。同时保持 `self: false` 配置，避免收到自己的广播。

```typescript
// 第 248 行：改为
const ch = supabase.channel(`live-loc-${conversationId}`, { config: { broadcast: { self: false } } });
```

## 修改文件清单
- **数据库迁移** — 新增 profiles 表 SELECT RLS 策略
- `src/pages/ChatRoom.tsx` — 修复频道名（1行改动）

