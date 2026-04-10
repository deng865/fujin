
结论先说清楚：这次问题基本已经定位了，不是单一按钮没绑好，而是“两层都存在问题”。

1. Web 端当前的统一导航函数 `src/lib/mapNavigation.ts` 仍然依赖 `window.open` 和新窗口思路；这在 iPhone 测试 App 这类内嵌 WebView 场景里，经常会被直接忽略，所以点击后看起来“完全没反应”。
2. 项目里还有多处地图跳转没有完全统一，除了商家浏览页外，聊天里的位置/行程导航仍有直接 `target="_blank"` 的写法。
3. 我检查了当前仓库，没有任何 iOS 包壳代码；也就是说，测试 App 那一层如果没有接管外部链接，单改这个网页仓库，无法把“测试 App 内稳定拉起地图”彻底修好。这也是前两次为什么没修住的核心原因。

实施计划

1. 重做统一导航能力
- 重写 `src/lib/mapNavigation.ts`
- 不再把跳转成功与否寄托在 `_blank`
- 统一生成 Apple Maps / Google Maps 的链接、失败兜底文案、复制坐标兜底

2. 把所有地图入口彻底统一到这一套
- 商家浏览相关：
  - `src/components/MapListSheet.tsx`
  - `src/components/InlinePostDetail.tsx`
  - `src/pages/PostDetail.tsx`
  - `src/components/PostBottomSheet.tsx`
- 聊天相关也一起收口：
  - `src/components/chat/InAppNavMap.tsx`
  - `src/components/chat/LocationMessage.tsx`
  - `src/components/chat/TripMessage.tsx`
- 清掉分散的 `target="_blank"`、局部 `window.open`、各自手写地图 URL

3. 同步修测试 App 的 iPhone 包壳
- 在 iOS 壳层接管 WebView 的外链与新窗口
- 重点处理：
  - `WKUIDelegate.createWebViewWith`
  - `WKNavigationDelegate.decidePolicyFor`
- 命中 Apple Maps、Google Maps 或对应 scheme 时，不在 WebView 内打开，而是交给系统外部打开
- 这样用户点“路线”才会真正拉起地图 App，而不是卡在当前 WebView 里

4. 保留安全兜底
- 继续保留 Apple / Google 选择层
- 若外跳失败，明确提示“无法直接打开地图，已复制坐标”
- 不把 `window.location.href` 作为默认方案，因为这会重现你之前说的“进了地图退不回来”

5. 验证范围
- iPhone 测试 App 里逐个测试：
  - 列表卡片
  - 半屏预览
  - 全屏详情
  - 旧详情页
  - 底部帖子卡
  - 聊天里的位置卡和行程卡
- 重点确认：
  - Apple Maps 能否拉起
  - Google Maps 装/没装时是否都有结果
  - 回到 App 后原页面是否还在
  - 失败时是否正确复制坐标

涉及文件
- `src/lib/mapNavigation.ts`
- `src/components/MapListSheet.tsx`
- `src/components/InlinePostDetail.tsx`
- `src/pages/PostDetail.tsx`
- `src/components/PostBottomSheet.tsx`
- `src/components/chat/InAppNavMap.tsx`
- `src/components/chat/LocationMessage.tsx`
- `src/components/chat/TripMessage.tsx`

技术说明
- 当前仓库里没有 iOS 包壳代码，所以网页侧我可以统一并补强；但“测试 App 内稳定外跳地图”这件事，必须连同 iPhone 壳层一起处理，单改前端网页不够。
- 如果你能提供测试 App 的壳工程，下一步就可以按这个方案把 Web 端和 iOS 包壳一起闭环修掉。
