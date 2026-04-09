

# 完善评价系统 — 科学公正的双向信用体系

## 现状分析

当前系统已支持基础的双向评价（sender→receiver），但存在以下不足：
1. **信用等级过于简单** — 只有"低信用"（<3.0）和正常两级，缺乏激励
2. **缺少头衔/称号系统** — 用户无法直观看到信用等级
3. **新用户无保护** — 1条差评就能拉低分数，不够公正
4. **展示不够广泛** — 仅在帖子详情和个人主页显示，聊天列表等处缺失

## 修改方案

### 1. 升级 CreditBadge 组件 — 多级头衔系统

根据评分和评价数量，显示不同颜色和称号的头衔：

| 条件 | 头衔 | 颜色 |
|------|------|------|
| 评价数 < 3 | 新用户 | 灰色 |
| ≥ 4.5 且 ≥ 10条 | 金牌信用 | 金色 |
| ≥ 4.0 | 优质用户 | 绿色 |
| ≥ 3.0 | 普通用户 | 蓝色 |
| < 3.0 | 低信用 | 红色 |

**文件：`src/components/reviews/CreditBadge.tsx`**
- 添加多级头衔映射逻辑
- 显示头衔文字 + 星级 + 评价数
- 增加 shield/badge 图标区分等级

### 2. 评价防刷公正机制

**文件：`src/components/reviews/ReviewDialog.tsx`**
- 添加最少文字要求：评分 ≤ 2 时必须填写评价理由（≥10字），防止恶意无理由差评
- 提交后显示成功反馈并刷新对方信用分

### 3. 商家反评入口

**文件：`src/pages/ChatRoom.tsx`**
- 在聊天页面头部区域添加"评价对方"按钮，让商家（帖子发布者）也能在聊天中评价用户
- 复用现有 ReviewDialog，以 conversation 的 post 上下文传入

### 4. 更多位置展示信用徽章

**文件：`src/pages/Messages.tsx`**
- 在消息列表的每个会话项旁显示对方的 CreditBadge

**文件：`src/components/PostMarkers.tsx`** 或地图弹窗
- 地图上点击帖子预览时显示发布者信用徽章

### 5. 个人主页评价统计增强

**文件：`src/pages/Profile.tsx`**
- 在"我的评价"页面顶部添加统计卡片：平均分、总评价数、好评率（4-5星占比）
- 分 Tab 显示"收到的评价"和"给出的评价"

## 涉及文件

- `src/components/reviews/CreditBadge.tsx` — 多级头衔系统
- `src/components/reviews/ReviewDialog.tsx` — 差评必须写理由
- `src/pages/ChatRoom.tsx` — 聊天中添加评价入口
- `src/pages/Messages.tsx` — 消息列表显示信用徽章
- `src/pages/Profile.tsx` — 评价统计卡片
- `src/components/profile/ProfileHeader.tsx` — 显示头衔称号

无需数据库变更，现有 `reviews` 表和 `profiles.average_rating` / `total_ratings` 字段已满足需求。

