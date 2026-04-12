

# 修复：位置共享关闭时禁止移动帖子上线

## 问题

当位置共享处于关闭状态时，用户仍可在"我的发布"中点击"上线"将移动帖子设为在线。但移动帖子依赖实时位置才能在地图上显示，位置共享关闭时上线毫无意义且会误导用户。

## 方案

在 `MyPostsList` 中增加 `locationSharing` prop，当位置共享关闭时：
- 点击"上线"不执行操作，而是弹出提示："请先开启位置共享，移动服务才能在地图上显示"
- "上线"按钮变灰（disabled 样式），让用户一眼看出无法操作

## 改动

### 文件：`src/components/profile/MyPostsList.tsx`

- Props 新增 `locationSharing: boolean`
- `handleToggleOnline` 中增加判断：如果 `!locationSharing && !post.is_visible`（即尝试上线），弹 `toast.warning` 提示并 return
- 上线按钮在 `!locationSharing` 时显示为禁用样式（`opacity-50 cursor-not-allowed`）

### 文件：`src/pages/Profile.tsx`

- 将 `locationSharing` state 传递给 `MyPostsList` 组件

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/components/profile/MyPostsList.tsx` | 增加 locationSharing prop，禁止关闭状态下上线 |
| `src/pages/Profile.tsx` | 传递 locationSharing 给 MyPostsList |

