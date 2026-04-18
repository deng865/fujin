

## 修复两个问题

### 问题 1：编辑页未回填司机的车辆信息
**现状**：`CreatePost.tsx` 编辑模式下从 `posts` 表读取数据时，只回填了标题/描述/价格/联系方式/图片/营业时间等字段，**完全没有回填司机分类的车型/车色/车牌**。这些信息其实存在 `profiles` 表（发布时同步过去），所以编辑时显示为空，用户被迫重新输入，进而触发"重复信息"校验冲突。

**修复方案**：编辑模式下，若 `category === "driver"`，从 `profiles` 表查询当前用户的 `vehicle_model / vehicle_color / license_plate` 并回填到 `formData.carModel / vehicleColor / licensePlate`。

> 备注：车辆信息原本就以 emoji 拼接在 `description` 里，所以 description 已经包含可见的车辆信息文本。但表单字段需要单独回填，否则用户看不到结构化字段。同时为避免编辑保存时 description 里出现重复的 emoji 拼接，需要先剥离旧的 `🚗/🎨/🔢/🕐` 行再回填到 `description` 字段。

### 问题 2：精确位置模式下，地图标记位置与商家实际位置不一致
**根因**：`PostMarkers.tsx` 第 229 行使用真实的 `live_latitude/live_longitude`，但移动商家如果**还没开始上报实时位置**（`live_latitude` 为 null），就会回落到发帖时存的 `latitude/longitude`——而那个坐标可能是发帖瞬间的位置，与商家"现在"的位置不一致。更重要的是：移动商家发布后需要打开 App 才会触发实时位置上报，未在线时地图会停留在最后已知的 `live_*` 坐标，不会跟随移动。

**这是预期行为**——精确模式只能显示"最近一次上报的位置"。但用户感知到的"位置不一致"很可能是：
1. **`live_latitude` 字段从未被写入** → 显示的是发帖时的初始坐标（可能距离当前位置很远）
2. **实时位置上报机制未触发** → 需要排查 `useMobileTracking` hook 是否在精确模式下正常运行

**修复方案**：
1. 检查 `useMobileTracking` 是否正确为移动商家上报 `live_latitude/live_longitude`
2. 在 `PostMarkers.tsx` 中：精确模式下若 `live_*` 为 null，退回 `latitude/longitude` 时**主动触发一次定位刷新**（仅对当前用户自己的帖子）
3. 在精确模式发布时，立即将当前 GPS 坐标写入 `live_latitude/live_longitude` 字段，避免初次显示位置错位

### 涉及文件
- `src/pages/CreatePost.tsx`：编辑模式下加载车辆信息回填，并在精确模式下提交时同步初始化 `live_latitude/live_longitude`
- `src/hooks/useMobileTracking.ts`（需先查看）：确认精确模式下的上报逻辑
- 可能涉及 `src/components/map/MapHomeContent.tsx` 或 Profile 页：确保移动商家在线时持续上报位置

### 实现步骤
1. CreatePost 编辑模式：driver 分类时查询 profiles 表回填 carModel/vehicleColor/licensePlate
2. CreatePost 提交：移动商家+精确模式时，将 `latitude/longitude` 同步写入 `live_latitude/live_longitude`，确保发布瞬间地图就能正确显示
3. 检查并完善 `useMobileTracking` 确保精确模式下持续上报实时坐标

