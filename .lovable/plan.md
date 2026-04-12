

# 编辑资料备注 + 司机发布表单增加车辆信息

## 改动概要

### 1. 编辑资料页面：手机/微信字段添加提示文字

在 `Profile.tsx` 的编辑资料页面中，手机和微信输入框下方各添加一行灰色小字：
> "此信息不显示，用来快捷发送联系方式"

### 2. 编辑资料页面：移除车辆信息区块

将车辆信息（车型、车色、车牌）从编辑资料表单中移除。车辆信息改为在司机发布帖子时填写，存储在帖子维度而非个人资料维度。

注意：`profiles` 表仍保留这些字段（用于行程接单时展示），但编辑入口从个人资料页移到发布页。

### 3. 司机发布表单：增加车色和车牌字段

在 `DynamicForm.tsx` 的 driver 分类区块中，在现有"车型"字段后新增：
- **车色 Color**（文本输入）
- **车牌 License Plate**（文本输入）

同时在 `FormData` 接口中增加 `vehicleColor` 和 `licensePlate` 字段。

### 4. 发布时保存车辆信息到 profiles

在 `CreatePost.tsx` 提交时，如果分类是 driver，将车型、车色、车牌同步更新到 `profiles` 表（用于后续行程接单通知展示），同时将车辆信息拼接到帖子描述中。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/Profile.tsx` | 手机/微信字段添加提示文字；移除车辆信息编辑区块 |
| `src/components/create-post/DynamicForm.tsx` | driver 分类增加车色、车牌字段；FormData 增加对应字段 |
| `src/pages/CreatePost.tsx` | initialFormData 增加新字段；提交时同步车辆信息到 profiles 表；描述拼接增加车色和车牌 |

