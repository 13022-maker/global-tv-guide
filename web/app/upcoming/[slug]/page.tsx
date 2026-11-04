import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Countdown from '@/components/Countdown';
import RemindButton from '@/components/RemindButton';
import { EVENTS, getEvent, type SiteEvent } from '@/lib/events';
import { fmtDate, fmtShort, fmtTime, toCalUtc, TAIPEI } from '@/lib/time';

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return EVENTS.map((e) => ({ slug: e.slug }));
}

type Params = { params: Promise<{ slug: string }> };

const CATEGORY_ZH: Record<SiteEvent['category'], string> = {
  music: '音樂',
  sports: '體育',
  game: '電競',
  movie: '電影',
  news: '新聞',
  space: '太空',
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const ev = getEvent((await params).slug);
  if (!ev || !ev.main.start) return {};
  const tw = fmtShort(ev.main.start);
  const description = `${ev.shortTitle} 台灣時間 ${tw} 開始${
    ev.preShow?.start ? `，前導秀 ${fmtTime(ev.preShow.start)}` : ''
  }。${ev.venue}，官方觀看管道、倒數與開播提醒。`;
  return {
    title: `${ev.shortTitle} 台灣時間 ${tw}｜全球節目表`,
    description,
    alternates: { canonical: `/upcoming/${ev.slug}` },
    openGraph: { title: `${ev.shortTitle} 台灣時間 ${tw}`, description, type: 'website' },
  };
}

function jsonLd(ev: SiteEvent) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: ev.shortTitle,
    startDate: ev.main.start,
    endDate: ev.main.end ?? undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
    location: [
      { '@type': 'Place', name: ev.venue, address: ev.city },
      { '@type': 'VirtualLocation', url: ev.officialUrl },
    ],
    url: `${SITE}/upcoming/${ev.slug}`,
    description: ev.intro[0],
  };
}

function googleCalUrl(ev: SiteEvent) {
  const start = ev.preShow?.start ?? ev.main.start!;
  const end = ev.main.end ?? ev.main.start!;
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.shortTitle,
    dates: `${toCalUtc(start)}/${toCalUtc(end)}`,
    details: `台灣時間 ${fmtShort(ev.main.start!)} 典禮開始。詳情：${SITE}/upcoming/${ev.slug}`,
    location: `${ev.venue}, ${ev.city}`,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export default async function UpcomingEventPage({ params }: Params) {
  const ev = getEvent((await params).slug);
  if (!ev || !ev.main.start) notFound();

  const firstStart = ev.preShow?.start ?? ev.main.start;
  const remindAt = new Date(new Date(firstStart).getTime() - 30 * 60_000).toISOString();

  const rows = [ev.preShow, ev.main].filter(Boolean) as NonNullable<typeof ev.preShow>[];

  return (
    <main className="wrap">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(ev)) }}
      />

      <nav className="crumb">
        <a href="/">全球節目表</a> / <a href="/upcoming">即將開始</a> /{' '}
        <a href={`/topic/${ev.category}`}>{CATEGORY_ZH[ev.category]}</a>
      </nav>

      <header className="hero">
        <p className="eyebrow">
          {ev.city}・{ev.venue}
        </p>
        <h1>{ev.title}</h1>
        <p className="big-time">
          台灣時間 <strong>{fmtDate(ev.main.start)} {fmtTime(ev.main.start)}</strong>
        </p>
        {ev.preShow?.start && <p className="sub">前導秀 {fmtTime(ev.preShow.start)} 開始</p>}
        <Countdown start={ev.main.start} end={ev.main.end} />
        <RemindButton
          slug={ev.slug}
          remindAt={remindAt}
          remindLabel={fmtShort(remindAt)}
          googleCalUrl={googleCalUrl(ev)}
          icsUrl={`/upcoming/${ev.slug}/ics`}
        />
      </header>

      <section>
        <h2>時間對照</h2>
        <table className="times">
          <thead>
            <tr>
              <th>項目</th>
              <th>台灣時間</th>
              <th>{ev.sourceTzLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>
                  {r.label}
                  {r.note && <small>{r.note}</small>}
                </td>
                <td className="tw">
                  {fmtShort(r.start!, TAIPEI)}
                  {r.end && `–${fmtTime(r.end, TAIPEI)}`}
                </td>
                <td>
                  {fmtShort(r.start!, ev.sourceTz)}
                  {r.end && `–${fmtTime(r.end, ev.sourceTz)}`}
                </td>
              </tr>
            ))}
            {ev.otherSegments.map((r) => (
              <tr key={r.label} className="tbd">
                <td>
                  {r.label}
                  {r.note && <small>{r.note}</small>}
                </td>
                <td colSpan={2}>{r.start ? fmtShort(r.start) : '待公布'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>在哪裡看</h2>
        <ul className="watch">
          {ev.watch.map((w) => (
            <li key={w.url}>
              <a href={w.url} target="_blank" rel="noopener noreferrer">
                {w.label} ↗
              </a>
              <span className="region">{w.region}</span>
              {!w.verified && <span className="badge">待確認</span>}
            </li>
          ))}
        </ul>
        <p className="note">
          台灣的官方播出或線上直播管道，主辦單位目前尚未公布。公布後會更新在這頁，已設定提醒的人會在提醒信裡收到連結。
        </p>
      </section>

      <section className="prose">
        <h2>關於這場典禮</h2>
        {ev.intro.map((p) => (
          <p key={p.slice(0, 16)}>{p}</p>
        ))}
        {ev.highlights.length > 0 && (
          <>
            <h3>本屆看點</h3>
            <ul>
              {ev.highlights.map((h) => (
                <li key={h.text.slice(0, 16)}>
                  {h.text}
                  {h.source && (
                    <>
                      {' '}
                      <a href={h.source.url} target="_blank" rel="noopener noreferrer" className="src">
                        （{h.source.label}）
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <footer className="sources">
        <h2>資料來源</h2>
        <ul>
          {ev.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="updated">最後更新：{fmtShort(ev.updatedAt)}（台灣時間）。時間以主辦單位公告為準。</p>
      </footer>
    </main>
  );
}
