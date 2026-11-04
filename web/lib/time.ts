// 伺服器端格式化（固定時區 → SSR 與 client 輸出一致，不會 hydration mismatch）

export const TAIPEI = 'Asia/Taipei';

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六'];

function parts(iso: string, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { y: p.year, m: p.month, d: p.day, hh: p.hour, mm: p.minute, wd: WEEKDAY_ZH[wd] };
}

/** 11/13（五）09:00 */
export function fmtShort(iso: string, timeZone = TAIPEI) {
  const p = parts(iso, timeZone);
  return `${p.m}/${p.d}（${p.wd}）${p.hh}:${p.mm}`;
}

/** 2026 年 11 月 13 日（五） */
export function fmtDate(iso: string, timeZone = TAIPEI) {
  const p = parts(iso, timeZone);
  return `${p.y} 年 ${p.m} 月 ${p.d} 日（${p.wd}）`;
}

/** 09:00 */
export function fmtTime(iso: string, timeZone = TAIPEI) {
  const p = parts(iso, timeZone);
  return `${p.hh}:${p.mm}`;
}

/** Google Calendar 用：20261113T010000Z */
export function toCalUtc(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
