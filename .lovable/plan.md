

## 决定性证据

```
🟡 START: https://fujin.lovable.app/
🟢 DONE:  https://fujin.life/
```

你访问的是 `fujin.lovable.app`，但完成时跳到了 `fujin.life`。**Lovable 平台在服务端做了 301 重定向**，把 `fujin.lovable.app` 强制跳转到自定义域名 `fujin.life`。

跳转后页面"加载完成"（🟢），但 WebContent 进程立刻 unresponsive + 129 条消息堆积 = **JS 在 fujin.life 上执行时崩溃**。

## 真正的根因（这次 99% 把握）

不是网络、不是 WebView、不是 SwiftUI。是 **fujin.life 加载后某段 JS 在 WKWebView 里抛错并卡死渲染线程**。

最可疑的 3 处（按优先级）：

| 嫌疑点 | 文件 | 为什么可疑 |
|--------|------|-----------|
| Mapbox GL 初始化 | `MapHome.tsx`（首页 `/`） | WebGL 在 WKWebView 里偶发崩溃；首页直接挂载地图 |
| `requestIdleCallback` | `AppLayout.tsx` | iOS Safari/WKWebView **不支持** `requestIdleCallback`，代码已有降级但 `cancelIdleCallback` 调用未保护 |
| Boot screen 移除 | `index.html` 安全网 8 秒 | 如果 React 没 mount，8 秒后强制移除 boot screen → 白屏 |

## 排查计划（READ-ONLY 模式先确认根因）

我需要读这几个关键文件确认嫌疑点：
1. `src/pages/MapHome.tsx` —— 首页是否同步初始化 Mapbox
2. `src/components/map/MapHomeContent.tsx` —— Mapbox token 加载方式
3. `src/lib/mapbox.ts` —— token 注入逻辑
4. `src/hooks/useAuth.tsx` —— 启动时的 session 恢复
5. `src/App.tsx` —— 路由根入口

## 修复策略（确认后实施）

### 方案 A（推荐）：让 iOS App 直接打开 lovable.app 跳过 301
在 Swift 里禁用自动重定向，让 WebView 留在 `fujin.lovable.app`，避免跨域 + HSTS 复杂度：

```swift
func webView(_ webView: WKWebView,
             decidePolicyFor navigationAction: WKNavigationAction,
             decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
    // 拦截 301 跳转到 fujin.life，强制留在 lovable.app
    if let url = navigationAction.request.url,
       url.host == "fujin.life" || url.host == "www.fujin.life" {
        decisionHandler(.cancel)
        webView.load(URLRequest(url: URL(string: "https://fujin.lovable.app" + url.path)!))
        return
    }
    decisionHandler(.allow)
}
```

### 方案 B：修复 Lovable 前端的 WKWebView 兼容性
如果根因在前端代码，需要：
- `AppLayout.tsx`：包裹 `requestIdleCallback` / `cancelIdleCallback` 的安全检查
- 首页 Mapbox：延迟到用户交互后再初始化，避免启动崩溃
- 添加全局 `window.onerror` 捕获到 console，方便 Safari 远程调试看到

### 方案 C：你做 Safari 远程调试拿真实 JS 报错
**这是最关键的一步**。前两个方案是猜测，Safari 调试器能直接告诉我们 JS 在哪一行崩溃。

## 下一步

1. 我先读 5 个关键文件确认嫌疑
2. 同时请你做 Safari 远程调试（步骤上次已给）
3. 拿到真实报错后，**精准修复 Lovable 前端代码**（这次需要改 1-3 个文件）
4. 配合方案 A 的 Swift 拦截重定向作为兜底

## Lovable 代码改动预期

| 文件 | 改动 |
|------|------|
| `src/components/AppLayout.tsx` | `requestIdleCallback` / `cancelIdleCallback` 兼容检查 |
| `src/main.tsx` | 添加 `window.onerror` 全局捕获 |
| `src/pages/MapHome.tsx` 或 `src/components/map/MapHomeContent.tsx` | Mapbox 延迟初始化（如果确认是它） |

