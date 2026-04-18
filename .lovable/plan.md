

## 不需要在 Xcode 里改

底部白条是 **Web 端 CSS 问题**，跟 Xcode/iOS 原生壳无关。原生壳只是个浏览器容器，所有布局都来自网页。

## 重新排查

之前改了 `MapListSheet.tsx` 的 `bottom: calc(72px + env(safe-area-inset-bottom))`，但用户说"还是不行"。需要再读实际代码确认改动是否生效，以及 BottomNav 当前结构。

需重读：
- `src/components/MapListSheet.tsx`（确认上次改动是否落地）
- `src/components/BottomNav.tsx`（确认背景层是否真正延伸到底）
- `src/components/map/MapHomeContent.tsx`（看抽屉外面是否还有别的容器留白）

## 可能的真凶（待确认）

**怀疑 1**：BottomNav 外层 `fixed bottom-0` 容器的背景色被 `border-t` 或子元素结构破坏，safe-area 那段实际是透明的，露出底下地图/白底。

**怀疑 2**：MapListSheet 的 `bottom` 改了但 `height` 没相应减少，抽屉被推上去后底部和 BottomNav 之间反而出现新缝。

**怀疑 3**：抽屉的"peek"高度本身就小于 safe-area，导致 peek 模式下露出缝隙。

## 建议的下一步

请在 Lovable 里**点 Build 模式**让我直接读代码并修复。需要在浏览器实际渲染时用 DevTools 量一下白条具体在哪一层，但因为是真机问题，我可以：

1. 重读三个文件，对比上次改动
2. 给 BottomNav 加一个绝对定位的"安全区填充层"兜底
3. 如果还不行，请你截一张 iPhone 16 上首页底部的截图发给我，我能直接看到白条位置并精确定位

## 改动清单（待 Build 模式确认后执行）

| 文件 | 预期改动 |
|------|---------|
| `src/components/BottomNav.tsx` | 确保最外层 fixed 容器背景色铺满，包括 safe-area 区域 |
| `src/components/MapListSheet.tsx` | 复核 `bottom` 值；必要时让抽屉底部直接贴到屏幕底部，内部用 padding 抬高内容 |
| `src/components/map/MapHomeContent.tsx` | 检查地图容器底部是否有未覆盖的区域 |

