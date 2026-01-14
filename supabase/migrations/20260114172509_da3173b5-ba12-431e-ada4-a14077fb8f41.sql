-- Add parameters column to test_catalog table
-- This stores an array of test parameters with their reference ranges
ALTER TABLE public.test_catalog 
ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.test_catalog.parameters IS 'Array of parameter definitions: [{id, name, unit, result_type, default_range: {low, high, text}, ranges: [{gender, age_min_years, age_max_years, low, high, text}]}]';

-- Create index for better performance when querying parameters
CREATE INDEX IF NOT EXISTS idx_test_catalog_parameters ON public.test_catalog USING gin(parameters);