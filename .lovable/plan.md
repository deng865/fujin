

## 三个问题的诊断与修复

### 问题 1 — 发布页面无法滑动
**根因**：`src/pages/CreatePost.tsx` 的滚动容器（第 302 行 `<div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">`）位于 `fixed inset-0` 的父级中。在 iOS WKWebView / 移动端浏览器里，Tailwind 的 `flex-1` 在某些情况下不会给子元素一个明确的 `min-height: 0`，导致 flex 子项撑满后无法触发内部滚动。同时缺少 `WebkitOverflowScrolling: "touch"`，iOS 原生惯性失效。

**修复**：
- 给滚动容器加 `min-h-0` 并显式 `WebkitOverflowScrolling: "touch"`。
- 文件：`src/pages/CreatePost.tsx`（约 1 行 className 改动 + 1 行 style）。

### 问题 2 — 我的评价页面无法滑动
**根因**：`src/pages/Profile.tsx` 第 277 行 `<div className="min-h-screen bg-background pb-...">`。`min-h-screen` 让外层只是"至少占满屏幕"，但内容超出后是依靠 **document body** 滚动的；而 Profile 所在的 `AppLayout` 是 `100dvh + overflow:hidden` 的全屏布局，body 不会滚动 → 内容就被裁掉看不到也滑不动。

**修复**：
- 把 `min-h-screen` 改为 `h-[100dvh] overflow-y-auto overscroll-contain`，让该子页面自身成为滚动容器。
- 同时修复同文件中其它 subPage（"posts" / "privacy"）的相同问题。
- 文件：`src/pages/Profile.tsx`（3 处 className 改动）。

### 问题 3 — 点击地图标记无法弹出详情 + 标记没有图标
这是两个相关问题：

**3a. 点击地图标记无反应**
**根因**：`MapHomeContent.tsx` 第 355 行 `onClick={() => setMapTapped(...)}` 在地图任意位置点击都会触发 `mapTapped` 自增。而 `MapListSheet` 第 115-123 行的 effect 监听 `mapTapped`，会立即 `onSelectPost(null)` + `setState("peek")`。

时序：用户点击 marker → PostMarkers 内部 `map.on("click", ...)` 调用 `onSelectPost(post)` → 同一帧 MapGL 的 React `onClick` 也触发 `setMapTapped` → effect 把 `selectedPost` 立即清空。结果：抽屉永远不会打开详情。

**修复**：在 PostMarkers 的 click handler 里，命中 marker/cluster 时调用 `e.preventDefault()` 或 `e.originalEvent.stopPropagation()`，并在 MapHomeContent 的 `onClick` 里检查 `e.features` —— 如果点中了标记图层就不重置。最干净的做法是在 PostMarkers 里给 MapGL 的事件设置一个标志位（或检查 `queryRenderedFeatures` 后再决定是否触发 mapTapped）。我们采用：在 `MapHomeContent` 的 `onClick` 里先 `queryRenderedFeatures` 检查是否点到了 `posts-points` 或 `posts-clusters`，是的话不触发 `mapTapped`。

**3b. 标记不再显示对应分类图标**
**根因**：上一轮性能优化（点聚合）把 DOM Marker 改成 Mapbox `circle` 图层，只能渲染纯色圆点 —— 完全丢失了每个分类对应的 Lucide 图标（Home / Car / Coffee 等）。圆点全是颜色编码，用户无法一眼分辨这是餐馆还是律师。

**修复**：用 Mapbox `symbol` 图层 + 自定义 SVG 图标 sprite 渲染分类图标。流程：
1. 应用启动时把分类对应的 Lucide 图标转成 PNG 数据 URL，再通过 `map.addImage(name, image)` 注册为 Mapbox sprite（一次性，缓存到 ref）。
2. GeoJSON feature 的 `properties.icon` 存图标名。
3. 把当前的 `pointLayer`（circle）改为 `symbol` 图层，用 `icon-image: ['get', 'icon']`、`icon-size: 1`、`icon-allow-overlap: true`，并在图标下面叠一层小一点的 `circle` 做彩色背景圆。
4. 这样既保留 GPU 渲染性能，又恢复了"一眼可识别"的图标体验，跟谷歌地图 POI 标记一致。

实现细节：
- 在 `PostMarkers.tsx` 顶部用 `useEffect` + `renderToStaticMarkup`（或 `lucide-react` 的 createElement → canvas → toDataURL）把所有用到的图标预渲染成 32×32 白色 PNG，注册到 map。
- 簇（cluster）保持现有彩色 circle + 数字 symbol 不变。
- "已选中"标记仍然用 DOM Marker（保留缩放动画）。

### 涉及的文件与改动量
- `src/pages/CreatePost.tsx` — 滚动容器加 `min-h-0` + iOS 惯性（约 2 行）
- `src/pages/Profile.tsx` — 3 个 subPage 容器从 `min-h-screen` 改成自身滚动（约 3 行）
- `src/components/map/MapHomeContent.tsx` — `onClick` 里先做 hit-test，命中标记则不重置抽屉（约 10 行）
- `src/components/PostMarkers.tsx` — 新增图标 sprite 注册逻辑 + symbol 图层（约 60 行）

### 预期效果
- 发布页面、评价页面、我的发布、隐私设置都可正常上下滑动。
- 点击地图上任何标记或聚合圆点，都能正确弹出详情或展开聚合。
- 地图标记显示对应分类的白色图标（在彩色圆背景上），跟谷歌地图风格一致。

