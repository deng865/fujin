
结论：之前那次修改不是完全没用，而是只修到了“地图组件内部”的一层；真正把“自己的实时坐标”挡住的问题，还留在父组件 `ChatRoom.tsx` 里，所以效果被抵消了。

1. 真正原因
- `LiveLocationBanner` 已经在持续更新 `cachedMyPos` / `otherCachedPos`
- `LiveLocationMap` 现在也已经改成主要依赖 props 显示自己的位置
- 但 `ChatRoom.tsx` 仍然先把一份“打开地图那一刻的旧快照”存进 `selectedLiveLocation`
- 然后传参时又写成：
  ```ts
  initialMyPos={selectedLiveLocation?.myPos || cachedMyPos}
  initialOtherPos={selectedLiveLocation?.otherPos || otherCachedPos}
  ```
- 这意味着：只要 `selectedLiveLocation` 里有值，后面实时更新的 `cachedMyPos` / `otherCachedPos` 就永远到不了地图

2. 为什么看起来“改了没用”
- 上一次删掉地图里的重复 GPS 监听，解决的是“地图自己抢定位、覆盖 Banner 坐标”的问题
- 但地图虽然不再乱定位了，父组件却还在把“旧坐标快照”优先传给它
- 所以最终表现还是：对方位置可能有，自己的位置不刷新，像是没修好

3. 这次应该怎么改
- 只改 `src/pages/ChatRoom.tsx`
- 把优先级改成“实时缓存优先，旧快照兜底”：
  ```ts
  initialMyPos={cachedMyPos || selectedLiveLocation?.myPos}
  initialOtherPos={otherCachedPos || selectedLiveLocation?.otherPos}
  ```
- 这样只要 Banner 拿到新的实时坐标，地图就能立刻收到并更新 marker

4. 可选加固
- 继续保留 `selectedLiveLocation`，但只把它当“首次打开地图时的兜底值”
- 不再让它充当实时位置主来源，避免以后又把实时数据遮住

5. 为什么这次会生效
- 数据流会重新变成：
  ```text
  Banner 实时定位 → cachedMyPos / otherCachedPos → ChatRoom → LiveLocationMap → marker.setLngLat
  ```
- 地图实例不用重建
- 老手机上也只是更新 marker，不会闪屏或白屏
- 自己和对方的位置都能按实时缓存刷新

6. 修改范围
- 只需要改 1 个文件：
  - `src/pages/ChatRoom.tsx`
