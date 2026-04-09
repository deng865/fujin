

# 实时位置共享地图：添加"我的位置"按钮 + 驾车路程信息

## 需求
1. 在地图右下角添加一个定位按钮（类似主页的 Crosshair 圆圈），点击后地图飞到自己的位置
2. 距离信息栏改为显示**驾车路程**（距离 + 预计时间），类似主页导航标注，使用 Mapbox Directions API 获取驾车距离和 ETA
3. 同时在地图上绘制两人之间的驾车路线

## 修改文件

### `src/components/chat/LiveLocationMap.tsx`

**1. 添加"我的位置"按钮**
- 在地图区域右下角叠加一个圆形按钮，图标用 `Crosshair`（与主页一致）
- 点击后调用 `mapRef.current.flyTo({ center: [myPos.lng, myPos.lat], zoom: 16 })`
- 样式：半透明白底、圆角、阴影，与主页 `MapControls` 风格一致

**2. 驾车路线和路程信息**
- 新增 `routeInfo` state：`{ distance: string; duration: string } | null`
- 新增 `useEffect`：当 `myPos` 和 `otherPos` 都存在时，调用 Mapbox Directions API：
  ```
  https://api.mapbox.com/directions/v5/mapbox/driving/{myLng},{myLat};{otherLng},{otherLat}?access_token=...
  ```
- 设置 5 秒防抖，避免频繁请求
- 解析返回的 `routes[0].distance`（米→公里/英里）和 `routes[0].duration`（秒→分钟）
- 在地图上用 GeoJSON source + line layer 绘制路线（蓝色虚线）
- 距离栏改为显示：`驾车 X.X mi · 约 XX 分钟`

**3. 路线图层管理**
- 地图 `load` 事件后添加 `route` source 和 `route-line` layer
- 每次路线更新时用 `map.getSource('route').setData(...)` 更新
- 组件卸载时自动清理（map.remove 已处理）

## UI 布局

```text
┌─────────────────────────────┐
│  ✕   🟢 实时位置共享   结束共享 │  ← header
├─────────────────────────────┤
│  🚗 驾车 2.3 mi · 约 8 分钟   │  ← 路程信息栏
├─────────────────────────────┤
│                             │
│     [地图 + 路线]            │
│                             │
│                        [⊕]  │  ← 我的位置按钮（右下角）
├─────────────────────────────┤
│  🔵我  🟢对方               │  ← legend
└─────────────────────────────┘
```

## 只修改一个文件
- `src/components/chat/LiveLocationMap.tsx`

