

## 需求

抽屉跟手——上滑/下滑都跟着手指连续移动，松手才吸附到档位，不要弹跳式（snap）跳变。

## 当前问题

`MapHomeContent.tsx` 的 `handleTouchMove` 一旦检测到上滑 40px 就立即 `setMapSwipedUp+1` 触发档位跳一档（peek→half→full），看起来就是"弹跳"。同时 `MapListSheet` 里 `getHeight` 档位间过渡靠 CSS `transition-[height] 300ms`，中间无跟手过程。

## 方案

### 1. 关闭地图层的"上滑触发档位跳变"
删除 `MapHomeContent` 里 `mapSwipedUp` 相关的累加逻辑和 `MapListSheet` 里对应的 useEffect。地图区域的上滑应该**直接驱动抽屉高度连续变化**，而不是触发离散档位切换。

### 2. 地图区上滑 = 抽屉跟手
在 `MapHomeContent` 里改成：
- `touchstart`：记录起点 Y
- `touchmove`：实时计算 `dy`，通过新 prop `dragDelta`（或 ref）传给 `MapListSheet`，让其在当前档位 height 基础上叠加 `dy`，实现跟手
- `touchend`：根据最终 `displayHeight` 吸附到最近档位（hidden/peek/half/full），用 cubic-bezier 平滑到位

### 3. 抽屉自身拖拽已经跟手
`MapListSheet` 已有 `isDragging + dragOffset` 实时计算 `displayHeight`，本身已经跟手（line 225-227）。问题只在地图区触发的"一次性跳档"。把地图区手势接入同一套 `dragOffset` 即可统一。

### 4. 实现方式
最干净的做法：把 `MapListSheet` 的 `onTouchStart/Move/End` 提升出来挂到外层 `MapHomeContent` 的 map 容器上，或者通过 `useImperativeHandle` 暴露 `beginDrag/updateDrag/endDrag` 三个方法给父组件调用。

推荐后者（侵入小）：
- `MapListSheet` 用 `forwardRef + useImperativeHandle` 暴露 `{ beginDrag(y), updateDrag(y), endDrag() }`
- `MapHomeContent` 的 map touch 处理改为：手势起点在屏幕下半部、单指、竖直主导时调用这三个方法

### 5. 吸附动画
保留 `!isDragging` 时的 `transition-[height] 300ms cubic-bezier(0.32,0.72,0,1)`（iOS 标准），松手后从当前 `displayHeight` 平滑到最近档位高度，避免"弹跳"感。

## 改动清单

| 文件 | 改动 |
|------|------|
| `src/components/MapListSheet.tsx` | `forwardRef + useImperativeHandle` 暴露 beginDrag/updateDrag/endDrag；删除 `mapSwipedUp` 累加触发档位跳变的 useEffect；松手吸附到最近档位（按 `displayHeight` 距离判定） |
| `src/components/map/MapHomeContent.tsx` | 删除 `mapSwipedUp` 计数器和相关 prop；改为通过 ref 调用抽屉的 begin/update/endDrag，让地图区上滑/下滑实时驱动抽屉高度跟手 |

## 验证

- 在地图上手指向上慢慢滑：抽屉高度连续跟着手指增加，无跳变
- 在地图上手指向下慢慢滑：抽屉连续收回
- 在抽屉标题/handle 上拖拽：行为一致，跟手
- 松手：以 iOS 缓动平滑吸附到最近档位（peek/half/full/hidden）
- 双指缩放、单指地图平移仍正常（仅竖直主导且起点在下半屏才接管）

