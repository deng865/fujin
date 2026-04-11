

# 限制每用户每类目仅一条活跃帖子

## 现状

数据库已有 `device_id` 和联系方式的去重触发器，但没有 `user_id + category` 的唯一约束。前端 `CreatePost.tsx` 的 `handleSubmit` 也没有预先检查同类目是否已有活跃帖子。

## 改动

### 1. 数据库：添加唯一部分索引

创建一个 partial unique index，仅对 `is_visible = true` 的行生效：

```sql
CREATE UNIQUE INDEX idx_posts_one_active_per_user_category
ON public.posts (user_id, category)
WHERE is_visible = true;
```

这样每个用户在每个类目下最多只能有一条 `is_visible = true` 的帖子。已下架的帖子不受限制。

### 2. 前端：提交前预检查（CreatePost.tsx）

在 `handleSubmit` 函数开头（校验完 category 和 title 之后），新增一个查询：

```typescript
// 编辑模式不需要检查
if (!editId) {
  const { data: { user } } = await supabase.auth.getUser();
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("category", category)
    .eq("is_visible", true);
  if (count && count > 0) {
    toast.error("您在该分类下已有一条活跃信息，请先下架后再发布新的");
    return;
  }
}
```

### 3. 前端：捕获数据库层错误

在 `handleSubmit` 的 insert 错误处理中，增加对唯一索引冲突的捕获（与现有 DEVICE_DUPLICATE 处理同级）：

```typescript
if (error.message?.includes("idx_posts_one_active_per_user_category") || error.code === "23505") {
  toast.error("您在该分类下已有一条活跃信息，请先下架后再发布新的");
  return;
}
```

## 涉及文件

| 文件 | 改动 |
|------|------|
| 新建迁移 SQL | 添加 partial unique index |
| `src/pages/CreatePost.tsx` | handleSubmit 添加预检查 + 错误捕获 |

