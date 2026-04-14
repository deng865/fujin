

# 重构评价系统 — 统一评分引擎 + 商家主页 + 自动触发

## 概述

将现有的简单评价系统升级为完整的评分引擎，支持固定商家、移动商家、用户三种评价场景，并增加自动触发评价机制。

## 一、数据库改造

### 1.1 扩展 reviews 表

在现有 `reviews` 表上新增字段（通过数据库迁移）：

- `target_type` (text, default `'user'`)：区分 `fixed_merchant` / `mobile_merchant` / `user`
- `is_verified` (boolean, default `false`)：标记真实交易产生的评价
- `image_urls` (text[], default `'{}'`)：评价图片

现有数据不受影响（新字段有默认值）。

### 1.2 新建 review_prompts 表

用于跟踪"对话不活跃时自动提醒评价"的状态，防止重复提醒：

```text
review_prompts
├── id (uuid, PK)
├── conversation_id (uuid)
├── prompted_at (timestamptz)
├── status (text: 'pending' / 'dismissed' / 'reviewed')
└── created_at (timestamptz)
```

### 1.3 评价标签按类型区分

- 固定商家：`环境好`、`味道正`、`位置好找`、`服务热情`、`性价比高`、`停车方便`
- 移动商家：`出摊准时`、`位置描述准确`、`回复快`、`服务专业`、`价格公道`
- 用户（打车等）：保持现有的 `准时靠谱`、`态度友好` 等

## 二、商家主页评分展示

### 2.1 固定商家（PostDetail.tsx 改造）

在商家详情页新增评分区块：
- **综合评分**：名字下方显示 `4.8★ | 1200+ 条评价`
- **口碑墙**：高频标签展示（`环境好 x32`、`味道正 x28`）
- **到店评价标记**：通过 `is_verified` 标识"真实消费"勋章
- **"写点评"入口**：任何登录用户可主动评价

### 2.2 移动商家（PostDetail.tsx 改造）

头像旁展示评分，侧重标签：
- **实时口碑**：`出摊准时`、`位置描述准确`、`回复快`
- 评分与帖子（post_id）绑定

### 2.3 用户个人主页（Profile.tsx）

- **信用勋章**：保持现有 CreditBadge 组件，增强标签展示
- **评价维度**：`守时`、`友善`、`付款及时` 等正面反馈汇总
- **可见性控制**：评分在对方查看时才显示（已通过 CreditBadge 实现）

## 三、评价触发机制

### 3.1 行程结束自动弹出（已有，保持）

`trip_complete` 消息后弹出 `TripRatingInput` 组件，这部分保持不变。

### 3.2 移动商家对话不活跃自动提醒（新增）

在 `ChatRoom.tsx` 中增加逻辑：
- 当对话中有移动商家相关消息（通过 post category 判断）
- 检测最后一条消息距今超过 30 分钟且无活跃行程
- 自动发送系统消息："服务结束了吗？请对本次服务进行评价"
- 同时弹出双向评价对话框
- 通过 `review_prompts` 表防止重复提醒

### 3.3 固定商家主动入口（新增）

在 `PostDetail.tsx` 中为固定商家添加"写点评"按钮（已有基础，增强 `ReviewDialog` 支持不同标签集）。

### 3.4 地理围栏触发（暂不实现）

地理围栏需要后台持续监测用户位置，隐私成本高，建议后期通过推送通知实现。

## 四、ReviewDialog 改造

增强 `ReviewDialog` 组件：
- 接收 `targetType` 参数，根据类型显示不同的标签集
- 支持图片上传（可选）
- 支持 `is_verified` 标记

## 五、涉及文件

| 文件 | 改动 |
|------|------|
| 数据库迁移 | 扩展 `reviews` 表 + 创建 `review_prompts` 表 |
| `src/components/reviews/ReviewDialog.tsx` | 按 target_type 切换标签集 + 图片上传 |
| `src/components/reviews/ReviewList.tsx` | 支持 `is_verified` 勋章显示 |
| `src/pages/PostDetail.tsx` | 商家主页评分区块（口碑墙 + 标签云 + 写点评） |
| `src/pages/ChatRoom.tsx` | 对话不活跃自动提醒评价逻辑 |
| `src/pages/Profile.tsx` | 用户信用维度展示增强 |
| `src/components/reviews/CreditBadge.tsx` | 无需大改，保持现有 |

## 六、不在此次范围

- 地理围栏触发（需后台 + 推送通知基础设施）
- 评价图片审核（可后期通过 AI 内容审核添加）

