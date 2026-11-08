import type { Metadata } from 'next';
import { getOnAir, listChannels } from '@/lib/epg';
import { fmtShort, fmtTime } from '@/lib/time';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '此刻全世界在播什麼｜全球節目表',
  description: '同一秒，各國電視台正在播什麼？日本、韓國、美國、英國、法國、卡達的節目表，全部換算成台灣時間。',
  alternates: { canonical: '/now' },
};

type SP = { searchParams: Promise<{ at?: string }> };

function parseAt(at?: string) {
  if (!at) return new Date();
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function shift(d: Date, h: number) {
  const t = new Date(d.getTime() + h * 3600_000);
  // 以台灣時間的 ISO 字串放進網址，方便分享與錄影重現
  const tw = new Date(t.getTime() + 8 * 3600_000).toISOString().slice(0, 16);
  return `/now?at=${tw}%2B08:00`;
}

function progress(start: string, stop: string, at: Date) {
  const s = new Date(start).getTime();
  const e = new Date(stop).getTime();
  return Math.min(100, Math.max(0, ((at.getTime() - s) / (e - s)) * 100));
}

export default async function NowPage({ searchParams }: SP) {
  const { at: atParam } = await searchParams;
  const at = parseAt(atParam);
  const channels = await listChannels();
  const rows = await Promise.all(channels.map(async (c) => ({ c, ...(await getOnAir(c.id, at)) })));
  const live = rows.filter((r) => r.now);
  const empty = rows.filter((r) => !r.now);
  const atIso = at.toISOString();

  return (
    <main className="wrap">
      <nav className="crumb">
        <a href="/">全球節目表</a> / 此刻在播
      </nav>

      <header className="hero now-hero">
        <p className="eyebrow">台灣時間</p>
        <h1 className="now-clock">{fmtShort(atIso)}</h1>
        <p className="sub">同一秒，{live.length} 個電視台正在播什麼？各台下方是「當地時間」。</p>
        <div className="now-nav">
          <a className="btn" href={shift(at, -1)}>
            ← 前 1 小時
          </a>
          <a className="btn" href="/now">
            現在
          </a>
          <a className="btn" href={shift(at, 1)}>
            後 1 小時 →
          </a>
        </div>
      </header>

      <ul className="now-grid">
        {live.map(({ c, now, next }) => (
          <li key={c.id} className="now-card" id={encodeURIComponent(c.id)}>
            <div className="now-ch">
              <span className="now-flag">{c.flag}</span>
              <div>
                <p className="now-name">{c.name}</p>
                <p className="now-meta">
                  {c.country}
                  {c.feed ? `・${c.feed}` : ''}
                </p>
              </div>
              <p className="now-local">
                當地 <strong>{fmtTime(atIso, c.tz)}</strong>
              </p>
            </div>
            <p className="now-title">{now!.title}</p>
            {now!.subTitle && <p className="now-sub">{now!.subTitle}</p>}
            {now!.desc && <p className="now-desc">{now!.desc}</p>}
            <div className="now-bar" aria-hidden>
              <span style={{ width: `${progress(now!.start, now!.stop, at)}%` }} />
            </div>
            <p className="now-range">
              台灣 {fmtTime(now!.start)}–{fmtTime(now!.stop)}
              {next && (
                <>
                  ｜下一個：{fmtTime(next.start)} {next.title}
                </>
              )}
            </p>
            <a className="now-more" href={`/channel/${encodeURIComponent(c.id)}`}>
              看完整節目表 →
            </a>
          </li>
        ))}
      </ul>

      {empty.length > 0 && (
        <p className="note">
          這個時間沒有節目資料：{empty.map((r) => r.c.name).join('、')}
        </p>
      )}
      <p className="note">
        節目表資料來自 iptv-org/epg 開放資料，每天更新一次；本站只提供節目表與官方連結，不提供任何轉播。
      </p>
    </main>
  );
}
