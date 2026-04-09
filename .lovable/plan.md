

# 点击分类图标自动展开帖子列表

## 修改内容

### 1. `src/components/MapListSheet.tsx`
- Props 新增 `selectedCategory: string | null`
- 添加 `useEffect`：当 `selectedCategory` 从 null 变为非 null 时，调用 `setState("half")` 展开面板

### 2. `src/pages/MapHome.tsx`
- 将 `selectedCategory` 传给 `<MapListSheet>` 组件

共约 5 行改动。

