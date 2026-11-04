import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import EventList from '@/components/EventList';
import { CATEGORY_ZH, upcomingEvents, type SiteEvent } from '@/lib/events';

export const revalidate = 3600;
export const dynamicParams = false;

type Cat = SiteEvent['category'];
type Params = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return (Object.keys(CATEGORY_ZH) as Cat[]).map((category) => ({ category }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = (await params).category as Cat;
  const zh = CATEGORY_ZH[c];
  if (!zh) return {};
  return {
    title: `${zh}：即將開始的直播與活動台灣時間｜全球節目表`,
    description: `全球${zh}直播、典禮與首播的台灣時間，附官方觀看管道與開播提醒。`,
    alternates: { canonical: `/topic/${c}` },
  };
}

export default async function TopicPage({ params }: Params) {
  const c = (await params).category as Cat;
  const zh = CATEGORY_ZH[c];
  if (!zh) notFound();
  return (
    <main className="wrap">
      <nav className="crumb">
        <a href="/">全球節目表</a> / {zh}
      </nav>
      <header className="hero">
        <h1>{zh}</h1>
        <p className="sub">即將開始的{zh}直播與活動，全部以台灣時間顯示。</p>
      </header>
      <EventList events={upcomingEvents(c)} />
    </main>
  );
}
