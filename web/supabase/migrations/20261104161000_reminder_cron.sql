-- 每 5 分鐘呼叫 send-reminders Edge Function
-- 已於 2026-11-04 套用到 Supabase 專案 qsupdpdajbyfdtqmnkib（reminder_cron）
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('send-reminders')
 where exists (select 1 from cron.job where jobname = 'send-reminders');

select cron.schedule(
  'send-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://qsupdpdajbyfdtqmnkib.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
