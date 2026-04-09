
## 修复方向：把“新窗口链接”改成“统一的原生导航跳转”

### 问题判断
我看了当前代码，详情页 `src/pages/PostDetail.tsx` 虽然已经改成了 `https://maps.apple.com/...` 和 `https://www.google.com/maps/dir/...`，但它仍然依赖：

1. `target="_blank"` 新窗口打开  
2. 点击时立刻 `setShowNavChoice(false)` 关闭菜单

这两点在嵌入式预览、iOS WebView、部分移动端浏览器里都可能导致“点了没反应”。

另外，项目里还有另一套旧导航逻辑：`src/components/PostBottomSheet.tsx` 还在用 `window.open("maps://maps.apple.com...")`。说明现在导航实现是分散的，不同页面行为不一致。

### 实施方案
1. **抽出统一导航工具**
   - 新增一个公共 helper（建议 `src/lib/mapNavigation.ts`）
   - 统一接收：`lat / lng / app(apple|google)`
   - 统一处理 iPhone / iPad / Android / 桌面端的跳转地址

2. **修复详情页导航**
   - 修改 `src/pages/PostDetail.tsx`
   - 把当前两个 `<a target="_blank">` 改成按钮点击
   - 点击后直接调用统一 helper，用当前窗口跳转，而不是新窗口
   - 避免“点击时先卸载元素，导致默认跳转失效”

3. **同步修复底部帖子卡片**
   - 修改 `src/components/PostBottomSheet.tsx`
   - 删除旧的 `window.open(...)`
   - 复用同一个 helper，保证详情页和卡片页导航行为一致

4. **做跨平台兜底**
   - Apple 地图：iOS 优先原生拉起，其他环境回退到 Apple Maps 网页链接
   - Google 地图：移动端优先原生拉起，失败时回退到 Google Maps 网页路线页
   - 这样即使用户没装某个地图 App，也至少能打开网页导航

5. **必要时加最后兜底**
   - 如果某些包壳环境仍限制外部跳转，可补一个“复制地址/坐标”入口，避免用户完全无法导航

### 涉及文件
- `src/pages/PostDetail.tsx`
- `src/components/PostBottomSheet.tsx`
- `src/lib/mapNavigation.ts`（新增）

### 技术说明
- 不需要数据库改动
- 这次重点不是继续换链接格式，而是把导航逻辑从“依赖 target=_blank”改成“统一的显式跳转”
- 如果你是在独立 iOS App 包壳里测试，并且网页侧修复后仍然不行，那最后还需要包壳层补外部链接处理；但先统一网页导航逻辑，通常就能解决大部分场景
