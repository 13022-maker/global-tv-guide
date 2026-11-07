'use client';

import { useEffect, useState } from 'react';
import Countdown from '@/components/Countdown';

type Stop = { id: string; flag: string; city: string; midnight: string };

/** 顯示「下一個跨年的城市」＋倒數；SSR 先不算，避免 hydration mismatch */
export default function NyeNext({ stops }: { stops: Stop[] }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (now === null) return <div className="countdown">倒數計算中…</div>;

  const next = stops.find((s) => new Date(s.midnight).getTime() > now);
  if (!next) return <div className="countdown ended">2027 全世界都跨完年了 🎆</div>;

  return (
    <div className="nye-next">
      <p className="nye-next-label">
        下一個跨年：
        <a href={`#${next.id}`}>
          {next.flag} {next.city}
        </a>
      </p>
      <Countdown start={next.midnight} end={new Date(new Date(next.midnight).getTime() + 3600_000).toISOString()} />
    </div>
  );
}
