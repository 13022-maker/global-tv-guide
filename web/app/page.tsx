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
        <h2>即將開始</h2>
        <EventList events={events} />
        <p>
          <a href="/upcoming">看全部 →</a>
        </p>
      </section>
    </main>
  );
}
