-- Create translation_keys table for managing multilingual content
CREATE TABLE IF NOT EXISTS public.translation_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR NOT NULL UNIQUE,
  module VARCHAR NOT NULL,
  context TEXT,
  source_text TEXT NOT NULL,
  translations JSONB DEFAULT '{}'::jsonb,
  status JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create translation_history table for version tracking
CREATE TABLE IF NOT EXISTS public.translation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_key_id UUID REFERENCES public.translation_keys(id) ON DELETE CASCADE,
  language VARCHAR NOT NULL,
  previous_text TEXT,
  new_text TEXT,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  environment VARCHAR DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create translation_memory table for TM suggestions
CREATE TABLE IF NOT EXISTS public.translation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text TEXT NOT NULL,
  target_text TEXT NOT NULL,
  source_language VARCHAR NOT NULL DEFAULT 'en',
  target_language VARCHAR NOT NULL,
  module VARCHAR,
  confidence_score DECIMAL(3,2) DEFAULT 1.0,
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create glossary table for terminology management
CREATE TABLE IF NOT EXISTS public.translation_glossary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term VARCHAR NOT NULL,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  enforce BOOLEAN DEFAULT false,
  category VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.translation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_glossary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for translation_keys
CREATE POLICY "Anyone can view translation keys"
  ON public.translation_keys
  FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage translation keys"
  ON public.translation_keys
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for translation_history
CREATE POLICY "Super admins can view translation history"
  ON public.translation_history
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert translation history"
  ON public.translation_history
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for translation_memory
CREATE POLICY "Anyone can view translation memory"
  ON public.translation_memory
  FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage translation memory"
  ON public.translation_memory
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for translation_glossary
CREATE POLICY "Anyone can view glossary"
  ON public.translation_glossary
  FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage glossary"
  ON public.translation_glossary
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_translation_keys_module ON public.translation_keys(module);
CREATE INDEX idx_translation_keys_key ON public.translation_keys(key);
CREATE INDEX idx_translation_history_key_id ON public.translation_history(translation_key_id);
CREATE INDEX idx_translation_memory_source ON public.translation_memory(source_text);
CREATE INDEX idx_translation_memory_languages ON public.translation_memory(source_language, target_language);
CREATE INDEX idx_glossary_term ON public.translation_glossary(term);

-- Function to log translation changes
CREATE OR REPLACE FUNCTION log_translation_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.translation_history (
    translation_key_id,
    language,
    previous_text,
    new_text,
    changed_by,
    environment
  )
  SELECT 
    NEW.id,
    lang,
    OLD.translations->lang,
    NEW.translations->lang,
    NEW.updated_by,
    'production'
  FROM jsonb_object_keys(NEW.translations) AS lang
  WHERE (OLD.translations IS NULL OR OLD.translations->lang IS DISTINCT FROM NEW.translations->lang);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for translation change logging
CREATE TRIGGER translation_change_trigger
  AFTER UPDATE ON public.translation_keys
  FOR EACH ROW
  EXECUTE FUNCTION log_translation_change();

-- Insert initial common translations
INSERT INTO public.translation_keys (key, module, source_text, translations, status) VALUES
  ('siteName', 'common', 'Docito', '{"en":"Docito","ru":"Docito","uz":"Docito","ar":"Docito","tr":"Docito"}'::jsonb, '{"en":"approved","ru":"approved","uz":"approved","ar":"approved","tr":"approved"}'::jsonb),
  ('navigation.home', 'common', 'Home', '{"en":"Home","ru":"Главная","uz":"Bosh sahifa","ar":"الرئيسية","tr":"Ana Sayfa"}'::jsonb, '{"en":"approved","ru":"approved","uz":"approved","ar":"approved","tr":"approved"}'::jsonb),
  ('navigation.doctors', 'common', 'Doctors', '{"en":"Doctors","ru":"Врачи","uz":"Shifokorlar","ar":"الأطباء","tr":"Doktorlar"}'::jsonb, '{"en":"approved","ru":"approved","uz":"approved","ar":"approved","tr":"approved"}'::jsonb),
  ('buttons.search', 'common', 'Search', '{"en":"Search","ru":"Поиск","uz":"Qidirish","ar":"بحث","tr":"Ara"}'::jsonb, '{"en":"approved","ru":"approved","uz":"approved","ar":"approved","tr":"approved"}'::jsonb)
ON CONFLICT (key) DO NOTHING;