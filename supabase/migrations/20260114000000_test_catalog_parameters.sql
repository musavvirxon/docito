-- Add structured measured parameters + reference ranges to test catalog
ALTER TABLE public.test_catalog
ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Optional: speed up searching/filtering within JSON parameters
CREATE INDEX IF NOT EXISTS idx_test_catalog_parameters_gin
ON public.test_catalog
USING gin (parameters);
