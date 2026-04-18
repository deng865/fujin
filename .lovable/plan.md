

## 需求

参考 Google Maps 的抽屉手感，让上下滑动更顺滑、更自然，达到原生级体验。

## Google Maps 抽屉的关键特征（参考分析）

1. **物理惯性**：松手后不是简单 `transition` 到档位，而是根据**手指松开瞬间的速度**计算继续滑行的距离（velocity-based momentum）
2. **橡皮筋阻尼**：拖到最高/最低档位之外时，继续拖动会有渐进阻力（rubber-band），不是硬停
3. **使用 transform 而非 height**：动画用 `translateY` 走 GPU 合成层，比 `height` 动画流畅得多（避免每帧 layout/reflow）
4. **rAF 节流 + passive listeners**：touchmove 用 `requestAnimationFrame` 批处理，touch 监听器用 `{ passive: true }` 不阻塞滚动
5. **速度预测吸附**：松手时若速度 > 阈值（如 0.5 px/ms），按速度方向跳到下一档而非最近档；速度小才按位置吸附
6. **iOS spring 缓动**：使用 spring 物理曲线（damping/stiffness）而非 cubic-bezier，自然回弹

## 当前问题（基于已知实现）

- `MapListSheet` 用 `height` 动画 → 每帧触发 layout，卡顿
- 松手吸附只看 `displayHeight` 距离，**忽略速度** → 慢拖一点点也会回弹原档，快拖时不够"飞"
- 无橡皮筋，超出最高档直接卡住
- `touchmove` 同步处理，未 rAF 节流
- 缓动是 cubic-bezier 固定 300ms，不像 spring 自然

## 方案

### 1. 改用 transform 驱动动画（核心性能提升）
抽屉外层固定 `height: 100dvh`，内部用 `translateY(Ypx)` 控制可见区域。`translateY` 走 GPU，60fps 无卡顿。

### 2. 引入速度追踪
拖拽过程中记录最近 5 个 touch 点的 `(y, timestamp)`，松手时算瞬时速度 `velocity = Δy / Δt`。

### 3. 速度感知的吸附算法
```
if (|velocity| > 0.5 px/ms) {
  目标 = 沿速度方向的下一个档位
} else {
  目标 = 距离 displayHeight 最近的档位
}
```

### 4. 橡皮筋阻尼
拖出最高/最低档位时，超出部分按 `overshoot * 0.3` 衰减位移，给视觉"拉到尽头"的反馈。

### 5. Spring 物理动画替代 cubic-bezier
用 `framer-motion` 的 `animate(value, target, { type: "spring", damping: 30, stiffness: 300 })`，或自己用 rAF 实现弹簧。考虑到项目已极简，**用 `react-spring` 或 `framer-motion` 任一现成方案最稳**。推荐 `framer-motion`（项目可能已间接依赖；体积可控）。

### 6. rAF 节流 touchmove
```ts
let rafId = 0;
const onMove = (y) => {
  if (rafId) return;
  rafId = requestAnimationFrame(() => { update(y); rafId = 0; });
};
```

### 7. Passive listeners
原生 `addEventListener('touchmove', handler, { passive: true })` 替代 React 的 `onTouchMove`（React 合成事件默认非 passive，会阻塞滚动）。

## 改动清单

| 文件 | 改动 |
|------|------|
| `package.json` | 添加 `framer-motion`（如未有） |
| `src/components/MapListSheet.tsx` | 改 `height` → `transform: translateY`；引入 framer-motion `useMotionValue + animate` 做 spring 动画；touchmove 用 rAF 节流；记录速度；松手按速度+位置选档；超出档位加橡皮筋阻尼 |
| `src/components/map/MapHomeContent.tsx` | 改用原生 `addEventListener('touchstart/move/end', handler, { passive: true })` 替代 React `onTouch*`；继续通过 ref 调用抽屉的 begin/update/end，但同时透传速度 |

## 验证

- 慢拖：抽屉跟手，松手按位置就近吸附
- 快速向上轻扫：抽屉"飞"到 full 档（速度感知）
- 快速向下轻扫：抽屉收到 peek/hidden
- 拖到 full 档继续向上拉：明显阻尼，松手回弹
- 60fps 无卡顿（DevTools Performance 录制确认）
- 地图本身的平移/缩放不受影响

