

## 诊断：为什么抽屉滚动没有谷歌地图顺滑

我深入检查了 `MapListSheet.tsx`、`MapHomeContent.tsx`、`InlinePostDetail.tsx` 和触摸事件链路，找到了 **5 个真正影响顺滑度的根本原因**。问题不在惯性算法本身，而在于「手势识别冲突 + 强制 React 重渲染」。

### 根本原因

**1. 双层 `onTouchMove` 互相打架（最严重）**
`MapHomeContent.tsx` 在最外层 `<div>` 上挂了 `handleTouchStart/Move/End`，在抽屉下半屏的任意位置都会"声称"手势主权（`y > innerHeight * 0.4`），然后通过 imperative handle 直接 `beginDrag()`。但抽屉自己也挂着 `onTouchStart/Move/End`（line 515-517）。两套监听器在抽屉上同时跑，state 互不知情 → 滑动列表时抽屉也在动，造成"粘滞 / 卡顿 / 抢手势"。

**2. 每帧 `forceRender` 触发 React 重渲染**
拖动结束 (`endDragInternal`) 和开始时都调用了 `forceRender((n) => n + 1)`。每次都会让 813 行包含数十张 `ListCard`、`ImageGallery`、`PostCreditBadge` 的整棵子树进入 reconciliation。即使有 `memo`，diff 本身也吃帧。谷歌地图的列表完全不会因为抽屉拖动重渲染。

**3. 抽屉"高度"动画走的是 layout 而不是 transform**
```tsx
style={{ height: `${displayHeight}px` }}   // 触发 layout + paint
```
每帧改 `height` 强制浏览器重新布局整棵子树（包括图片网格、评分、按钮），无法走 GPU compositor。谷歌地图用的是 `transform: translateY()`，只走 compositor 层，永远 60fps。

**4. iOS 滚动惯性被 `overscroll-contain` + 双层 touch 监听破坏**
内部列表用 `overflow-y-auto overscroll-contain`，本应有原生 momentum。但因为外层拦截了 touch，iOS Safari/WKWebView 的"手指松开后继续滑"会被打断，每次都是"摸到哪停到哪"的硬停止。

**5. Snapshot 重建 + 250ms ratings 抖动**
`ratingsEnabled` 在每次 `state` 变化和 `sorted.length` 变化时被重置为 `false`，250ms 后再设为 `true`。拖动时 state 没变，但只要 selectedPost 切换或 posts 异步刷新，列表就闪一下评分。

### 修复方案（按优先级）

**Step 1 — 取消地图层的 touch 拦截，让抽屉独占自己的手势**
在 `MapHomeContent.tsx` 删除 `handleTouchStart/Move/End` 和 `swipeRef` 整套逻辑。地图区只负责地图，抽屉区只负责抽屉。这是谷歌地图的核心架构。

**Step 2 — 抽屉用 `transform: translate3d` 替代 `height`**
- 抽屉始终渲染为最大高度 `90dvh`，通过 `translateY(Ypx)` 把它推到屏幕外。
- 拖动时只改 transform，浏览器走 compositor，不触发 layout。
- 加 `will-change: transform` + `translateZ(0)` 强制独立 GPU 层。

**Step 3 — 删除所有 `forceRender` 调用，拖动状态完全脱离 React**
拖动中不重渲染列表。`isDragging` 用 ref 即可，不需要触发 React。只在 `endDrag` 决定最终 snap state 时调用一次 `setState`。

**Step 4 — 内部列表加 `-webkit-overflow-scrolling: touch`，并清掉 `select-none`**
确保 iOS 原生 momentum scroll，并允许浏览器使用编译器优化路径。

**Step 5 — Ratings 不再随 state 抖动**
`ratingsEnabled` 只依赖 `sorted.length`，不依赖 `state`。

**Step 6 — 抽屉根节点去掉 React 子树重建触发器**
- `displayHeight > 140` 这种基于每帧高度的条件渲染会让 `showList`/`showPeek` 在拖动跨过 140px 时挂载/卸载整个列表。改为基于 `state`（"peek" / "half" / "full"），只在 snap 完成后才切换。

### 涉及的文件
- `src/components/map/MapHomeContent.tsx` — 删除全屏 touch 拦截（约 70 行）
- `src/components/MapListSheet.tsx` — 重构动画引擎为 transform、删 `forceRender`、修挂载条件、修 ratings 依赖（约 100 行改动）
- `src/index.css` — 给 `.mapboxgl-map` 已有的 GPU hint 旁加抽屉专用 `.drawer-gpu` 类（可选）

### 预期效果
- 滑动列表时手指不再"粘"住抽屉。
- 抽屉拖动 60fps，不再受图片/评分数量影响。
- iOS 上松手后列表继续惯性滑动。
- 长列表（50+ 商家）滚动不掉帧。

