

## 找到首页底部白条根因

**位置**：`src/components/MapListSheet.tsx` 第 87 行

```ts
const BOTTOM_NAV = 72;  // ❌ 硬编码 72px
```

第 257-260 行用它定位抽屉：
```ts
style={{ bottom: `${BOTTOM_NAV}px`, ... }}
```

**问题**：iPhone 16 的 BottomNav 实际高度 = `72px + safe-area-inset-bottom (~34px)` ≈ **106px**。但抽屉 `bottom` 只留了 72px，所以抽屉底部和 BottomNav 之间露出 ~34px 的地图（白色）。

iPhone XS Max 的 safe-area-inset-bottom 也存在但 BottomNav 的 padding 处理足以覆盖；而 iPhone 16 的 Dynamic Island + 更高的 home indicator 让差距更明显。

## 修复方案

把 `bottom` 用 CSS calc 动态加上 safe-area：

```tsx
// MapListSheet.tsx
style={{
  bottom: `calc(${BOTTOM_NAV}px + env(safe-area-inset-bottom))`,
  height: `${displayHeight}px`,
}}
```

同样需要检查 `MapHomeContent.tsx` 中传给 `MapControls` 的 `bottomOffset={sheetHeight}` 是否也要加 safe-area，让悬浮按钮（定位、图层、罗盘）跟着一起上移，避免被 BottomNav 盖住。

## 改动清单

| 文件 | 改动 |
|------|------|
| `src/components/MapListSheet.tsx` | `bottom` 改成 `calc(72px + env(safe-area-inset-bottom))` |
| `src/components/MapControls.tsx`（如需要） | `bottom` 同样加 `env(safe-area-inset-bottom)` |

## 验证

发布后在 iPhone 16 / XS Max / 安卓上打开首页：
- 底部抽屉应紧贴 BottomNav，无白条
- 悬浮按钮位置正确

