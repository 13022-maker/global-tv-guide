import type { Metadata } from 'next';
import EventList from '@/components/EventList';
import { upcomingEvents } from '@/lib/events';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '即將開始：全球典禮、賽事、首播台灣時間｜全球節目表',
  description: '全球頒獎典禮、電競與體育賽事、首播的台灣時間一覽，附官方觀看管道與開播提醒。',
  alternates: { canonical: '/upcoming' },
};

export default function UpcomingIndex() {
  return (
    <main className="wrap">
      <nav className="crumb">
        <a href="/">全球節目表</a> / 即將開始
      </nav>
      <header className="hero">
        <h1>即將開始</h1>
        <p className="sub">全部以台灣時間顯示。</p>
      </header>
      <EventList events={upcomingEvents()} />
    </main>
  );
}
