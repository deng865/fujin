-- 确保所有用户数据表都启用了行级安全(RLS)
-- 这是关键的安全措施，防止未授权的数据访问

-- 核心用户相关表
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.matches ENABLE ROW LEVEL SECURITY;

-- 聊天和消息表
ALTER TABLE IF EXISTS public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 社区功能表
ALTER TABLE IF EXISTS public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_comments ENABLE ROW LEVEL SECURITY;

-- 信息发布表
ALTER TABLE IF EXISTS public.housing_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_posts ENABLE ROW LEVEL SECURITY;

-- 评分和支付表
ALTER TABLE IF EXISTS public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

-- 注意：以下PostGIS系统表不需要RLS，它们是扩展的元数据表
-- geography_columns, geometry_columns, spatial_ref_sys 已自动排除