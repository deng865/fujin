

## 移动商家图标放大时消失 - 真正修复

### 复盘已尝试的修复
上次修了 `mobile_location_precise` 字段缺失，并移除了 `fuzzyTick` 60 秒定时器。但用户反馈"放大时移动商家图标依然消失"——说明问题不在数据更新频率。

### 重新调查方向

需要重新打开 `PostMarkers.tsx` 看当前实际代码（上次修改后的状态），重点检查：

1. **Layer 配置**：`icon-size` 是否使用了 zoom 表达式（如 `interpolate ['zoom'] ...`），高 zoom 时被压缩为 0
2. **Cluster 配置**：mobile source 是否启用了 `cluster: true`，高 zoom 时 cluster 解散导致 symbol 不渲染
3. **Filter 表达式**：`filter: ['has', 'point_count']` 之类的表达式是否在高 zoom 时把单个 feature 过滤掉
4. **icon-allow-overlap / symbol-sort-key**：是否在高 zoom 时被其他 layer 遮盖
5. **Source 层级**：`fixed` 和 `mobile` 两个 source 是否共用了同一个 layer id 或同一组 features，导致互相挤掉
6. **Min/Max zoom**：layer 是否设置了 `maxzoom` 限制（mapbox 默认 24，但若有人设了 16 就会消失）

### 修复策略

读完代码后预案：
- 若是 `icon-size` 表达式问题 → 改为常量或扩展 zoom 范围到 22
- 若是 cluster 问题 → 移动商家关闭 cluster（精确位置不应聚合）
- 若是 maxzoom 限制 → 移除或提到 22
- 若是 `icon-allow-overlap: false` → 改为 true 防止被遮盖
- 若是 image 加载问题（高 zoom 重新请求 sprite 失败）→ 改用 marker 元素而非 symbol layer

### 涉及文件
- `src/components/PostMarkers.tsx`（确认 layer/source/filter 配置）
- 可能 `src/components/map/MapHomeContent.tsx`（确认 maxZoom 设置）

### 调查 + 修复合并执行
进入 default mode 后：先 `code--view PostMarkers.tsx` 完整看一遍，定位真因，再针对性 patch（预计 1-2 处改动，<10 行代码）。

