

# 收藏按钮位置调整 + 关闭按钮

## 改动内容

### 1. 操作胶囊行统一添加收藏按钮（MapListSheet.tsx）

当前 `ListCard` 和 `PreviewCard` 的操作胶囊行顺序是：路线、私聊、致电、分享（没有收藏）。

改为统一顺序：**路线 → 私聊 → 致电 → 收藏 → 分享**，与 `InlinePostDetail` 保持一致。收藏按钮放在致电和分享之间。

### 2. 预览卡和详情页右上角增加 ✕ 关闭按钮

- **PreviewCard**（半屏预览）：在标题行右侧增加 X 按钮，点击调用 `onBack` 关闭预览回到列表
- **InlinePostDetail**（全屏详情）：在顶部 header 右侧增加 X 按钮，点击调用 `onBack` 关闭详情

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/components/MapListSheet.tsx` | ListCard 和 PreviewCard 胶囊行增加收藏按钮；PreviewCard 标题行右侧加 X 关闭按钮 |
| `src/components/InlinePostDetail.tsx` | 顶部 header 右侧加 X 关闭按钮 |

