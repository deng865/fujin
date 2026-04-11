

# 路线按钮增加地图选择（Apple Maps / Google Maps）

## 改动内容

### 1. 重写 `src/lib/mapNavigation.ts`

不再直接跳转 `maps://`，改为导出一个 React 组件 `MapChoiceDialog`（或独立的选择函数）：

- 点击"路线"时，弹出一个轻量底部弹窗，显示两个选项：
  - **Apple Maps** → `maps://?daddr=${lat},${lng}&dirflg=d`
  - **Google Maps** → `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`
- 两个按钮都使用 `window.location.href` 触发 scheme，iOS 壳层已配置拦截
- iOS 壳层需要同步增加对 `comgooglemaps://` scheme 的拦截（与 `maps://` 同理）

### 2. 创建选择组件 `src/components/MapChoiceSheet.tsx`

- 使用项目已有的 `Drawer` 组件，底部弹出两个按钮
- Apple 地图图标 + "Apple Maps"
- Google 地图图标 + "Google Maps"
- 点击后直接 `window.location.href` 跳转对应 scheme，然后关闭弹窗

### 3. 修改所有调用点

所有 7 个文件中的 `openMapNavigation(lat, lng)` 改为打开选择弹窗：

| 文件 | 说明 |
|------|------|
| `MapListSheet.tsx` | ListCard + PreviewCard 的路线按钮 |
| `InlinePostDetail.tsx` | 全屏详情的路线按钮 |
| `PostBottomSheet.tsx` | 底部帖子预览的路线按钮 |
| `PostDetail.tsx` | 旧详情页的路线按钮 |
| `LocationMessage.tsx` | 聊天位置卡导航 |
| `TripMessage.tsx` | 聊天行程卡导航 |
| `InAppNavMap.tsx` | 聊天内嵌地图导航 |

### 4. iOS 壳层需要同步修改

在 `Coordinator` 的 `decidePolicyFor` 中增加 `comgooglemaps` scheme 拦截：

```swift
if let url = navigationAction.request.url,
   ["maps", "comgooglemaps"].contains(url.scheme) {
    UIApplication.shared.open(url)
    decisionHandler(.cancel)
    return
}
```

同时在 `Info.plist` 中添加 `LSApplicationQueriesSchemes`：
```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>comgooglemaps</string>
</array>
```

## 涉及文件

- `src/lib/mapNavigation.ts` — 保留 URL 构建，去掉直接跳转
- `src/components/MapChoiceSheet.tsx` — 新建选择弹窗组件
- 上述 7 个调用文件 — 改为使用选择弹窗

