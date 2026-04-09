

# 去掉媒体选择弹窗，直接在"+"菜单中放三个按钮

## 问题

当前点击"照片"按钮后会弹出一个中间弹窗再选择，用户希望直接操作，不要额外弹窗。

## 方案（仅修改 `src/pages/ChatRoom.tsx`）

### 1. 将"照片"按钮拆分为三个独立按钮

在 `+` 菜单面板（`showContactMenu`）中，把原来的一个"照片"按钮替换为三个：

- **拍照**（Camera 图标）→ 直接触发 `cameraInputRef.current?.click()`
- **相册**（ImagePlus 图标）→ 直接触发 `mediaInputRef.current?.click()`
- **文件**（File 图标）→ 直接触发 `fileInputRef.current?.click()`

### 2. 删除媒体选择弹窗

移除 `showMediaPicker` state 和整个 `{showMediaPicker && (...)}` 弹窗 JSX 块，不再需要。

### 3. 布局调整

按钮从原来的 4 列变为 6 列（拍照、相册、文件、位置、语音通话、联系方式），保持紧凑排列。如果按钮过多，保持 `grid-cols-4` 自动换行即可。

