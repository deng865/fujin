

# 营业时间改为每周排班 + 必填项强化

## 需求总结

1. **固定商家**：营业时间必填（含24小时选项），描述必填，图片必填
2. **移动服务**：描述必填，图片必填
3. **营业时间升级**：从简单的开/关时间改为每周排班——每天可设不同营业时间，可标记休息日

## 数据格式变更

`operating_hours` JSONB 字段格式从：
```json
{ "open": "09:00", "close": "21:00", "timezone": "America/Chicago" }
```
改为：
```json
{
  "is24h": false,
  "timezone": "America/Chicago",
  "schedule": [
    { "day": 0, "open": "09:00", "close": "21:00", "closed": false },
    { "day": 1, "open": "09:00", "close": "21:00", "closed": false },
    { "day": 2, "open": "09:00", "close": "21:00", "closed": false },
    { "day": 3, "open": "09:00", "close": "21:00", "closed": true },
    ...
  ]
}
```
`is24h: true` 时忽略 schedule，直接判定为营业中。

## 改动方案

### 文件 1：`src/components/create-post/DynamicForm.tsx`
- 描述 Label 加 `*`
- 图片 Label 加 `*`
- 营业时间区域重构为每周排班表：
  - 顶部：24小时营业 Switch 开关
  - 未勾选24h时，显示周一到周日的列表，每天一行：日期名 + 开门时间 + 关门时间 + 休息日复选框
  - 提供"统一设置"快捷操作：设好第一天后可一键应用到所有工作日
- FormData 接口移除 `openTime/closeTime`，改为 `weeklySchedule` 数组 + `is24Hours` 布尔值

### 文件 2：`src/pages/CreatePost.tsx`
- `initialFormData` 更新：添加 `is24Hours: false`，`weeklySchedule` 默认7天数据
- `handleSubmit` 验证逻辑：
  - 描述为空 → 提示错误
  - 图片为空 → 提示错误
  - 固定商家：未勾选24h且未填任何营业时间 → 提示错误
- 构建 `operating_hours` 时使用新的 schedule 格式

### 文件 3：`src/lib/operatingHours.ts`
- `isCurrentlyOpen` 兼容新旧两种格式：
  - 新格式：检查 `is24h`，或根据当前星期几查找对应 schedule 条目判断
  - 旧格式：保持原有逻辑（向后兼容已有数据）

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/components/create-post/DynamicForm.tsx` | 必填标记 + 每周排班表 UI + 24h开关 |
| `src/pages/CreatePost.tsx` | 表单数据结构 + 提交验证 + operating_hours 构建 |
| `src/lib/operatingHours.ts` | 支持新 schedule 格式 + 兼容旧格式 |

