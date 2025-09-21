-- Schedule cron job to update ratings every hour
SELECT cron.schedule(
  'update-ratings-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://gswwpjdtgsxzcsnrxutu.supabase.co/functions/v1/update-ratings',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzd3dwamR0Z3N4emNzbnJ4dXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTI4MTUsImV4cCI6MjA3MzM2ODgxNX0.YEjg25_0LlzWQoh-SIk-kq_mxcvUoyhODSQ__4DJfSw"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);