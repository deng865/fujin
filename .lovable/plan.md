

# 优化自动上下线按钮的状态展示

## 问题

当前"自动上下线"按钮无论是否已设置，样式完全一致，用户无法一眼判断是否已配置成功。

## 改动

### 文件：`src/components/profile/MyPostsList.tsx`

**1. 按钮样式区分已设置/未设置状态**

- **已设置**：按钮背景改为 `bg-emerald-500/10 text-emerald-600`，显示具体时间段，如 `⏰ 09:00-21:00`
- **未设置**：保持当前灰色/primary 样式，显示 `自动上下线`

**2. 帖子信息行增加定时标记**

在已设置自动上下线的移动帖子信息行中，显示一个小标签如 `⏰ 已定时`，与在线/离线状态并列。

**3. 对话框中增加"清除设置"按钮**

在自动上下线设置对话框中增加一个"清除"按钮，将 `operating_hours` 置为 `null`，让用户可以取消定时。

### 具体代码变化

按钮部分（约第 163-169 行）改为：

```tsx
<button
  onClick={() => openScheduleDialog(post)}
  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition-colors ${
    post.operating_hours
      ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
      : "bg-muted text-muted-foreground hover:bg-accent"
  }`}
>
  <Clock className="h-3.5 w-3.5" />
  {post.operating_hours
    ? `${post.operating_hours.open}-${post.operating_hours.close}`
    : "自动上下线"}
</button>
```

信息行（约第 131-141 行），移动帖子增加定时提示：

```tsx
{post.is_mobile ? (
  <>
    <span className={`ml-1.5 ${post.is_visible ? "text-emerald-500" : "text-muted-foreground"}`}>
      · {post.is_visible ? "在线" : "离线"}
    </span>
    {post.operating_hours && (
      <span className="ml-1 text-amber-500">· ⏰ 已定时</span>
    )}
  </>
) : ( ... )}
```

对话框底部增加清除按钮：

```tsx
<DialogFooter className="gap-2">
  {schedulePost?.operating_hours && (
    <Button variant="ghost" className="text-destructive" onClick={clearSchedule}>
      清除设置
    </Button>
  )}
  <Button variant="outline" onClick={() => setSchedulePost(null)}>取消</Button>
  <Button onClick={saveSchedule}>保存</Button>
</DialogFooter>
```

新增 `clearSchedule` 函数，将 `operating_hours` 设为 `null`。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/components/profile/MyPostsList.tsx` | 按钮样式区分、信息行标记、清除设置功能 |

