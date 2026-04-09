

# 修复导航跳转覆盖当前页面的问题

## 问题原因

`src/lib/mapNavigation.ts` 第 29-34 行的 fallback 逻辑使用了 `window.location.href = urls[app]`，这会**直接替换当前页面**为 Google Maps / Apple Maps，导致：
1. 华人街坊 App 整个被地图页面覆盖
2. 用户无法返回 App

## 修复方案

**文件：`src/lib/mapNavigation.ts`**

1. **删除 `window.location.href` fallback** — 这是导致页面被覆盖的根本原因
2. **改用 `window.open()` 作为兜底** — 如果动态 `<a>` 点击未生效，用 `window.open` 尝试新窗口打开
3. **最终兜底：复制坐标到剪贴板** — 如果所有方法都失败（极端 WebView 环境），提示用户坐标已复制，可手动粘贴到地图 App 搜索

修改约 10 行，仅改动一个文件。

