

# 在"司机已接单"通知卡片中显示车辆信息

## 现状

`trip_accept_notify` 消息已经包含了 `vehicleModel`、`vehicleColor`、`licensePlate` 和 `driverName`、`driverAvatar`、`driverRating` 字段（在 ChatRoom.tsx 第 786-796 行构建），但通知卡片的渲染代码（TripMessage.tsx 第 360-381 行）只显示了距离和预计到达时间，没有展示任何车辆或司机信息。

## 方案

修改 `src/components/chat/TripMessage.tsx` 中 `trip_accept_notify` 的渲染部分（约第 360-381 行），在卡片中增加：

1. **司机头像和昵称**（顶部，头像 + 名字 + 信用评分星标）
2. **车辆信息行**：车型、车身颜色、车牌号（如 "Toyota Camry · 白色 · ABC-1234"）
3. 如果某项为空则跳过不显示

### 改动示例

```tsx
// 现有的 "🚗 司机已接单，正在赶来" 标题下方新增：
{/* 司机信息 */}
<div className="flex items-center gap-2 mb-2">
  {notifyData.driverAvatar && <img src={notifyData.driverAvatar} className="w-8 h-8 rounded-full" />}
  <div>
    <div className="text-sm font-medium">{notifyData.driverName}</div>
    {notifyData.driverRating && <div className="text-xs text-muted-foreground">⭐ {notifyData.driverRating.toFixed(1)}</div>}
  </div>
</div>

{/* 车辆信息 */}
{(notifyData.vehicleModel || notifyData.licensePlate) && (
  <div className="bg-emerald-100/50 rounded-lg px-3 py-2 mb-1 text-xs">
    🚘 {[notifyData.vehicleModel, notifyData.vehicleColor, notifyData.licensePlate].filter(Boolean).join(" · ")}
  </div>
)}
```

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/components/chat/TripMessage.tsx` | 在 trip_accept_notify 卡片中展示司机头像、昵称、评分和车辆信息 |

无需数据库改动，所需数据已在消息中传递。

