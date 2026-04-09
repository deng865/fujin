

# 修复：实时位置地图显示不了自己的位置

## 根因

`LiveLocationMap` 有**两个独立的位置来源**互相冲突：

1. **Props 传入**：`initialMyPos` ← `cachedMyPos`（由 Banner 的 `onPositionUpdate` 回调更新）
2. **自身 GPS watch**（第 105-124 行）：使用严格参数 `enableHighAccuracy: true, timeout: 15000`

问题在于：
- Map 自身的 GPS watch 使用 `enableHighAccuracy: true`，老手机上可能一直超时拿不到结果
- 虽然 Banner 已经通过 `onPositionUpdate` 把自己的坐标传给了 ChatRoom 的 `cachedMyPos`，再通过 `initialMyPos` 传给 Map
- 但 Map 内部的 `updateMyPos` 有一个 `hasMeaningfulPositionChange(current, next, 5)` 的过滤（第 64 行），如果 Banner 和 Map 的 GPS watch 同时报告相似坐标，可能导致状态更新被跳过
- 更关键的是：Map 的 GPS watch 报错时会调用 `setGeoError`，这会**覆盖** Banner 传入的有效位置状态，让地图显示错误界面而不是地图

## 修复方案

**删除 Map 组件中冗余的 GPS watch**，完全依赖 Banner 通过 props 传入的坐标。Banner 已经有完善的"先快后精"定位策略，没必要在 Map 中重复定位。

### 文件: `src/components/chat/LiveLocationMap.tsx`

1. **删除自身的 GPS watch**（第 104-124 行）— 不再独立调用 `navigator.geolocation`
2. **直接使用 `initialMyPos` prop 更新 `myPos`**：将现有的 `useEffect([initialMyPos])` 改为无条件同步更新，不再过滤微小位移
3. **移除 `geoError` / `retryCount` 状态**和相关 UI — 定位错误由 Banner 的 `onError` 处理
4. **保留 `myLocationError` prop**（来自 Banner 的 `onError`）用于显示定位异常

这样数据流变为：
```
Banner GPS → onPositionUpdate → ChatRoom.cachedMyPos → Map.initialMyPos → Map.myPos → Marker
```
只有一条路径，不会冲突。

## 修改文件
- `src/components/chat/LiveLocationMap.tsx` — 删除冗余 GPS watch，简化位置数据流

