import type { SiteEvent } from '@/lib/events';
import { fmtShort } from '@/lib/time';

export default function EventList({ events }: { events: SiteEvent[] }) {
  if (events.length === 0) {
    return <p className="hint">目前沒有即將開始的事件。</p>;
  }
  return (
    <ul className="event-list">
      {events.map((e) => (
        <li key={e.slug}>
          <a href={`/upcoming/${e.slug}`}>
            <span className="ev-time">台灣 {fmtShort(e.main.start!)}</span>
            <span className="ev-title">{e.shortTitle}</span>
            <span className="ev-place">
              {e.city}・{e.venue}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
