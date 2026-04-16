
# 评价系统优化方案

## 待修复的 4 个问题

### 1. 聊天对话框星号点评失败
**根因**：`handleRateTrip`（ChatRoom.tsx 第 1082 行）插入 `reviews` 表时未提供 `target_type`，虽然 DB 有默认值 `'user'`，但 RLS 检查 `auth.uid() <> receiver_id`。如果 `ratedUserId` 等于 `userId`（自己评自己）会失败。另外，重复评价会触发唯一约束冲突，但前端没有捕获并提示。

**修复**：
- 显式传入 `target_type: 'user'` 和 `tags: []`、`image_urls: []`
- 捕获 `23505` 唯一约束错误并提示"已评价过"
- 增加 `if (ratedUserId === userId) return` 保护

### 2. 商家详情页评价对话框 + 聊天评价对话框 → 都需要图片上传
**当前状态**：
- `ReviewDialog.tsx` 已有图片上传逻辑，但仅在 `targetType !== "user"` 时显示（只支持商家点评）
- 聊天里 `TripRatingInput` 是简化的星级+文本输入，没有图片上传

**修复**：
- `ReviewDialog.tsx`：取消 `targetType !== "user"` 的限制，**所有评价类型都允许上传图片**（最多 3 张）
- 聊天评价：**改用 `ReviewDialog`** 替代 `TripRatingInput`。点击星号触发 `setShowReviewDialog(true)`，对话框关闭后再发送 `trip_rating` 消息记录到聊天时间轴

### 3. "申诉"按钮点击无反应、需输入理由+照片、管理后台可见
**当前状态**：
- `ReviewList.tsx` 第 119 行使用原生 `prompt()` 输入申诉理由 → 移动端体验差，且不支持上传照片
- 管理后台 `AdminPortal.tsx` 没有"评价/申诉管理"模块

**修复**：
- 新建 `DisputeDialog.tsx` 弹窗组件：包含申诉理由（textarea，必填，10-500 字）+ 图片上传（最多 3 张证据照片）
- 数据库需新增 `dispute_images` 字段（text[]）存储证据图片
- `ReviewList.tsx`：替换 `prompt()` 为 `DisputeDialog`
- 管理后台新增 **"评价管理"** Tab：列表显示所有 `dispute_status='disputed'` 的评价，含原评价内容/星级、申诉理由、证据照片，可执行：批准申诉（删除该评价）、驳回申诉（恢复 `dispute_status='none'`）、保留申诉中状态

### 4. 移动服务商家详情页"写点评"按钮取消，固定商家保留
**当前状态**：`MerchantReviewSection.tsx` 第 99-109 行对所有商家类型都显示"写点评"按钮

**修复**：在 `MerchantReviewSection.tsx` 增加 `isMobile === false` 条件，**仅固定商家**显示"写点评"按钮。移动商家的评价仍可通过聊天行程结束后弹出。

## 数据库改动

```sql
-- 1. 评价表新增证据图片字段（用于申诉）
ALTER TABLE reviews ADD COLUMN dispute_images text[] DEFAULT '{}';

-- 2. 管理员处理申诉的状态扩展（已有 dispute_status, admin_note，足够）
```

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/ChatRoom.tsx` | 修复 `handleRateTrip`：自评保护、错误捕获、显式字段；星号点击改用 `ReviewDialog` |
| `src/components/reviews/ReviewDialog.tsx` | 取消 `targetType !== "user"` 的图片上传限制，所有类型都支持 |
| `src/components/reviews/MerchantReviewSection.tsx` | 移动商家隐藏"写点评"按钮 |
| `src/components/reviews/ReviewList.tsx` | "申诉"改用 `DisputeDialog` 替代 `prompt()` |
| `src/components/reviews/DisputeDialog.tsx` | **新建** — 申诉理由 + 证据照片上传 |
| `src/pages/AdminPortal.tsx` | 新增 "评价管理" Tab，含申诉处理 |
| `src/components/admin/ReviewsPanel.tsx` | **新建** — 申诉列表与管理操作 |
| 数据库 migration | 新增 `reviews.dispute_images` 字段 |

## 验证清单

1. 聊天点击星星 → 弹出完整评价对话框（含图片上传）→ 提交成功 → 时间轴显示评价卡片
2. 固定商家详情页有"写点评"按钮，移动商家详情页**没有**该按钮
3. 用户/商家详情页评价对话框都显示图片上传区域
4. "我收到的评价"列表点"申诉"→ 弹出对话框输入理由+上传证据 → 状态变"申诉中"
5. 管理员进入"评价管理"→ 看到所有申诉 → 可批准/驳回
