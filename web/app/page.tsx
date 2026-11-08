import EventList from '@/components/EventList';
import { upcomingEvents } from '@/lib/events';

export const revalidate = 3600;

export default function Home() {
  const events = upcomingEvents();
  return (
    <main className="wrap">
      <header className="hero">
        <h1>全球節目表</h1>
        <p className="sub">
          全球電視節目、官方直播、頒獎典禮與賽事，時間全部換算成台灣時間。只導向官方來源。
        </p>
      </header>
      <section>
        <h2>特輯</h2>
        <p>
          <a href="/now">📺 此刻全世界在播什麼：各國電視台節目表（台灣時間）→</a>
        </p>
        <p>
          <a href="/nye-2027">🎆 2027 跨年官方直播表：全世界幾點跨年、去哪裡看 →</a>
        </p>
      </section>
      <section>
        <h2>即將開始</h2>
        <EventList events={events} />
        <p>
          <a href="/upcoming">看全部 →</a>
        </p>
      </section>
    </main>
  );
}
