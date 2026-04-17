

## 关键观察

这次日志和上次几乎完全一样，但增加了两条新信息：

```
🟡 START: https://fujin.life/
🟢 DONE: https://fujin.life/
Snapshot request ... code: 6 ("anulled")
Gesture: System gesture gate timed out.
```

**🟢 DONE 触发了**，说明 fujin.life 的 HTML 已经下载并解析完成。但紧接着 WebContent 进程 unresponsive + Snapshot 取消 + 手势网关超时 = **JS 在 React mount 过程中卡死**。

我之前加了 `showFatalOverlay` 红色错误条 + `window.onerror` 全局捕获。但是**你没有提到看到任何红色错误条**。这意味着两种可能：
- A) JS 没抛错，是死循环/同步阻塞导致主线程卡死（红条没机会显示）
- B) 部署还没生效，新代码还没上 fujin.life

## 排查计划（READ-ONLY）

我需要先读这几个文件确认当前状态和根因：

1. `index.html` —— 检查 boot screen 8 秒兜底逻辑、是否有同步阻塞脚本
2. `src/App.tsx` —— 路由根入口，是否有同步初始化崩溃
3. `src/hooks/useAuth.tsx` —— 启动时的 session 恢复，是否有阻塞
4. `src/pages/MapHome.tsx` —— 首页，Mapbox 是否同步初始化
5. `src/lib/mapbox.ts` —— Mapbox token 加载方式
6. `vite.config.ts` —— 是否有 PWA / Service Worker 注册

## 可能的修复方向

| 嫌疑 | 现象 | 修复 |
|------|------|------|
| Mapbox GL 在 WKWebView 启动崩溃 | DONE 后立即 unresponsive | 首页延迟挂载地图（点击后才 mount），或捕获 mapbox 异常降级 |
| `useAuth` 启动死循环 | 主线程卡死无报错 | 检查 onAuthStateChange 是否有同步副作用 |
| Service Worker 注册阻塞 | 进程消息堆积 129 条 | 在 WKWebView 里跳过 SW 注册 |
| 部署延迟 | 新 fix 未生效 | 让用户硬刷新或等部署 |

## 同时建议你做的事（关键）

请**确认两点**，缺一不可：

1. **底部红条**：iPhone 上重新打开 App，停留 10 秒，**屏幕底部有没有红色错误条**？
   - 有 → 截图发我，能精准定位
   - 没有 → 说明 JS 没抛错，是阻塞/死循环

2. **Safari 远程调试**：之前一直没拿到这个数据，这是**唯一能看到 JS 真实状态**的方法
   - iPhone 设置 → Safari → 高级 → 网页检查器 ON
   - Mac Safari → 开发菜单 → 你的 iPhone → fujin.life
   - 截 Console 标签 + Network 标签

## 下一步

批准后我会：
1. 读 6 个关键文件确认根因
2. 根据代码 + 你的反馈（红条 / Safari 调试）给出**精准修复**
3. 预计改 1-2 个文件，主要是首页 Mapbox 延迟初始化 + 启动阶段的兜底捕获

