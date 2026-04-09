
# 点击外部关闭搜索范围下拉框

## 问题
当前搜索范围滑块弹出后，只有再次点击按钮或拖动完成后才会关闭。用户期望点击弹框外部任意位置也能关闭它。

## 修改方案

**文件：`src/components/ControlBar.tsx`**

1. 给搜索范围下拉框的容器 `div` 添加一个 `useRef`
2. 添加 `useEffect`：当 `showDistance` 为 `true` 时，监听 `document` 的 `mousedown` / `touchstart` 事件
3. 如果点击目标不在该容器内，则 `setShowDistance(false)`
4. 清理函数移除事件监听

约 15 行改动。
