

## 需求

抽屉向上滑动时，"附近"标题栏 + 下方列表内容作为**一个整体**跟随手势平滑上移，不应出现标题固定、只有列表内部滚动的割裂感。

## 当前实现分析（需读 MapListSheet.tsx 确认）

根据记忆 `mem://ui/post-drawer`，抽屉是多档位（peek/half/preview/full）的 Zero-Nav 设计。常见割裂原因：
- 标题栏（"附近 N 个结果"）放在抽屉**外层 sticky header**，不随 transform 移动
- 列表用独立 `overflow-y-auto` 容器，导致拖拽手势作用在列表滚动而非抽屉位移
- 拖拽 handle 只覆盖顶部小条，标题区域不响应拖拽

## 方案

### 1. 标题栏纳入抽屉拖拽体（核心）
把"附近 N 个结果"标题区域和拖拽 handle 合并为**同一个可拖拽块**，绑定相同的 `onTouchStart/Move/End` 手势，整体跟随抽屉 `translateY` 移动。

### 2. 内容滚动与抽屉拖拽的优先级
- 抽屉**未到 full 档位**时：所有手势 → 抽屉位移（列表 `overflow: hidden` 或 `pointer-events` 让位）
- 抽屉**到达 full 档位且列表 scrollTop > 0** 时：手势 → 列表内部滚动
- 用户向下拉且列表 `scrollTop === 0` 时：手势重新接管为抽屉下移

### 3. 平滑动画
- 拖拽中：`transition: none`，实时跟手
- 松手后：`transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)`（iOS 标准缓动）
- 标题栏与列表共享同一个 `transform` 父容器，确保零割裂

## 改动清单

| 文件 | 改动 |
|------|------|
| `src/components/MapListSheet.tsx` | 标题栏移入拖拽容器；统一手势处理；列表滚动与抽屉位移按档位/scrollTop 切换；松手 iOS 缓动 |

## 验证

- 从 peek 档向上拖拽：标题"附近 N 个结果" + 列表整体平滑上移，无任何元素固定不动
- 到达 full 档位后继续上滑：切换为列表内部滚动
- full 档位列表滚到顶后下拉：抽屉开始下移到 preview/half 档位
- 松手后弹性吸附到最近档位，动画自然

