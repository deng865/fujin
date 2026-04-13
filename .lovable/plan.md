

# 修复"我的评价"页面 — 完整方案

## 根因

`reviews` 表的插入一直在**静默失败**。原因：
- `profiles.average_rating` 是一个 `GENERATED ALWAYS` 列（由数据库自动根据 `rating_sum / total_ratings` 计算）
- 但 `reviews` 表的触发器 `trg_recalculate_rating` 尝试 `UPDATE profiles SET average_rating = ...`
- PostgreSQL 不允许写入 GENERATED 列，导致触发器报错，整个 INSERT 事务回滚
- 所以 `reviews` 表始终为空

## 修复步骤

### 1. 修复触发器函数（数据库迁移）

修改 `recalculate_user_rating()` 函数，移除对 `average_rating` 的写入（它会自动计算）：

```sql
CREATE OR REPLACE FUNCTION recalculate_user_rating()
RETURNS TRIGGER AS $$
DECLARE
  _receiver_id UUID;
  _sum INTEGER;
  _count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _receiver_id := OLD.receiver_id;
  ELSE
    _receiver_id := NEW.receiver_id;
  END IF;

  SELECT COALESCE(SUM(rating), 0), COUNT(*)
  INTO _sum, _count
  FROM public.reviews
  WHERE receiver_id = _receiver_id;

  UPDATE public.profiles
  SET rating_sum = _sum,
      total_ratings = _count,
      updated_at = now()
  WHERE id = _receiver_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### 2. 增强 handleRateTrip 错误处理（ChatRoom.tsx）

在 `reviews.insert` 后检查错误，失败时给用户提示。

### 3. 重构"我的评价"页面（Profile.tsx + ReviewList.tsx）

**星级汇总**：显示平均分、总评价数、各星级分布（5星占比、4星占比等）条形图。

**匿名显示**：收到的评价隐藏发送者头像和姓名，统一显示"匿名用户"。我给出的评价正常显示对方信息。

**标签汇总**：收集所有评价的 tags，按出现频次排序显示前 8 个。

**24小时延迟**：收到的评价查询增加 `created_at` 过滤条件 `<= now() - 24h`，24小时内的评价不对被评价者可见。

### 4. ReviewList 改进

- `type="received"` 时：查 `receiver_id = userId`，显示"匿名用户"，不显示头像
- `type="sent"` 时：查 `sender_id = userId`，显示 `receiver_id` 对应的用户名和头像
- 收到的评价加 24 小时延迟过滤

## 涉及文件

| 文件 | 改动 |
|------|------|
| 数据库迁移 | 修复 `recalculate_user_rating` 触发器 |
| `src/pages/ChatRoom.tsx` | reviews.insert 加错误处理 |
| `src/pages/Profile.tsx` | 评价页增加星级分布图和标签汇总 |
| `src/components/reviews/ReviewList.tsx` | 匿名显示 + 24h延迟 + sent类型显示接收者信息 |

