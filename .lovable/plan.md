

## 问题诊断

### 1. 右上角三个按钮遮挡问题
- `MapControls` 定位 `top: safe-area-inset-top + 5rem`，在 iOS 上是搜索框（顶部 1rem + 高约 44px ≈ 4rem 总）下方一点点
- 但 `CategoryScroll`（横向分类滚动栏）也在搜索框下方（约 `top: 4.5rem` 区域），三个按钮垂直堆叠后**罗盘 + 图层 + 定位**纵向占用 ~180px，最下面的"定位"按钮会遮挡分类栏右侧的"更多"按钮和右侧分类项

### 2. "附近 N 个结果"栏跳跃感
当前逻辑（`MapListSheet.tsx`）：
- 抽屉档位是 4 个**离散点**：`hidden(28) / peek(72) / half(45vh) / full(85vh)`
- 拖拽中跟手 OK，但**松手后强制 snap 到 4 个档位之一**，中间区域无法停留
- 用户慢速拖到 30vh、60vh 这种"中间位置"，松手立刻被弹回最近档位 → 跳跃感
- 谷歌地图：松手后**也会 snap，但只有 3 档（peek/half/full）且 snap 动画极柔和**，且**peek 高度足够大（~120px 显示标题+1张卡片预览）**，不会有"hidden"档位
- 另外当前 `useEffect` 监听 `selectedCategory/selectedPost` 变化也会硬跳到 half，叠加 spring 动画造成跳变感

## 方案

### A. 重新布局右上角控件
1. **横向排列**三个按钮（罗盘 / 图层 / 定位）在搜索框**右侧同一行**，而不是垂直堆叠
2. 或：把三个按钮放到屏幕**右侧中间靠上**（搜索框 + 分类栏完全显示之下，约 `top: calc(safe-area + 9rem)`），垂直堆叠但给足空间
3. **推荐方案**：参考 Google Maps —— 三个按钮**垂直堆叠在搜索框正下方右侧**，定位起点 = 搜索框底部 + 分类栏底部 + 12px gap。具体值 ≈ `top: calc(env(safe-area-inset-top) + 8.5rem)`，确保三个按钮（共 ~180px）下边界不超过屏幕 60% 高度且不挡分类栏

### B. 消除"附近 N 个结果"跳跃感（学谷歌地图）
1. **删除 `hidden` 档位**：谷歌地图抽屉永远不会完全消失，只会回到 peek
2. **简化为 3 档**：`peek(120px，显示标题 + 1 张卡片预览) / half(50vh) / full(90vh)`
3. **扩大 snap 死区**：松手位置距离最近档位 < **80px** 才回弹该档；超过 80px 但低于 next 档则按速度方向选择
4. **去掉 `selectedCategory` → `setState("half")` 的硬跳**：用户选分类后只刷新数据，**保持当前抽屉位置不变**
5. **`selectedPost` 选中也不强行跳 half**：如果当前已在 half/full，保持；如果在 peek，平滑 spring 到 half
6. **spring 参数微调**：stiffness 180、damping 26（更柔），让 snap 过渡更像 iOS 系统动画
7. **rubber-band 范围扩大**：允许在 peek 之下再拖 60px（视觉"拉到底"反馈），松手回 peek

### C. 关闭按钮也去掉
谷歌地图抽屉头部没有"X"关闭按钮（永远不能关）。移除 `<X>` 按钮，避免用户点了变 hidden 后看不到列表

## 改动清单

| 文件 | 改动 |
|------|------|
| `src/components/MapControls.tsx` | top 改为 `calc(env(safe-area-inset-top) + 8.5rem)`，避开 ControlBar + CategoryScroll；按钮间距减小到 `gap-1.5` |
| `src/components/MapListSheet.tsx` | 删除 `hidden` 档位 + 关闭按钮；peek 高度 72→120px；snap 死区扩到 80px；selectedCategory/selectedPost 不再硬跳 half；spring stiffness 180/damping 26；rubber-band 上下限收紧 |
| `src/components/map/MapHomeContent.tsx` | 同步移除任何 `hidden` 状态依赖（如有） |

## 验证

- 三个右上按钮不遮挡搜索框、分类栏、分类"更多"按钮
- 慢速拖抽屉到任意位置松手 → 平滑回到最近档位，无突然跳变
- 选择分类 / 点击 marker → 抽屉位置保持或柔和过渡
- 抽屉永远显示标题"附近 N 个结果"，无法被关闭

