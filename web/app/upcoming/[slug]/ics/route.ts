import { EVENTS, getEvent } from '@/lib/events';
import { toCalUtc } from '@/lib/time';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return EVENTS.map((e) => ({ slug: e.slug }));
}

function esc(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const ev = getEvent((await params).slug);
  if (!ev || !ev.main.start) return new Response('Not found', { status: 404 });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';
  const start = ev.preShow?.start ?? ev.main.start;
  const end = ev.main.end ?? ev.main.start;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//global-tv-guide//upcoming//ZH-TW',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${ev.slug}@global-tv-guide`,
    `DTSTAMP:${toCalUtc(ev.updatedAt)}`,
    `DTSTART:${toCalUtc(start)}`,
    `DTEND:${toCalUtc(end)}`,
    `SUMMARY:${esc(ev.shortTitle)}`,
    `LOCATION:${esc(`${ev.venue}, ${ev.city}`)}`,
    `URL:${site}/upcoming/${ev.slug}`,
    `DESCRIPTION:${esc(`詳情與官方觀看管道：${site}/upcoming/${ev.slug}`)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT30M',
    `DESCRIPTION:${esc(ev.shortTitle)} 30 分鐘後開始`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${ev.slug}.ics"`,
    },
  });
}
