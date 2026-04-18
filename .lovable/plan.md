

## 理解需求

把"首页/消息/收藏/我的"图标整体**往下移**，让它们贴近 Home Indicator，消除 iPhone 16 上图标上方那一大块空白感。

## 当前问题根因

`BottomNav.tsx` 当前结构：
```
fixed bottom-0 容器（白底）
├─ 图标行（py-2，本身就有上下 padding）
└─ paddingBottom: env(safe-area-inset-bottom)  ← iPhone 16 上 ~34px
```

iPhone 16：safe-area-inset-bottom = 34px，于是图标被往**上**推了 34px，看起来图标上方有大片空白
iPhone XS Max：safe-area-inset-bottom 较小或为 0，所以图标贴底，没问题

## 方案

让图标行**视觉上贴近 Home Indicator**，而不是被推到很高的位置：

1. 减少图标行自身的 `py-2` → `py-1`，让图标整体下沉
2. 把 safe-area padding 减半（`calc(env(safe-area-inset-bottom) / 2)`），图标进入安全区一部分但不会被 Home Indicator 压住
3. 或者：取消顶部的 `pt-1`，只保留必要的底部 safe-area

这样 iPhone 16 图标会下移约 17–20px，更贴近底部；XS Max 视觉无变化。

## 改动清单

| 文件 | 改动 |
|------|------|
| `src/components/BottomNav.tsx` | 外层 padding：`pt-1` → 去掉；`paddingBottom` 从 `env(safe-area-inset-bottom)` 改为 `calc(env(safe-area-inset-bottom) * 0.4)`，图标整体下移 |

## 验证

发布后：
- iPhone 16：图标贴近底部，上方空白消失
- iPhone XS Max：视觉无明显变化
- 安卓：无变化

