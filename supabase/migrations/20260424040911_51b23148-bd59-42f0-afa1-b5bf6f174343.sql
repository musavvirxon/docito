-- Schedule daily FX rates refresh job (uses ECB feed via the fx-rates-refresh edge function)
-- Idempotent: drop any existing job with the same name before re-creating it.
DO $$
BEGIN
  PERFORM cron.unschedule('fx-rates-daily');
EXCEPTION WHEN OTHERS THEN
  -- job did not exist, ignore
  NULL;
END $$;

SELECT cron.schedule(
  'fx-rates-daily',
  '15 6 * * *',  -- every day at 06:15 UTC (after ECB publishes ~16:00 CET previous day)
  $$
  SELECT net.http_post(
    url := 'https://gswwpjdtgsxzcsnrxutu.supabase.co/functions/v1/fx-rates-refresh',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzd3dwamR0Z3N4emNzbnJ4dXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTI4MTUsImV4cCI6MjA3MzM2ODgxNX0.YEjg25_0LlzWQoh-SIk-kq_mxcvUoyhODSQ__4DJfSw"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  ) AS request_id;
  $$
);