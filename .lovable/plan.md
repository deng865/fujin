

## 真正的根因（之前几次都没修对）

iPhone 16 上**首页/消息/收藏/我的下方那条永远存在的白色横条** ≈ 34px，这不是 BottomNav 的 padding，而是 **iOS WKWebView 的 safe-area 本身**。但我之前所有改动都还在用 `env(safe-area-inset-bottom) * 0.15`，所以仍然保留了一部分空白。viewport 667×628 也证明了底部确实被一条 34px 的白带占用。

实际上问题可能是 **`<meta viewport>` 没有设置 `viewport-fit=cover`**，或 `index.html` 的 `<body>` 有默认 margin/padding，导致 BottomNav 即使 `bottom-0` 也被推离屏幕底边。

## 排查（read-only 模式下需要确认）

1. `index.html` 的 viewport meta 是否包含 `viewport-fit=cover`
2. `index.html` `<body>` / `<html>` 是否有底部 padding/margin
3. `src/index.css` 的 `body`、`html`、`#root` 是否设了 `padding-bottom`
4. 当前 BottomNav 实际计算高度（safe-area 系数 0.15 在 iPhone 16 仍 ≈ 5px，应该不至于 34px 的白带）

如果 viewport 没有 `viewport-fit=cover`，iOS 会自动在底部留 home-indicator 区域作为黑/白边距，**任何 CSS 都改不掉**——必须在 meta 里加 `viewport-fit=cover`。这正是几次"看似改了 BottomNav 但白条依然在"的真实原因。

## 方案

### 步骤 1：确保 viewport 允许内容延伸到 home-indicator 区域
- `index.html` 的 viewport meta 加 `viewport-fit=cover`（如果没有）

### 步骤 2：BottomNav 完全贴底
- `paddingBottom` 系数从 `0.15` 改为 `0`（彻底归零，让背景延伸到屏幕物理底边）
- 同时给图标行加 `paddingBottom: env(safe-area-inset-bottom)` 但在 **图标本身 wrapper** 上用 `marginBottom: calc(env(safe-area-inset-bottom) * -0.5)` 把图标向下推进 home-indicator 上方一点，背景仍然铺满到屏幕底

更稳妥的做法：**让 BottomNav 容器背景色铺满到屏幕物理底边（含 safe-area），图标只占容器上半部分**。这样视觉上：
- 整个底部从图标到屏幕底边都是 `bg-background` 同一个颜色（白色），与图标融为一体
- 不再出现"图标下方一块独立白条"的割裂感

实现：
```tsx
<div className="fixed bottom-0 left-0 right-0 z-[999] bg-background border-t border-border/30"
     style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
  <div className="px-2 pb-1">
    {/* 图标行 */}
  </div>
</div>
```

关键是：**背景色填满到屏幕底（含 home-indicator 区域），图标自然显示在 safe-area 之上**。这就是 iOS 原生 TabBar 的效果，不会有"独立白条"的视觉割裂。

之前几次改的问题在于试图压缩 safe-area，导致图标被 home-indicator 压住或仍有视觉割裂。**正确做法是接受 safe-area 的存在，但让背景颜色统一**——而图标和"白条"本来就是同一个白背景，不是两个东西。

### 步骤 3：MapListSheet 抽屉底部对齐
- 抽屉 `bottom` 偏移 = BottomNav 实际高度（图标行高度，不含 safe-area），让抽屉底部紧贴图标行顶部
- 抽屉自身的背景也延伸到屏幕底（背后是 BottomNav，所以视觉上是连续的）

## 改动清单

| 文件 | 改动 |
|------|------|
| `index.html` | 确认 viewport meta 包含 `viewport-fit=cover`，没有则添加 |
| `src/components/BottomNav.tsx` | 容器 `paddingBottom` 改为完整 `env(safe-area-inset-bottom)`，让白色背景延伸到屏幕物理底边，与图标融为一体 |
| `src/components/MapListSheet.tsx` | 抽屉 `bottom` 改为只对齐图标行高度（约 56px），不计 safe-area |

## 你需要做什么

**不需要任何操作**——批准这个 plan 即可。我之前几次失败的原因是误把 safe-area 当成"多余的 padding"去压缩，但实际上：

> iPhone 16 底部那条"白带" = iOS Home Indicator 安全区。它本来就该存在，关键是让 BottomNav 的**白色背景延伸覆盖它**，让它和图标"融为一体"，而不是去消灭它。

这次方案不再压 safe-area，而是让背景填满整个安全区，视觉上就没有"独立白条"了——这才是 iOS 原生 TabBar 的标准做法。

