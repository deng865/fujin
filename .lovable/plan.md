

# 恢复原生文件选择器

## 方案

去掉自定义的中文媒体选择弹窗（showMediaPicker），改回点击"照片"按钮直接触发原生 `<input type="file">` 的行为（即 `mediaInputRef.current?.click()`）。

## 修改：`src/pages/ChatRoom.tsx`

1. **第 1339 行**：点击"照片"按钮时直接调用 `mediaInputRef.current?.click()`，不再打开 showMediaPicker
2. **第 1380-1419 行**：删除整个 `{showMediaPicker && (...)}` 弹窗代码块
3. 可选清理：移除 `showMediaPicker` 状态声明、`cameraInputRef`、`fileInputRef` 等不再使用的变量

## 语音功能

上一轮已修复（权限预检查 + MIME 兼容），保持不变。

