-- Rate Limits Table for Distributed Rate Limiting
-- Used by edge functions for persistent rate limiting across invocations

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  ip_address INET,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created ON public.rate_limits (key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_created ON public.rate_limits (ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_created ON public.rate_limits (user_id, created_at DESC);

-- Simple index for cleanup queries (no partial index with non-immutable function)
CREATE INDEX IF NOT EXISTS idx_rate_limits_created ON public.rate_limits (created_at);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (no user access needed)
-- Edge functions use service role key
CREATE POLICY "Service role full access on rate_limits"
ON public.rate_limits
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Function to clean up old rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE created_at < now() - interval '24 hours';
END;
$$;

-- Comment for documentation
COMMENT ON TABLE public.rate_limits IS 'Stores rate limit tracking data for edge functions. Auto-cleaned after 24 hours.';
COMMENT ON COLUMN public.rate_limits.key IS 'Composite key combining endpoint + IP + user_id for lookups';
COMMENT ON COLUMN public.rate_limits.endpoint IS 'The edge function endpoint being rate limited';
COMMENT ON COLUMN public.rate_limits.ip_address IS 'Client IP address';
COMMENT ON COLUMN public.rate_limits.user_id IS 'Authenticated user ID if available';