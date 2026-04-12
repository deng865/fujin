

# 修复致电按钮无反应

## 问题分析

当前使用 `<a href="tel:xxx">` 实现致电功能。在 iframe 预览环境中，`tel:` 协议链接可能被浏览器安全策略拦截，导致点击无反应。

## 方案

### 文件：`src/pages/ChatRoom.tsx`

将 `<a href="tel:">` 改为 `<button>` + `onClick` 使用 `window.open("tel:xxx")` 触发拨号，同时保留 `window.location.href` 作为后备：

```tsx
{otherUser?.phone && (
  <button
    onClick={() => {
      window.open(`tel:${otherUser.phone}`, '_self');
    }}
    className="p-2 hover:bg-accent rounded-xl text-green-600"
    title="致电"
  >
    <Phone className="h-5 w-5" />
  </button>
)}
```

| 文件 | 改动 |
|------|------|
| `src/pages/ChatRoom.tsx` | `<a href="tel:">` 改为 `<button onClick>` + `window.open` |

