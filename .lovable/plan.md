

# 首页默认显示10英里范围

## 问题
当前地图初始缩放级别硬编码为 `zoom: 12`，与10英里搜索范围不匹配。用户定位成功后 `flyTo` 也没有指定匹配10英里的zoom，导致实际可见范围和搜索半径不一致。

## 修改方案

**文件：`src/pages/MapHome.tsx`**

1. **初始 zoom 使用 `radiusToZoom(10, lat)` 计算**：将 `initialViewState.zoom` 从硬编码 `12` 改为 `radiusToZoom(10, DEFAULT_CENTER.lat)`，确保首次渲染就显示10英里范围。

2. **定位成功后 flyTo 也指定 zoom**：第102行 `flyTo` 添加 `zoom: radiusToZoom(10, loc.lat)`，让定位到用户位置后依然显示10英里视野。

共约2行改动。

