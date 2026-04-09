

# 修复帖子详情页导航跳转问题

## 问题分析

`src/pages/PostDetail.tsx` 第252行和第258行的导航按钮存在两个问题：

1. **Apple Maps URL 协议错误**：使用了 `maps://maps.apple.com/...`，这个自定义协议在 Web 浏览器中无法打开。应改为 `https://maps.apple.com/...`。
2. **`window.open` 被拦截**：移动端浏览器会将非用户直接触发的 `window.open` 视为弹窗广告而拦截。应改用原生 `<a>` 标签替代 `<button>` + `window.open`，确保导航不被阻止。

## 修改方案

**文件：`src/pages/PostDetail.tsx`**

将两个导航 `<button>` 改为 `<a target="_blank">` 标签：

- Apple Maps: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
- Google Maps: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`

约 4 行改动。

