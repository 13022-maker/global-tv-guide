-- 提醒寄送：重試欄位、領取函式、cron 密鑰
-- 已於 2026-11-04 套用到 Supabase 專案 qsupdpdajbyfdtqmnkib（reminder_sender）

alter table public.reminders
  add column if not exists attempts   int  not null default 0,
  add column if not exists last_error text;

create index if not exists reminders_due_idx
  on public.reminders (remind_at) where sent_at is null;

-- 領取到期的提醒：先把 sent_at 標上（避免兩次執行重複寄），寄失敗再用 release_reminder 放回
create or replace function public.claim_due_reminders(p_limit int default 50)
returns table (user_id uuid, target_type text, target_id text, remind_at timestamptz, attempts int)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  -- 提醒時間已過 2 小時還沒寄出的，不再寄（事件多半已開始），標記 expired
  update reminders
     set sent_at = now(), last_error = 'expired'
   where sent_at is null and remind_at < now() - interval '2 hours';

  return query
  with due as (
    select r.user_id, r.target_type, r.target_id
      from reminders r
     where r.sent_at is null and r.remind_at <= now() and r.attempts < 3
     order by r.remind_at
     limit p_limit
     for update skip locked
  )
  update reminders r
     set sent_at = now(), attempts = r.attempts + 1, last_error = null
    from due
   where r.user_id = due.user_id and r.target_type = due.target_type and r.target_id = due.target_id
  returning r.user_id, r.target_type, r.target_id, r.remind_at, r.attempts;
end;
$$;

-- 寄送失敗：放回佇列（attempts 已 +1，滿 3 次就不再領取）
create or replace function public.release_reminder(p_user uuid, p_type text, p_id text, p_error text)
returns void
language sql
security definer
set search_path = public
as $$
  update reminders
     set sent_at = null, last_error = left(p_error, 500)
   where user_id = p_user and target_type = p_type and target_id = p_id;
$$;

-- cron 呼叫 Edge Function 用的共用密鑰（存在 Vault，前端拿不到）
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'reminders_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'reminders_cron_secret');
  end if;
end $$;

create or replace function public.reminders_cron_secret()
returns text
language sql
security definer
set search_path = public
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret';
$$;

-- 只給 service_role（Edge Function）用
revoke all on function public.claim_due_reminders(int) from public, anon, authenticated;
revoke all on function public.release_reminder(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.reminders_cron_secret() from public, anon, authenticated;
grant execute on function public.claim_due_reminders(int) to service_role;
grant execute on function public.release_reminder(uuid, text, text, text) to service_role;
grant execute on function public.reminders_cron_secret() to service_role;
