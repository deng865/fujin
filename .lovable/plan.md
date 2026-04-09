

# 修复两个问题

## 问题 1：媒体选择弹窗位置太高

当前弹窗用 `flex items-end` 但缺少底部间距，在某些设备上视觉偏高。

### 修改：`src/pages/ChatRoom.tsx`（约第 1382-1385 行）

- 给弹窗容器加底部 padding，确保贴近屏幕底部
- 给弹窗内容加 `mb-2` 底部间距，视觉更舒适

## 问题 2：语音录音报红色错误

当前代码逻辑本身没问题——`getUserMedia` 在 click handler 内直接调用。但问题可能出在：
1. `startRecording` 是 `useCallback` 包裹的 async 函数，某些浏览器（尤其 iOS Safari）可能在 await 后丢失用户手势上下文
2. 需要加一个 `navigator.permissions.query` 预检查，区分"真正被拒绝"和"其他错误"

### 修改：`src/components/chat/VoiceRecorder.tsx`

1. 在 `startRecording` 开头先用 `navigator.permissions.query({ name: "microphone" })` 检查权限状态（Safari 不支持时 catch 忽略）
2. 如果状态是 `denied`，提示用户去系统设置开启，不再调用 `getUserMedia`
3. 如果 `getUserMedia` 仍然失败但不是 `NotAllowedError`，给出更准确的错误提示（而非"权限被拒绝"）
4. 确保 `getUserMedia` 调用尽可能贴近用户点击事件，减少被浏览器拦截的风险

## 修改文件

- `src/pages/ChatRoom.tsx` — 调整媒体选择弹窗位置（约 3 行改动）
- `src/components/chat/VoiceRecorder.tsx` — 添加权限预检查 + 改进错误处理

