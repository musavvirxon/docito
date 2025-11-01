-- Create page_translations table for managing page-level translations and SEO
CREATE TABLE IF NOT EXISTS public.page_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key VARCHAR NOT NULL UNIQUE,
  page_name VARCHAR NOT NULL,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_translations ENABLE ROW LEVEL SECURITY;

-- Super admins can manage page translations
CREATE POLICY "Super admins can manage page translations"
  ON public.page_translations
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Anyone can view published page translations
CREATE POLICY "Anyone can view page translations"
  ON public.page_translations
  FOR SELECT
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_page_translations_updated_at
  BEFORE UPDATE ON public.page_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();