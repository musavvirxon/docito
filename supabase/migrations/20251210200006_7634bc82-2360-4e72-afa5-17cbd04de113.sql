-- Create search_history table for autocomplete suggestions
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  search_term TEXT NOT NULL,
  search_type TEXT DEFAULT 'general', -- 'doctor', 'practice', 'specialty', 'location'
  filters JSONB DEFAULT '{}',
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create popular_searches view for trending searches
CREATE TABLE public.popular_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_term TEXT NOT NULL UNIQUE,
  search_count INTEGER DEFAULT 1,
  last_searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create saved_searches for users
CREATE TABLE public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  search_term TEXT,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popular_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- Search history policies (private to user + super_admin)
CREATE POLICY "Users can view their own search history"
ON public.search_history FOR SELECT
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can insert their own search history"
ON public.search_history FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can delete their own search history"
ON public.search_history FOR DELETE
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Popular searches policies (public read)
CREATE POLICY "Anyone can view popular searches"
ON public.popular_searches FOR SELECT
USING (true);

CREATE POLICY "System can manage popular searches"
ON public.popular_searches FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Saved searches policies (private to user)
CREATE POLICY "Users can view their saved searches"
ON public.saved_searches FOR SELECT
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can create saved searches"
ON public.saved_searches FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their saved searches"
ON public.saved_searches FOR DELETE
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Create indexes
CREATE INDEX idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX idx_search_history_term ON public.search_history(search_term);
CREATE INDEX idx_popular_searches_count ON public.popular_searches(search_count DESC);
CREATE INDEX idx_saved_searches_user_id ON public.saved_searches(user_id);

-- Function to update popular searches
CREATE OR REPLACE FUNCTION public.update_popular_search(term TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.popular_searches (search_term, search_count, last_searched_at)
  VALUES (lower(trim(term)), 1, now())
  ON CONFLICT (search_term) 
  DO UPDATE SET 
    search_count = popular_searches.search_count + 1,
    last_searched_at = now();
END;
$$;