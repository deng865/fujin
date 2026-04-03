
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: only admins can view/manage roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Categories config table
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text NOT NULL DEFAULT 'MapPin',
  is_visible boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read visible categories
CREATE POLICY "Anyone can view visible categories"
ON public.categories FOR SELECT
USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can insert categories"
ON public.categories FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories"
ON public.categories FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories"
ON public.categories FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Seed default categories
INSERT INTO public.categories (name, label, icon, sort_order) VALUES
  ('housing', '🏠 房产 Housing', 'Home', 1),
  ('jobs', '💼 找工 Jobs', 'Briefcase', 2),
  ('auto', '🚗 汽车 Auto', 'Car', 3),
  ('food', '🍜 美食 Food', 'UtensilsCrossed', 4),
  ('education', '📚 教育 Education', 'GraduationCap', 5),
  ('travel', '✈️ 旅游 Travel', 'Plane', 6),
  ('driver', '🚕 司机 Driver', 'UserCheck', 7),
  ('legal', '⚖️ 法律 Legal', 'Scale', 8);
