-- 启用PostGIS扩展用于地理查询
CREATE EXTENSION IF NOT EXISTS postgis;

-- 更新评分触发器函数，添加自动屏蔽低评分用户逻辑（平均分低于3.5即70%则屏蔽）
CREATE OR REPLACE FUNCTION public.update_user_rating_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_average numeric;
BEGIN
  -- 更新用户的评分统计
  UPDATE public.profiles
  SET 
    total_ratings = total_ratings + 1,
    rating_sum = rating_sum + NEW.rating,
    total_rides = total_rides + 1
  WHERE id = NEW.rated_id;
  
  -- 计算新的平均分
  SELECT (rating_sum + NEW.rating)::numeric / (total_ratings + 1)
  INTO new_average
  FROM public.profiles
  WHERE id = NEW.rated_id;
  
  -- 更新平均评分
  UPDATE public.profiles
  SET average_rating = new_average
  WHERE id = NEW.rated_id;
  
  -- 如果平均分低于3.5（70%的5星），屏蔽用户
  UPDATE public.profiles
  SET is_blocked = CASE 
    WHEN new_average < 3.5 THEN true 
    ELSE false 
  END
  WHERE id = NEW.rated_id;
  
  RETURN NEW;
END;
$$;