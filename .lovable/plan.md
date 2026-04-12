

# 聊天页面添加"致电"按钮

## 问题
聊天页面没有根据商家帖子的 `contact_phone` 显示电话按钮。用户希望：商家留了电话号码就显示"致电"按钮，没留就不显示。

## 方案

### 文件：`src/pages/ChatRoom.tsx`

1. **加载对方的 contact_phone**：在 `load` 函数中（约第 162 行附近），查询对方用户的 posts 表，获取第一个有 `contact_phone` 的帖子的电话号码，存入 `otherUser.phone`。

```typescript
const { data: phonePost } = await supabase
  .from("posts")
  .select("contact_phone")
  .eq("user_id", otherId)
  .not("contact_phone", "is", null)
  .limit(1)
  .maybeSingle();

setOtherUser({
  name: profile?.name || "用户",
  avatar_url: profile?.avatar_url || null,
  phone: phonePost?.contact_phone || null,
});
```

2. **Header 添加致电按钮**：在 header 右侧（Star 按钮旁边），当 `otherUser.phone` 存在时显示一个 Phone 图标按钮，点击触发 `window.open("tel:xxx")`。

```tsx
{otherUser?.phone && (
  <a href={`tel:${otherUser.phone}`} className="p-2 hover:bg-accent rounded-xl text-green-600">
    <Phone className="h-5 w-5" />
  </a>
)}
```

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/ChatRoom.tsx` | 查询 contact_phone + Header 条件显示致电按钮 |

