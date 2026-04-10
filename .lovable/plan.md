

# 设备 ID 去重防刷

## 方案

### 1. 数据库迁移
- `posts` 表新增 `device_id text` 列
- 创建验证触发器：INSERT 时检查同一 `device_id` + 同一 `category` 下是否已有 `is_visible = true` 的活跃帖子，有则 RAISE EXCEPTION

### 2. 前端生成 device_id
- 在 `src/lib/deviceId.ts` 新增工具函数
- 首次访问时生成 UUID 存入 `localStorage`，后续复用
- 发布时从 localStorage 读取 device_id 附加到 postPayload

### 3. 修改发布逻辑
- `src/pages/CreatePost.tsx`：submit 时读取 device_id 写入 payload
- 编辑模式不校验（触发器中 `id != NEW.id` 排除自身）
- 捕获触发器抛出的错误，显示友好提示："该设备在此分类下已有活跃信息"

## 涉及文件
- 数据库迁移（新增列 + 触发器）
- `src/lib/deviceId.ts`（新建）
- `src/pages/CreatePost.tsx`（payload 增加 device_id，错误提示优化）

## 局限性说明
- localStorage 可被清除或在隐私模式下隔离，不是 100% 防刷，但能挡住大部分普通用户多账号发帖
- 结合已有的"同一联系方式去重"触发器效果更好

