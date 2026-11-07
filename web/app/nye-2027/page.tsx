import type { Metadata } from 'next';
import NyeNext from '@/components/NyeNext';
import { NYE_SOURCES, NYE_STOPS, NYE_UPDATED_AT, type NyeStop } from '@/lib/nye2027';
import { fmtShort, toCalUtc } from '@/lib/time';

export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

export const metadata: Metadata = {
  title: '2027 跨年官方直播表：全世界跨年台灣時間一覽｜全球節目表',
  description:
    '從紐西蘭到美國，全世界跨年倒數的台灣時間與官方免費直播管道。跨年要跨 26 小時，一頁看完每個城市幾點跨年、去哪裡看。',
  alternates: { canonical: '/nye-2027' },
  openGraph: {
    title: '2027 跨年官方直播表（台灣時間）',
    description: '全世界跨年要跨 26 小時。每個城市幾點跨年、官方直播在哪裡看。',
    type: 'website',
  },
};

function offsetLabel(min: number) {
  const sign = min >= 0 ? '+' : '−';
  const a = Math.abs(min);
  const h = Math.floor(a / 60);
  const m = a % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

function diffLabel(min: number) {
  const d = min - 480; // 台灣 UTC+8
  if (d === 0) return '與台灣同時';
  const h = Math.abs(d) / 60;
  const hs = Number.isInteger(h) ? `${h}` : h.toFixed(1);
  return d > 0 ? `比台灣早 ${hs} 小時` : `比台灣晚 ${hs} 小時`;
}

function calUrl(s: NyeStop) {
  const start = new Date(new Date(s.midnight).getTime() - 15 * 60_000).toISOString();
  const end = new Date(new Date(s.midnight).getTime() + 30 * 60_000).toISOString();
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${s.flag} ${s.city} 跨年倒數`,
    dates: `${toCalUtc(start)}/${toCalUtc(end)}`,
    details: `台灣時間 ${fmtShort(s.midnight)} 跨年。官方直播與更新：${SITE}/nye-2027#${s.id}`,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

function jsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '2027 跨年官方直播表',
    itemListElement: NYE_STOPS.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Event',
        name: `${s.city} ${s.event}`,
        startDate: s.midnight,
        eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
        location: { '@type': 'Place', name: s.event, address: `${s.city}, ${s.country}` },
      },
    })),
  };
}

export default function Nye2027Page() {
  const stops = [...NYE_STOPS].sort((a, b) => new Date(a.midnight).getTime() - new Date(b.midnight).getTime());
  const first = stops[0];
  const last = stops[stops.length - 1];
  const spanH = Math.round((new Date(last.midnight).getTime() - new Date(first.midnight).getTime()) / 3600_000);

  return (
    <main className="wrap">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />

      <nav className="crumb">
        <a href="/">全球節目表</a> / <a href="/upcoming">即將開始</a> / 2027 跨年
      </nav>

      <header className="hero">
        <p className="eyebrow">2026/12/31 → 2027/1/1・全部換算成台灣時間</p>
        <h1>2027 跨年官方直播表：全世界幾點跨年、去哪裡看</h1>
        <p className="big-time">
          第一個跨年 <strong>{fmtShort(first.midnight)}</strong>，最後一個 <strong>{fmtShort(last.midnight)}</strong>
        </p>
        <p className="sub">
          本表列出的城市，前後跨了 {spanH} 小時。台灣人從除夕傍晚到元旦晚上，可以一路追著官方直播跨好幾次年。
        </p>
        <NyeNext stops={stops.map(({ id, flag, city, midnight }) => ({ id, flag, city, midnight }))} />
      </header>

      <section>
        <h2>跨年時間軸（台灣時間）</h2>
        <ol className="nye-list">
          {stops.map((s) => (
            <li key={s.id} id={s.id}>
              <div className="nye-time">
                <span className="tw">{fmtShort(s.midnight)}</span>
                <span className="diff">{diffLabel(s.utcOffsetMin)}</span>
              </div>
              <div className="nye-body">
                <p className="nye-city">
                  {s.flag} {s.city}
                  <span className="nye-country">{s.country}</span>
                </p>
                <p className="nye-event">
                  {s.event}
                  <small>
                    當地 00:00（{offsetLabel(s.utcOffsetMin)}）
                  </small>
                </p>
                {s.note && <p className="nye-note">{s.note}</p>}
                <div className="nye-watch">
                  {s.watch.length > 0 ? (
                    s.watch.map((w) => (
                      <a key={w.url} className="btn" href={w.url} target="_blank" rel="noopener noreferrer">
                        {w.label} ↗
                      </a>
                    ))
                  ) : (
                    <span className="hint">{s.status === 'pending' ? '2027 官方網址公布後補上' : '目前查不到海外可看的官方直播'}</span>
                  )}
                  <a className="btn" href={calUrl(s)} target="_blank" rel="noopener noreferrer">
                    加入 Google 日曆
                  </a>
                  {s.status === 'pending' && <span className="badge">往年有官方直播，2027 待公告</span>}
                  {s.status === 'confirmed' && <span className="badge ok-badge">已確認</span>}
                  {s.status === 'local' && <span className="badge">僅當地電視台</span>}
                  {s.status === 'none' && <span className="badge">無官方直播</span>}
                  {s.geoNote && <span className="region">{s.geoNote}</span>}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="note">
          本頁只連到主辦單位、城市政府或電視台自己的官方頻道，不提供轉播或非官方串流。2027 的直播網址大多在 12 月才會公布，公布後會更新這頁（最後一次確認時間見頁尾）。
        </p>
      </section>

      <section className="prose">
        <h2>為什麼跨年要跨 {spanH} 小時？</h2>
        <p>
          地球的時區不是整齊的 24 格。太平洋上的吉里巴斯把東半部國土劃進 UTC+14，所以全世界最早跨年，比台灣早 6 小時；美屬薩摩亞在 UTC−11，是有人住的地方裡最後跨年的，比台灣晚 19 小時。兩邊加起來，同一個「1 月 1 日 00:00」在地球上要輪 25 個小時以上。
        </p>
        <p>
          12 月是南半球的夏令時間：紐西蘭是 UTC+13、雪梨是 UTC+11，所以奧克蘭比台灣早 5 小時、雪梨早 3 小時。北半球的歐洲、美國這時候都是標準時間，倫敦比台灣晚 8 小時、紐約晚 13 小時。
        </p>
        <h3>台灣人推薦追法</h3>
        <ul>
          <li>12/31 晚餐時間：紐西蘭奧克蘭（19:00）</li>
          <li>晚上 9 點：雪梨港煙火（21:00）</li>
          <li>晚上 11 點：日本、韓國（23:00）</li>
          <li>午夜：台北 101</li>
          <li>元旦早上 8 點：倫敦；下午 1 點：紐約時代廣場水晶球</li>
        </ul>
      </section>

      <footer className="sources">
        <h2>資料來源</h2>
        <ul>
          {NYE_SOURCES.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="updated">
          最後更新：{fmtShort(NYE_UPDATED_AT)}（台灣時間）。時間與直播管道以主辦單位公告為準。
        </p>
      </footer>
    </main>
  );
}
