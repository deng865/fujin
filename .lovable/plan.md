

## 修复三个问题

### 问题 1 — 「上线」按钮与商家显示状态未跟随定时器同步
**根因**：`MyPostsList.tsx` 没有引入 `isCurrentlyOpen`，UI 只读 `post.is_visible` 这一个原始字段；同时点击"上线"时也没检查当前是否处于定时器的"下班时段"。

**修复（`src/components/profile/MyPostsList.tsx`）**：
1. 引入 `isCurrentlyOpen`，计算每条移动商家帖子的 `scheduledOpen`。
2. 显示状态优先级：
   - 如果有 `operating_hours`：显示由定时器决定的「🟢 服务中 / 🔴 已下班」并附带「⏰ 已定时」徽章；
   - 否则使用现有「在线 / 离线」逻辑（用户手动控制）。
3. 「上线」按钮点击时，如果设置了定时器且当前 `scheduledOpen === false`，先 toast 提示：
   > "当前处于定时下班时段。请先在「自动上下线」中清除定时设置，再手动上线。"
   并阻断后续 update。
4. 按钮文字与色调跟随 `scheduledOpen` 同步：定时下班时按钮显示为灰色 + "已自动下线"占位文案；定时营业中显示「下线」红橙色。

### 问题 2 — 导航菜单 Google 地图按钮被遮挡
**根因**：`MapChoiceSheet.tsx` 的 `DrawerContent` 没有设置 vaul 的 `snapPoints`/初始高度，依赖内容自然撑开。在某些机型上 vaul 默认会以较低的"半屏"高度打开，加上底部 home indicator 的 inset，第二个按钮（Google 地图）被裁掉。

**修复（`src/components/MapChoiceSheet.tsx`）**：
1. 给内层容器加 `min-h-fit` + 显式 `pb-[calc(2.5rem+env(safe-area-inset-bottom))]`，保证内容有足够高度撑开 drawer。
2. 在 `DrawerContent` 上去掉 `max-h-[90dvh]`，改为 `h-auto`，避免 vaul 在小屏上把 content clamp 到第一屏可视高度内。
3. 在按钮列表外层加 `pt-2 pb-6` 内距并将 `space-y-3` 增加到 `space-y-4`，确保两个按钮在所有刘海屏 / 圆角屏完全可见可点。

### 涉及文件
- `src/components/profile/MyPostsList.tsx` — 引入 `isCurrentlyOpen`；同步状态显示与「上线」按钮交互（约 25 行改动）
- `src/components/MapChoiceSheet.tsx` — drawer 高度策略与底部安全区调整（约 5 行改动）

### 预期效果
- 我的发布 → 移动商家：状态文字、「上线/下线」按钮颜色实时跟随定时器变化。
- 处于定时下班时段时点击「上线」，弹出明确提示，阻止违规手动上线。
- 任意机型点击导航按钮，Apple 地图与 Google 地图两个选项都完整可见可点。

