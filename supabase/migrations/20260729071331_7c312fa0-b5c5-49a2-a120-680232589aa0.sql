CREATE TABLE public.showcase_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT,
  description TEXT,
  video_kind TEXT NOT NULL DEFAULT 'none',
  video_url TEXT,
  video_storage_path TEXT,
  poster_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT showcase_pages_video_kind_chk CHECK (video_kind IN ('none','upload','embed','direct'))
);

CREATE TABLE public.showcase_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.showcase_pages(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'file',
  storage_path TEXT,
  external_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT showcase_assets_kind_chk CHECK (kind IN ('file','link'))
);

CREATE INDEX idx_showcase_assets_page ON public.showcase_assets(page_id, sort_order);

GRANT SELECT ON public.showcase_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.showcase_pages TO authenticated;
GRANT ALL ON public.showcase_pages TO service_role;

GRANT SELECT ON public.showcase_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.showcase_assets TO authenticated;
GRANT ALL ON public.showcase_assets TO service_role;

ALTER TABLE public.showcase_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published showcase pages are viewable by everyone"
ON public.showcase_pages FOR SELECT
USING (is_published = true OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins manage showcase pages"
ON public.showcase_pages FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Visible showcase assets are viewable by everyone"
ON public.showcase_assets FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    is_visible = true
    AND EXISTS (
      SELECT 1 FROM public.showcase_pages p
      WHERE p.id = showcase_assets.page_id AND p.is_published = true
    )
  )
);

CREATE POLICY "Super admins manage showcase assets"
ON public.showcase_assets FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_showcase_pages_updated_at
BEFORE UPDATE ON public.showcase_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_showcase_assets_updated_at
BEFORE UPDATE ON public.showcase_assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.showcase_pages (slug, title, subtitle, description)
VALUES
  ('demo', 'Docito Demo', 'See the platform in action', NULL),
  ('pitch', 'Docito Pitch', 'Our vision for connected healthcare', NULL)
ON CONFLICT (slug) DO NOTHING;