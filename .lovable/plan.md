

# 商家类型区分与位置共享智能警告

## 现状

- `profiles.user_type` 枚举目前只有 `passenger` 和 `driver`，没有商家类型区分
- `posts.is_mobile` 布尔值已区分固定/移动帖子
- 位置共享开关仅是 localStorage 切换，无任何上下文警告
- 行程状态通过聊天消息中的 `trip_accept`/`trip_cancel`/`trip_complete` JSON 追踪，已有 `checkActiveTripLock` 函数

## 方案

不修改数据库枚举——商家类型已通过 `posts.is_mobile` 字段隐式定义：有移动帖子的用户即为 Mobile_Merchant，有固定帖子的用户即为 Static_Merchant，无帖子的普通用户视为乘客/消费者。这样避免额外的数据库迁移，且与现有数据模型一致。

## 改动

### 文件：`src/pages/Profile.tsx`

**加载用户的帖子类型信息，传递给 PrivacySettings：**

- 根据已加载的 `posts` 数据判断用户是否拥有移动帖子（`hasMobilePosts`）
- 使用 `checkActiveTripLock` 判断是否有进行中的行程（`hasActiveTrip`）
- 将 `hasMobilePosts`、`hasActiveTrip` 传递给 `PrivacySettings` 组件

### 文件：`src/components/profile/PrivacySettings.tsx`

**核心改动——位置共享开关增加三种分支逻辑：**

1. **Mobile Merchant（有移动帖子）关闭定位时**：
   - 弹出黄色警告 AlertDialog："关闭位置共享后，您的移动服务帖子将从地图下架（设为离线）"
   - 确认后：调用 `onLocationSharingChange(false)` 并批量将该用户的移动帖子 `is_visible` 设为 `false`

2. **有进行中行程的用户关闭定位时**：
   - 弹出橙色警告 AlertDialog："您有进行中的行程，关闭定位将增加司机寻找您的难度"
   - 确认后：仅关闭定位，不改变帖子状态

3. **固定商家 / 普通用户关闭定位时**：
   - 无弹窗，直接切换，保持固定坐标显示

**新增 Props：**

```typescript
interface Props {
  locationSharing: boolean;
  onLocationSharingChange: (val: boolean) => void;
  onBack: () => void;
  hasMobilePosts: boolean;     // 新增
  hasActiveTrip: boolean;      // 新增
  userId?: string;             // 新增，用于批量下架
}
```

**新增两个确认对话框状态和处理函数：**

```tsx
// 黄色警告 - 移动商家
<AlertDialog open={showMobileWarning}>
  <AlertDialogContent className="border-amber-400">
    <AlertDialogHeader>
      <AlertDialogTitle>⚠️ 移动服务将下架</AlertDialogTitle>
      <AlertDialogDescription>
        关闭位置共享后，您的移动服务帖子将从地图上消失（设为离线状态）。
        如需重新上线，请前往"我的发布"手动操作。
      </AlertDialogDescription>
    </AlertDialogHeader>
    ...
  </AlertDialogContent>
</AlertDialog>

// 橙色警告 - 进行中行程
<AlertDialog open={showTripWarning}>
  <AlertDialogContent className="border-orange-400">
    <AlertDialogHeader>
      <AlertDialogTitle>🚗 行程进行中</AlertDialogTitle>
      <AlertDialogDescription>
        您有进行中的行程，关闭位置共享将增加司机寻找您的难度，建议行程结束后再关闭。
      </AlertDialogDescription>
    </AlertDialogHeader>
    ...
  </AlertDialogContent>
</AlertDialog>
```

**Switch 的 onCheckedChange 逻辑：**

```typescript
const handleToggle = (val: boolean) => {
  if (val) { // 开启 — 无需警告
    onLocationSharingChange(true);
    return;
  }
  // 关闭逻辑
  if (hasMobilePosts) {
    setShowMobileWarning(true);
  } else if (hasActiveTrip) {
    setShowTripWarning(true);
  } else {
    onLocationSharingChange(false); // 固定商家/普通用户，直接关闭
  }
};
```

**移动商家确认后的下架逻辑：**

```typescript
const confirmMobileOffline = async () => {
  if (userId) {
    await supabase.from("posts").update({ is_visible: false })
      .eq("user_id", userId).eq("is_mobile", true);
  }
  onLocationSharingChange(false);
  toast.success("位置共享已关闭，移动服务已下架");
  setShowMobileWarning(false);
};
```

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/Profile.tsx` | 计算 hasMobilePosts/hasActiveTrip，传入 PrivacySettings |
| `src/components/profile/PrivacySettings.tsx` | 增加智能分支警告逻辑与对话框 |

