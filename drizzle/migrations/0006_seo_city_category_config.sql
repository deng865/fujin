CREATE TABLE public.seo_cities (
  slug text PRIMARY KEY,
  name_en text NOT NULL,
  name_zh text NOT NULL,
  state text NOT NULL DEFAULT '',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_miles integer NOT NULL DEFAULT 35,
  intro_en text NOT NULL DEFAULT '',
  intro_zh text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.seo_categories (
  slug text PRIMARY KEY,
  name_en text NOT NULL,
  name_zh text NOT NULL,
  post_categories text[] NOT NULL DEFAULT '{}',
  intro_en text NOT NULL DEFAULT '',
  intro_zh text NOT NULL DEFAULT '',
  min_listings integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_cities, public.seo_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_cities, public.seo_categories TO authenticated;
GRANT ALL ON public.seo_cities, public.seo_categories TO service_role;
ALTER TABLE public.seo_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active SEO cities" ON public.seo_cities FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage SEO cities" ON public.seo_cities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public reads active SEO categories" ON public.seo_categories FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage SEO categories" ON public.seo_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));