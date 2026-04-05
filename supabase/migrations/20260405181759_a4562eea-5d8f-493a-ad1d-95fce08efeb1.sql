
ALTER TABLE public.categories ADD COLUMN parent_id uuid DEFAULT NULL REFERENCES public.categories(id) ON DELETE CASCADE;

CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);
