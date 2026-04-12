

# 修复：已关门的固定商家仍然出现在地图上

## 问题分析

当前代码（MapHome.tsx 第 240-243 行）的过滤逻辑有缺陷：

```typescript
if (!p.is_mobile && p.operating_hours) {
  const open = isCurrentlyOpen(p.operating_hours);
  if (open === false) return false;
}
```

问题在于：只有当 `open === false` 时才过滤掉。如果 `isCurrentlyOpen` 返回 `null`（解析出错），商家仍然显示。而且 **没有设置 operating_hours 的固定商家完全不受过滤**。

根据用户原则："只要不在营业时间之内，就在地图上消失"。

## 方案

将过滤条件改为：固定商家必须有 operating_hours 且当前处于营业状态才显示。

### 改动 1：MapHome.tsx 地图标记过滤

```typescript
// 固定商家：必须有营业时间且当前营业中才显示
if (!p.is_mobile) {
  const open = isCurrentlyOpen(p.operating_hours);
  if (open !== true) return false;  // null 或 false 都隐藏
}
```

### 改动 2：MapListSheet.tsx 列表过滤（如有独立过滤逻辑）

同步更新列表中的过滤逻辑，确保一致性。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/MapHome.tsx` | 固定商家过滤条件从 `open === false` 改为 `open !== true` |

