
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(reporter_id, post_id)
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "用户可以提交举报"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view own reports
CREATE POLICY "用户可以查看自己的举报"
ON public.reports FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "管理员可以查看所有举报"
ON public.reports FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update reports (process them)
CREATE POLICY "管理员可以处理举报"
ON public.reports FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
