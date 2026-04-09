

# 零结果提示 + 点击地图收回弹框

## 修改内容

### 1. `src/components/MapListSheet.tsx`
- **零结果提示**：在空状态区域（第213-216行），当 `selectedCategory` 有值但结果为0时，额外显示"请扩大搜索范围"提示文字
- **暴露收回方法**：新增 prop `onMapClick`（或直接用 `setState`），但更简单的做法是新增 prop `collapsed: boolean`，由父组件控制

实际最简方案：新增 prop `onRequestCollapse` 不需要，直接让父组件传一个 `mapTapped` 计数器或布尔值触发收回。

最简实现：
- 新增 prop `mapTapped: number`（每次点击地图+1）
- `useEffect` 监听 `mapTapped` 变化，当 state 为 half/full 时收回到 peek

### 2. `src/pages/MapHome.tsx`
- 新增 `mapTapped` state
- 在 `<MapGL>` 上添加 `onClick` 事件，递增 `mapTapped`
- 将 `mapTapped` 传给 `<MapListSheet>`

## 具体改动

**MapListSheet.tsx**：
1. Props 增加 `mapTapped: number`
2. 空状态文字改为：当有 `selectedCategory` 时显示"该分类附近暂无内容，请扩大搜索范围"
3. 新增 `useEffect`：监听 `mapTapped`，当值 > 0 时将 state 收回到 `"peek"`

**MapHome.tsx**：
1. 新增 `const [mapTapped, setMapTapped] = useState(0)`
2. `<MapGL>` 添加 `onClick={() => setMapTapped(n => n + 1)}`
3. `<MapListSheet>` 传入 `mapTapped={mapTapped}`

共约 10 行改动。

