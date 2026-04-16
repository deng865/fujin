

# 修复地图标记图标不匹配问题

## 问题根因

`PostMarkers.tsx` 中硬编码了 8 个分类的图标映射，例如 `driver` 被映射为 `UserCheck`（人形图标），但数据库中 `driver` 的图标是 `Car`。其他新增分类（如"上门服务"、"二手商品"、"美容美发"等）完全没有映射，全部回退为默认的 `MapPin` 图标。

数据库实际分类与图标：

```text
driver        → Car（车）      ← 当前错误映射为 UserCheck（人）
on-site service → Truck
second-hand goods → ShoppingBag
food          → UtensilsCrossed ✓
jobs          → Briefcase      ✓
rent          → Home
home services → Wrench
education     → GraduationCap
medical services → Stethoscope
massage       → Baby
beauty        → Baby
law and accounting → Scale
other         → Star
```

## 修复方案

### 修改 `src/components/PostMarkers.tsx`

1. **从数据库加载分类配置**：复用 `CategoryScroll.tsx` 中已有的 `iconMap`，通过 Supabase 查询 `categories` 表获取每个分类的 `name → icon` 映射
2. **动态构建图标和颜色映射**：用数据库返回的图标名称在 `iconMap` 中查找对应的 Lucide 组件
3. **颜色映射**：为所有分类分配区分度高的颜色（基于分类名称的哈希或预设调色板）
4. **删除硬编码的 `categoryIcons` 和 `categoryColors`**

### 具体改动

- **`PostMarkers.tsx`**：引入与 `CategoryScroll` 相同的 Lucide `iconMap`，添加 `useEffect` 从 `categories` 表加载图标映射，用数据库数据替代硬编码映射
- 为确保颜色也正确区分，维护一个基于分类名的颜色池

这样所有分类在地图上的图标都会与分类栏、数据库保持一致。

