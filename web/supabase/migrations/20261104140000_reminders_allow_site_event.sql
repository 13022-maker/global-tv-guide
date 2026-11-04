-- 已於 2026-11-04 套用到 Supabase 專案 qsupdpdajbyfdtqmnkib（reminders_allow_site_event）
-- 放進 repo 只為了版本紀錄，不要重複執行
alter table public.reminders drop constraint reminders_target_type_check;
alter table public.reminders add constraint reminders_target_type_check
  check (target_type in ('yt_event','epg_programme','site_event'));
comment on column public.reminders.target_type is 'yt_event=video_id; epg_programme=<channel>|<start>; site_event=站方自建事件 slug（/upcoming/[slug]）';
