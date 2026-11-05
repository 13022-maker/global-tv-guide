// 給 send-reminders Edge Function 用：提醒信需要事件名稱、台灣時間、觀看管道
import { EVENTS } from '@/lib/events';
import { fmtShort, fmtTime } from '@/lib/time';

export const dynamic = 'force-static';
export const revalidate = 3600;

export function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';
  const data = EVENTS.filter((e) => e.main.start).map((e) => ({
    slug: e.slug,
    title: e.shortTitle,
    url: `${site}/upcoming/${e.slug}`,
    start: e.main.start,
    start_tw: fmtShort(e.main.start!),
    pre_show_tw: e.preShow?.start ? fmtTime(e.preShow.start) : null,
    venue: `${e.venue}, ${e.city}`,
    watch: e.watch.filter((w) => w.verified).map((w) => ({ label: w.label, url: w.url, region: w.region })),
  }));
  return Response.json({ events: data });
}
