

## 问题

iPhone 16 等带 Home Indicator 的设备上，聊天室或其他页面底部出现白色横条。原因：背景色没有延伸到 `safe-area-inset-bottom` 区域，导致系统安全区域露出白底。

## 排查发现（已读相关文件）

需确认以下文件的底部处理方式：
- `src/index.css` — 全局 `body` 背景
- `src/pages/ChatRoom.tsx` — 上次刚改过（把 padding 移到外层），但可能仍有残留
- `src/components/AppLayout.tsx` — 包裹所有页面的容器
- `src/components/BottomNav.tsx` — 底部导航是否覆盖到安全区
- `index.html` — `viewport-fit=cover` meta 是否存在

## 修复方案（统一全局，一次解决所有页面）

### 1. `index.html` — 确保 viewport 覆盖整屏
```html
<meta name="viewport" content="..., viewport-fit=cover" />
```
没有 `viewport-fit=cover`，iOS 不会把内容延伸进安全区，会强制留白边。

### 2. `src/index.css` — 全局背景铺满
```css
html, body {
  background: hsl(var(--background));
  min-height: 100dvh;
}
/* 让根容器也铺满 */
#root {
  min-height: 100dvh;
  background: hsl(var(--background));
}
```

### 3. `src/components/BottomNav.tsx` — 底部导航延伸到安全区
导航栏背景色延伸到 Home Indicator 下方，内部用 `padding-bottom: env(safe-area-inset-bottom)` 把图标/文字推上来，让背景填满白条区域。

### 4. `src/pages/ChatRoom.tsx` — 输入栏同理
输入栏外层背景延伸到底，内层 padding 抬高输入框。

## 改动清单

| 文件 | 改动 |
|------|------|
| `index.html` | 添加 `viewport-fit=cover` |
| `src/index.css` | `#root` 加 `min-height:100dvh` + 背景色 |
| `src/components/BottomNav.tsx` | 背景延伸到底，内部 padding 用 safe-area |
| `src/pages/ChatRoom.tsx` | 输入栏背景延伸到底，内部 padding 用 safe-area |

## 验证

发布后在 iPhone 16 / XS Max / 安卓上分别打开聊天页和首页，底部应全部填满主题色，无白条。

