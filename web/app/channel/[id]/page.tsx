import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { availableDates, getChannel, getDay, listChannels } from '@/lib/epg';
import { fmtDate, fmtTime } from '@/lib/time';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ date?: string; at?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeURIComponent((await params).id);
  const ch = getChannel(await listChannels(), id);
  if (!ch) return {};
  return {
    title: `${ch.name} 節目表（台灣時間）｜全球節目表`,
    description: `${ch.flag} ${ch.name}（${ch.country}）今天播什麼？節目表全部換算成台灣時間。`,
  };
}

function twToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
}

export default async function ChannelPage({ params, searchParams }: Props) {
  const id = decodeURIComponent((await params).id);
  const { date: dateParam, at: atParam } = await searchParams;
  const ch = getChannel(await listChannels(), id);
  if (!ch) notFound();

  const dates = await availableDates(id);
  const date = dateParam && dates.includes(dateParam) ? dateParam : dates.includes(twToday()) ? twToday() : dates.at(-1);
  if (!date) notFound();
  const list = await getDay(id, date);
  const at = atParam && !Number.isNaN(new Date(atParam).getTime()) ? new Date(atParam) : new Date();
  const t = at.getTime();

  return (
    <main className="wrap">
      <nav className="crumb">
        <a href="/">全球節目表</a> / <a href="/now">此刻在播</a> / {ch.name}
      </nav>
      <header className="hero">
        <p className="eyebrow">
          {ch.flag} {ch.country}
          {ch.feed ? `・${ch.feed}` : ''}
        </p>
        <h1>{ch.name} 節目表</h1>
        <p className="sub">{fmtDate(`${date}T12:00:00+08:00`)}・時間為台灣時間，右側為當地時間</p>
        <div className="now-nav">
          {dates.map((d) => (
            <a key={d} className={`btn${d === date ? ' btn-on' : ''}`} href={`?date=${d}`}>
              {d.slice(5).replace('-', '/')}
            </a>
          ))}
        </div>
      </header>

      <ol className="sched">
        {list.map((p) => {
          const on = new Date(p.start).getTime() <= t && t < new Date(p.stop).getTime();
          return (
            <li key={`${p.start}${p.title}`} className={on ? 'on' : undefined} id={on ? 'on-air' : undefined}>
              <span className="sched-tw">{fmtTime(p.start)}</span>
              <div>
                <p className="sched-title">
                  {on && <span className="badge ok-badge">播出中</span>} {p.title}
                </p>
                {p.desc && <p className="sched-desc">{p.desc}</p>}
              </div>
              <span className="sched-local">當地 {fmtTime(p.start, ch.tz)}</span>
            </li>
          );
        })}
      </ol>
      {list.length === 0 && <p className="note">這天沒有節目資料。</p>}
    </main>
  );
}
