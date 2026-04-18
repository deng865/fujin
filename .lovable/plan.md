

## 找到真凶了！

```
map-y0ye4rtO.js:1 Uncaught TypeError: Cannot read properties of undefined (reading 'createContext')
```

这是经典的 **React 重复打包问题**。`map-*.js` 这个 chunk（地图相关代码）里调用 `React.createContext()`，但 `React` 是 `undefined`。

## 根因

Vite 把 React 和地图相关的库（`react-map-gl`、`@mapbox/mapbox-gl-*` 等依赖 React 的库）拆到了不同的 chunk 里：
- `map-*.js` chunk 加载时，依赖的 `react` 还没就绪
- 或者 React 被打包了两份，导致 `react-map-gl` 拿到的是空的 React 模块

这导致 React 还没初始化完，map chunk 就同步执行了 `React.createContext`，直接抛错 → 整个 React 树挂不上去 → 6秒兜底触发 → 白屏。

**这跟 WKWebView 无关，谷歌浏览器也复现，是个纯打包问题。**

## 排查计划（READ-ONLY）

需要读这几个文件确认：

1. `vite.config.ts` —— 看 `manualChunks` 配置，确认 React 是否被错误拆分
2. `package.json` —— 看 React 版本和 mapbox 相关依赖
3. `src/components/map/MapHomeContent.tsx` —— 地图组件实际用了什么库
4. `src/pages/MapHome.tsx` —— 当前 lazy 加载逻辑
5. 检查是否有 `react-map-gl` 这种依赖 React 的二次封装库

## 修复方向（预判）

| 方案 | 改动 |
|------|------|
| **A. 修 `vite.config.ts` manualChunks** | 把 `react`、`react-dom` 强制打到 `vendor` chunk，确保最先加载 |
| **B. 移除自定义 manualChunks** | 让 Vite 用默认策略，避免人为拆分错误 |
| **C. optimizeDeps.include** | 强制预构建 mapbox 相关依赖，避免运行时模块解析失败 |

最可能是 A 或 B。预计改 1 个文件（`vite.config.ts`）就能修好。

## 顺带修品牌名

之前批准过的 `index.html` "华人生活圈" → "华人街坊" 一并改掉（4 处）。

## 实施清单

| 步骤 | 文件 | 改动 |
|------|------|------|
| 1 | `vite.config.ts` | 修复 React chunk 拆分（确认根因后精准改） |
| 2 | `index.html` | "华人生活圈" → "华人街坊"（title / og / boot screen 共 4 处） |

改完后用户：
1. 等 Lovable 自动重新构建（约 1-2 分钟）
2. 浏览器硬刷新 `fujin.life`（Cmd+Shift+R）
3. 确认能看到正确首页 + 标题"华人街坊"
4. iPhone App 重新打开验证

