-- Daily Reminder Cron Job untuk FinSmart
-- Jalankan di Supabase Dashboard → SQL Editor

-- Aktifkan ekstensi pg_cron dan pg_net (jika belum)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Jadwalkan cron: setiap hari jam 20:00 WIB = 13:00 UTC
-- Format cron: menit jam hari bulan hari-dalam-seminggu
SELECT cron.schedule(
  'finsmart-daily-reminder',   -- nama job (unik)
  '0 13 * * *',                -- setiap hari 13:00 UTC = 20:00 WIB
  $$
  SELECT net.http_post(
    url := 'https://mmthhlxrjrgfjghigzzl.supabase.co/functions/v1/daily-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  )
  $$
);

-- Verifikasi job terdaftar:
-- SELECT * FROM cron.job;

-- Untuk hapus job jika diperlukan:
-- SELECT cron.unschedule('finsmart-daily-reminder');
