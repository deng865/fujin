

## 修复地图选择弹窗底部遮挡

当前 `pb-8`（2rem）不够，Google 地图按钮被 iPhone 底部安全区遮住。只需把底部内边距从 `pb-8` 改成 `pb-14`（3.5rem），把按钮整体往上推，不影响其他底部布局。

### 改动

**文件**: `src/components/MapChoiceSheet.tsx` 第 31 行

```
// 之前
<div className="px-5 pt-4 pb-8 space-y-3">

// 之后
<div className="px-5 pt-4 pb-14 space-y-3">
```

仅增加弹窗内部的底部 padding，不涉及任何全局布局或其他组件。

