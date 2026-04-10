

# 固定商家 vs 移动商家 — 分类展示方案

## 概述

为 `posts` 表增加商家类型区分（固定/移动），固定商家按营业时间自动过滤可见性，移动商家实时追踪位置并模糊化显示。

---

## 1. 数据库迁移

新增三个字段到 `posts` 表：

```sql
ALTER TABLE posts ADD COLUMN is_mobile boolean NOT NULL DEFAULT false;
ALTER TABLE posts ADD COLUMN operating_hours jsonb DEFAULT NULL;
-- operating_hours 格式: {"open": "09:00", "close": "21:00", "timezone": "America/Chicago"}
ALTER TABLE posts ADD COLUMN live_latitude double precision DEFAULT NULL;
ALTER TABLE posts ADD COLUMN live_longitude double precision DEFAULT NULL;
ALTER TABLE posts ADD COLUMN live_updated_at timestamptz DEFAULT NULL;
```

启用 `posts` 的 realtime 以便移动商家位置实时同步：
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
```

## 2. 固定商家 — 营业时间过滤

**前端过滤逻辑（`MapHome.tsx`）：**
- 查询帖子后，对 `is_mobile = false` 且设置了 `operating_hours` 的帖子，判断当前时间是否在营业时段内
- 不在营业时段的固定商家不显示在地图上（灰显或隐藏）
- 用 JS 做时区转换判断，无需数据库触发器

**发布表单（`CreatePost.tsx` + `DynamicForm.tsx`）：**
- 固定商家显示营业时间选择器（开门/关门时间 + 时区下拉）

## 3. 移动商家 — 模糊位置 + 实时追踪

**地图渲染（`PostMarkers.tsx`）：**
- `is_mobile = true` 的帖子使用 `live_latitude/live_longitude`（若有）代替原始坐标
- 渲染为模糊圆形区域（CSS 脉冲动画圆圈，半径 ~500m 对应的像素）而非精确图钉
- 标记样式区分：移动商家带脉冲动画环

**实时位置上报（新建 `src/hooks/useMobileTracking.ts`）：**
- 仅在用户是移动商家且有活跃帖子时激活
- 使用 `navigator.geolocation.watchPosition` 持续监听
- 位移 > 500m 时，通过 `supabase.from('posts').update({ live_latitude, live_longitude, live_updated_at })` 同步
- 组件卸载时清理 watcher

**实时接收（`MapHome.tsx`）：**
- 订阅 `posts` 表的 realtime UPDATE 事件
- 收到移动商家位置更新时，更新本地 state 中对应帖子的坐标

## 4. 发布面板改造

**`CreatePost.tsx`：**
- 选择分类后，显示"固定地址"/"移动服务"切换按钮
- 选择"固定地址"：显示现有地图选点 + 营业时间配置
- 选择"移动服务"：隐藏地图选点，提示"发布后将自动追踪您的位置"，使用当前 GPS 作为初始坐标
- `is_mobile` 写入 payload；固定商家写入 `operating_hours`

**`DynamicForm.tsx`：**
- 新增营业时间输入组件（两个 time input + 时区选择）

## 5. 前端帖子详情适配

**`PostBottomSheet.tsx`：**
- 移动商家显示"🚗 移动服务中"标签 + 最后更新时间
- 固定商家显示"🏪 营业中/已打烊" + 营业时间

---

## 涉及文件

| 文件 | 操作 |
|------|------|
| 数据库迁移 | 新增 `is_mobile`, `operating_hours`, `live_latitude/longitude/updated_at` 字段 + realtime |
| `src/pages/CreatePost.tsx` | 增加固定/移动切换 + payload 适配 |
| `src/components/create-post/DynamicForm.tsx` | 增加营业时间输入组件 |
| `src/components/create-post/LocationPicker.tsx` | 移动服务模式下简化交互 |
| `src/components/PostMarkers.tsx` | 移动商家模糊圆圈 + 脉冲动画 |
| `src/components/PostBottomSheet.tsx` | 营业状态 / 移动状态展示 |
| `src/pages/MapHome.tsx` | 营业时间过滤 + realtime 订阅移动商家位置 |
| `src/hooks/useMobileTracking.ts` | 新建：watchPosition + 500m 位移同步 |

