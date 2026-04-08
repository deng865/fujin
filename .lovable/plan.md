
目标

1. 在实时位置共享地图上实时显示双方距离
2. 修复实时位置共享地图一直卡在“正在获取位置...”

问题定位

- `LiveLocationBanner.tsx` 里定位广播在频道刚创建时就开始了，没有等频道进入 `SUBSCRIBED`；首个坐标很容易发丢，导致对方一直“等待中”。
- `LiveLocationMap.tsx` 又自己启动了一套 `watchPosition`，但地图是否渲染完全依赖 `myPos`。如果新的定位回调迟迟不来，就会一直全屏 loading。
- 地图没有复用 live message 里已经带上的初始坐标，也没有复用共享中已拿到的本机坐标，所以即使共享已经开始，打开地图仍可能卡住。
- `ChatRoom.tsx` 目前只用 `showLiveMap` 布尔值打开地图，没有保存“当前打开的是哪一条实时位置消息”，无法把这条消息的初始坐标传给地图。
- 另外 `live-location-stop` 的监听频道和广播频道不一致，也会让共享状态清理不稳定。

实施方案

1. `ChatRoom.tsx`：保存当前打开的实时位置消息
   - 新增 `selectedLiveLocation` 状态，点击某条实时位置消息时保存其 parsed 数据、发送者身份、初始坐标，再打开地图
   - 同时在父层缓存“我当前最新坐标”，供地图直接使用

2. `LiveLocationBanner.tsx`：作为唯一的定位/广播来源
   - 改成先等待频道 `SUBSCRIBED`，再启动 `watchPosition`
   - 首次拿到坐标后立即 broadcast，并通过回调把最新本机坐标传回 `ChatRoom`
   - 增加 geolocation error 处理；权限拒绝、浏览器不支持、超时都要回传明确状态，不能静默失败

3. `LiveLocationMap.tsx`：只负责显示，不再自己开第二套定位广播
   - 初始化时优先使用：
     - 当前点击的 live message 里的初始坐标
     - 父层缓存的本机最新坐标
   - 只要已知“任意一方”的坐标就先渲染地图，不再整屏卡住
   - 地图继续订阅 `live-loc-${conversationId}`，只接收并更新对方位置
   - loading 逻辑改为分状态展示：
     - 我的位置定位中
     - 等待对方位置更新
     - 权限被拒绝 / 设备不支持定位
   - 即使我方定位还没完成，只要对方初始坐标已知，也先显示对方位置

4. 距离显示
   - 在 `LiveLocationMap.tsx` 里复用项目现有 Haversine 计算思路（可参考 `DriverTracking.tsx`）
   - 当 `myPos` 和 `otherPos` 都存在时，显示双方实时直线距离
   - 单位按项目现有规范使用 `mi`
   - 距离放在地图顶部信息条或底部 legend 上方，实时更新

5. 修正同链路状态清理
   - `ChatRoom.tsx` 中 `live-location-stop` 的监听频道改为和广播一致的 `live-loc-${conversationId}`
   - 对方结束共享后，地图和 banner 都能及时退出“共享中/等待中”状态

涉及文件

- `src/pages/ChatRoom.tsx`
- `src/components/chat/LiveLocationBanner.tsx`
- `src/components/chat/LiveLocationMap.tsx`
- 参考复用：`src/components/chat/DriverTracking.tsx`

Technical details

- 不需要改数据库或后端，只是前端实时位置流和 UI 状态调整
- 距离建议显示为“直线距离”，这样无需额外调用路线 API，更新更快也更稳定
- 地图初始化中心点使用“已知的第一组有效坐标”，而不是强依赖 `myPos`
- 如果当前 live message 是我发出的，就把消息里的初始坐标先当作 `myPos`
- 如果当前 live message 是对方发出的，就把消息里的初始坐标先当作 `otherPos`
- 浏览器定位失败时，显示明确错误提示和重试入口，避免无限转圈

验证重点

1. 两台设备测试：发起实时共享后，双方打开地图都不应再整屏卡在“正在获取位置...”
2. 双方静止不动时，也应该先看到消息里的初始位置点
3. 一方移动后，对方地图位置持续更新
4. 双方位置都可用时，距离数值实时变化
5. 拒绝定位权限 / 浏览器不支持定位时，显示错误状态，而不是一直 loading
