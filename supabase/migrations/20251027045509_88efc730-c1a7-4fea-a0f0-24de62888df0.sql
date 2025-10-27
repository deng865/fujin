-- 创建更新时间函数（如果不存在）
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建社区帖子表
CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'experience',
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建社区评论表
CREATE TABLE public.community_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用 RLS
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

-- 社区帖子策略
CREATE POLICY "用户可以查看可见的帖子"
ON public.community_posts
FOR SELECT
USING (is_visible = true OR user_id = auth.uid());

CREATE POLICY "用户可以创建帖子"
ON public.community_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的帖子"
ON public.community_posts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的帖子"
ON public.community_posts
FOR DELETE
USING (auth.uid() = user_id);

-- 社区评论策略
CREATE POLICY "所有人可以查看评论"
ON public.community_comments
FOR SELECT
USING (true);

CREATE POLICY "用户可以创建评论"
ON public.community_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的评论"
ON public.community_comments
FOR DELETE
USING (auth.uid() = user_id);

-- 更新时间触发器
CREATE TRIGGER update_community_posts_updated_at
BEFORE UPDATE ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();