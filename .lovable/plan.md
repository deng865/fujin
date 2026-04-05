## 实现计划

### 第一步：数据库迁移
- 在 `profiles` 表新增 `vehicle_model`（车型）、`vehicle_color`（车色）、`license_plate`（车牌号）字段
- 在 `rides` 表的 `current_location` 字段已存在，可复用为司机实时位置

### 第二步：司机接单通知消息
- 新增消息类型 `trip_accept_notify`，内容包含司机姓名、头像、评分、车型、距离、预计到达时间
- 在 `ChatRoom` 中渲染该消息类型：显示司机头像、车型信息、评分星级、距离和ETA

### 第三步：司机端实时位置上报
- 司机接单后，在聊天室启动 `watchPosition` 持续上报 GPS 坐标
- 通过 Supabase Realtime 将 `rides.current_location` 的变更推送给乘客端

### 第四步：乘客端实时地图追踪
- 在聊天室顶部的行程状态栏中嵌入可展开的实时地图
- 订阅 `rides.current_location` 的 Realtime 变更，实时更新司机图标位置
- 显示司机图标从当前位置向乘客位置移动的动画

### 第五步：司机个人资料编辑
- 在 Profile 页面添加车型、车色、车牌号的编辑表单（仅司机类型用户显示）
