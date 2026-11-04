'use client';

import { useEffect, useState } from 'react';

type Props = { start: string; end?: string | null };

function split(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

export default function Countdown({ start, end }: Props) {
  // SSR 先輸出 null，mount 後才算 → 避免 hydration mismatch
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : startMs + 3 * 3600_000;

  if (now === null) {
    return <div className="countdown" aria-live="polite">倒數計算中…</div>;
  }
  if (now >= endMs) {
    return <div className="countdown ended">已結束</div>;
  }
  if (now >= startMs) {
    return (
      <div className="countdown live">
        <span className="dot" aria-hidden /> 進行中
      </div>
    );
  }

  const { d, h, m, s } = split(startMs - now);
  const cells: [number, string][] = [
    [d, '天'],
    [h, '時'],
    [m, '分'],
    [s, '秒'],
  ];
  return (
    <div className="countdown" role="timer" aria-label={`距離開始 ${d} 天 ${h} 小時 ${m} 分`}>
      {cells.map(([v, u]) => (
        <div className="cell" key={u}>
          <span className="num">{String(v).padStart(2, '0')}</span>
          <span className="unit">{u}</span>
        </div>
      ))}
    </div>
  );
}
