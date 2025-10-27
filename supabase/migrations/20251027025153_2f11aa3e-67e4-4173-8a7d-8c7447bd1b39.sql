-- 创建用户类型枚举
CREATE TYPE public.user_type AS ENUM ('passenger', 'driver');

-- 创建行程类型枚举
CREATE TYPE public.ride_type AS ENUM ('taxi', 'carpool');

-- 创建状态枚举
CREATE TYPE public.ride_status AS ENUM ('open', 'closed', 'matched');
CREATE TYPE public.match_status AS ENUM ('pending', 'confirmed');

-- 创建用户配置表（存储额外用户信息）
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type public.user_type NOT NULL,
  wechat_id TEXT,
  phone TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  location JSONB, -- {lat, lng, address}
  verified BOOLEAN DEFAULT false,
  total_rides INT DEFAULT 0,
  total_ratings INT DEFAULT 0,
  rating_sum INT DEFAULT 0,
  average_rating DECIMAL(3,2) GENERATED ALWAYS AS (
    CASE WHEN total_ratings > 0 THEN rating_sum::DECIMAL / total_ratings ELSE 0 END
  ) STORED,
  is_blocked BOOLEAN GENERATED ALWAYS AS (
    CASE WHEN total_ratings >= 10 AND (rating_sum::DECIMAL / total_ratings) < 3.5 THEN true ELSE false END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建行程信息表
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ride_type public.ride_type NOT NULL,
  title TEXT NOT NULL,
  current_location JSONB, -- 打车用：{lat, lng, address}
  from_location JSONB, -- 拼车用：{lat, lng, address}
  to_location JSONB, -- {lat, lng, address}
  waypoints JSONB, -- 途径地点数组
  departure_time TIMESTAMPTZ,
  seats_available INT, -- 车主的可载人数
  passenger_count INT, -- 乘客的人数
  price_share DECIMAL(10,2),
  description TEXT,
  status public.ride_status DEFAULT 'open',
  is_visible BOOLEAN DEFAULT true,
  expire_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建匹配记录表
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status public.match_status DEFAULT 'pending',
  distance_km DECIMAL(10,2),
  estimated_time_minutes INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建聊天消息表
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'voice'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建评分表
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
  rater_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rated_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ride_id, rater_id, rated_id)
);

-- 创建租房信息表
CREATE TABLE public.housing_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location JSONB NOT NULL, -- {lat, lng, address}
  rent_price DECIMAL(10,2) NOT NULL,
  bedrooms INT,
  bathrooms INT,
  images JSONB, -- 图片URL数组
  contact_info TEXT,
  is_visible BOOLEAN DEFAULT true,
  expire_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建招聘信息表
CREATE TABLE public.job_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  description TEXT NOT NULL,
  location JSONB, -- {lat, lng, address}
  salary_range TEXT,
  job_type TEXT, -- 'full-time', 'part-time', 'contract'
  contact_info TEXT,
  is_visible BOOLEAN DEFAULT true,
  expire_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建支付记录表
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_type TEXT NOT NULL, -- 'ride_passenger', 'ride_driver', 'housing', 'job'
  post_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL, -- 'wechat', 'stripe'
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Profiles RLS 策略
CREATE POLICY "用户可以查看所有配置文件"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "用户可以更新自己的配置文件"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "用户可以插入自己的配置文件"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Rides RLS 策略
CREATE POLICY "用户可以查看可见的行程"
  ON public.rides FOR SELECT
  USING (is_visible = true OR user_id = auth.uid());

CREATE POLICY "用户可以创建自己的行程"
  ON public.rides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的行程"
  ON public.rides FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的行程"
  ON public.rides FOR DELETE
  USING (auth.uid() = user_id);

-- Matches RLS 策略
CREATE POLICY "用户可以查看自己相关的匹配"
  ON public.matches FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT user_id FROM public.rides WHERE id = ride_id)
  );

CREATE POLICY "用户可以创建匹配"
  ON public.matches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的匹配"
  ON public.matches FOR UPDATE
  USING (auth.uid() = user_id);

-- Chat Messages RLS 策略
CREATE POLICY "用户可以查看相关聊天消息"
  ON public.chat_messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.matches WHERE id = match_id
      UNION
      SELECT user_id FROM public.rides WHERE id IN (
        SELECT ride_id FROM public.matches WHERE id = match_id
      )
    )
  );

CREATE POLICY "用户可以发送消息"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Ratings RLS 策略
CREATE POLICY "所有人可以查看评分"
  ON public.ratings FOR SELECT
  USING (true);

CREATE POLICY "用户可以创建评分"
  ON public.ratings FOR INSERT
  WITH CHECK (auth.uid() = rater_id);

-- Housing Posts RLS 策略
CREATE POLICY "用户可以查看可见的租房信息"
  ON public.housing_posts FOR SELECT
  USING (is_visible = true OR user_id = auth.uid());

CREATE POLICY "用户可以创建租房信息"
  ON public.housing_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的租房信息"
  ON public.housing_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的租房信息"
  ON public.housing_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Job Posts RLS 策略
CREATE POLICY "用户可以查看可见的招聘信息"
  ON public.job_posts FOR SELECT
  USING (is_visible = true OR user_id = auth.uid());

CREATE POLICY "用户可以创建招聘信息"
  ON public.job_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的招聘信息"
  ON public.job_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的招聘信息"
  ON public.job_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Payments RLS 策略
CREATE POLICY "用户可以查看自己的支付记录"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建支付记录"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 创建触发器函数：自动更新 updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为各表添加更新时间触发器
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_housing_posts_updated_at BEFORE UPDATE ON public.housing_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_posts_updated_at BEFORE UPDATE ON public.job_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 创建触发器函数：新用户注册时自动创建配置文件
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_type, name, wechat_id, phone)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'user_type')::public.user_type, 'passenger'),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'wechat_id',
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 创建用户注册触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 创建触发器函数：评分后更新用户统计
CREATE OR REPLACE FUNCTION public.update_user_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    total_ratings = total_ratings + 1,
    rating_sum = rating_sum + NEW.rating,
    total_rides = total_rides + 1
  WHERE id = NEW.rated_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建评分触发器
CREATE TRIGGER on_rating_created
  AFTER INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_user_rating_stats();

-- 启用实时功能
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.housing_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_posts;