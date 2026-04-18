

## 需求拆解

1. **跳跃感问题**：当前抽屉切换 state（peek/half/full）时会触发 React 重渲染，spring 动画从 height A 突然弹到 height B，看起来跳。需要让 state 变化时也走 spring，且整个生命周期 height 完全由 motion value 驱动，不依赖 React state 更新触发重渲染。

2. **点击 post 进详情页改造**：当前点击 post 会进入"selectedPost"模式，抽屉显示一个带"查看详情"提示的 preview 卡片。需求：点击 post 直接进入完整详情视图（像 Google Maps 一样），用户上滑即可看到全部内容，不要中间提示层。

3. **地图控制按钮位置**：右下角三个按键（定位、图层、罗盘）移到右上角固定位置。

## 需要确认的代码

读 `MapListSheet.tsx`（详情视图渲染）、`MapControls.tsx`（按钮位置）、`InlinePostDetail.tsx`（详情内容组件）确认现有结构。

## 方案

### 1. 解决跳跃感
- 抽屉容器始终渲染同一棵 DOM 树，`height` 完全交给 rAF spring loop 驱动，state 变化只更新"目标 height"，不触发重渲染当前 height
- selectedPost 切换时不要让外层结构跳变（只切换内部内容），目标 height 通过 spring 平滑过渡
- 拖拽中实时记录 motion value，松手后 spring 从当前 motion value 平滑插值到 target，无任何 CSS transition 介入

### 2. 点击 post 直接进详情
- 移除 selectedPost 的"preview/查看详情卡片"中间态
- 点击 post 后：
  - 抽屉内容切换为完整 InlinePostDetail（详情全文）
  - 抽屉 spring 到 half 档位（让用户看到顶部信息 + 提示可上滑）
  - 用户上滑 → 进入 full 档查看完整详情
  - 顶部保留返回按钮，点击回到列表

### 3. 三个按键固定到右上角
- `MapControls`：移除 `bottomOffset` 联动逻辑，定位改为 `top-4 right-4`
- 排版：罗盘/图层/定位 三个按钮垂直堆叠在右上角，避开 ControlBar 搜索框（搜索框居中或左侧，按钮右侧；如果搜索框横跨整宽，则按钮放在搜索框下方一行）

## 改动清单

| 文件 | 改动 |
|------|------|
| `src/components/MapListSheet.tsx` | 移除 selectedPost preview 中间态，点击 post 直接渲染 InlinePostDetail；spring 动画完全由 rAF + motion value 驱动，state 仅更新 target，避免重渲染跳变；保留返回按钮 |
| `src/components/MapControls.tsx` | 三个按钮固定 `top-4 right-4` 垂直排列，移除 bottomOffset 逻辑 |
| `src/components/map/MapHomeContent.tsx` | 移除传给 MapControls 的 bottomOffset prop；selectedPost 切换时调用抽屉 spring 到 half |

## 验证

- 慢拖、快滑、点击列表项 → 抽屉始终顺滑无跳变
- 点击地图 marker / 列表 post → 直接看到详情内容（无"查看详情"提示卡）
- 详情页可上滑到 full、下拉返回列表
- 右上角看到三个垂直按钮，不随抽屉移动
- 搜索框与按钮不重叠

