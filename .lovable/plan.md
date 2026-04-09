

# 修复三个媒体选择按钮的行为

## 问题

当前的隐藏 input 配置不够准确，导致点击后仍可能弹出浏览器原生的英文选项面板。

## 修改内容（`src/pages/ChatRoom.tsx`）

### 修改三个隐藏 input 的 accept 和 capture 属性

1. **拍照 input**（`cameraInputRef`）：
   - `accept="image/*,video/*"` — 支持拍照和拍视频
   - `capture="environment"` — 直接打开摄像头，不弹选项

2. **相册 input**（`mediaInputRef`）：
   - `accept="image/*,video/*"` — 照片和视频都可选
   - `multiple` — 多选
   - **不加** `capture` 属性 — 直接打开相册/图库

3. **文件 input**（`fileInputRef`）：
   - `accept="*/*"` — 所有文件类型
   - `multiple` — 多选
   - **不加** `capture` 属性 — 直接打开文件管理器

关键点：`capture` 属性会强制打开摄像头；不加 `capture` 时浏览器会根据 `accept` 类型直接跳到相册或文件管理器，避免弹出英文选项面板。

