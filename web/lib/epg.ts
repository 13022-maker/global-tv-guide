import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

// EPG JSON 由 scripts/xmltv-to-json.mjs 產生：data/epg/<channelId>/<台灣日期>.json，start/stop 為 UTC
const EPG_DIR = path.join(process.cwd(), '..', 'data', 'epg');

export type Programme = {
  start: string;
  stop: string;
  title: string;
  subTitle: string | null;
  desc: string | null;
  category: string[];
};

export type ChannelMeta = {
  id: string;
  name: string;
  flag: string;
  country: string;
  tz: string; // 頻道所在地時區，用來顯示「當地幾點」
  feed?: string; // 國際版／區域版訊號說明
};

// 頻道 → 國家／時區（channels.json 沒有這些欄位）
const META: Record<string, Omit<ChannelMeta, 'id' | 'name'>> = {
  'AlJazeera.qa@English': { flag: '🇶🇦', country: '卡達', tz: 'Asia/Qatar', feed: '英語國際台' },
  'ArirangWorld.kr@SD': { flag: '🇰🇷', country: '韓國', tz: 'Asia/Seoul', feed: '國際台' },
  'BBCNews.uk@AsiaPacific': { flag: '🇬🇧', country: '英國', tz: 'Europe/London', feed: '亞太版' },
  'CNNInternational.us@AsiaPacific': { flag: '🇺🇸', country: '美國', tz: 'America/New_York', feed: '亞太版' },
  'TV5MondeAsia.fr@SD': { flag: '🇫🇷', country: '法國', tz: 'Europe/Paris', feed: '亞洲版' },
  'beINSports.qa@MENA': { flag: '🇶🇦', country: '卡達', tz: 'Asia/Qatar', feed: '中東北非版' },
  'SPOTV.kr@SD': { flag: '🇰🇷', country: '韓國', tz: 'Asia/Seoul' },
  'NHKWorldJapan.jp@SD': { flag: '🇯🇵', country: '日本', tz: 'Asia/Tokyo', feed: '國際台' },
  'NHKBS.jp@SD': { flag: '🇯🇵', country: '日本', tz: 'Asia/Tokyo' },
};
const JP = { flag: '🇯🇵', country: '日本', tz: 'Asia/Tokyo' };

function metaFor(id: string, name: string): ChannelMeta {
  const m = META[id] ?? (id.endsWith('.jp@SD') ? JP : { flag: '🌐', country: '', tz: 'UTC' });
  return { id, name, ...m };
}

export async function listChannels(): Promise<ChannelMeta[]> {
  try {
    const raw = JSON.parse(await readFile(path.join(EPG_DIR, 'channels.json'), 'utf8')) as {
      channels: { id: string; name: string }[];
    };
    const dirs = new Set(await readdir(EPG_DIR));
    // 沒有資料夾的頻道（抓取失敗）不顯示，避免空頁
    return raw.channels.filter((c) => dirs.has(c.id)).map((c) => metaFor(c.id, c.name));
  } catch {
    return [];
  }
}

export function getChannel(channels: ChannelMeta[], id: string) {
  return channels.find((c) => c.id === id);
}

function twDate(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(d); // YYYY-MM-DD
}

async function readDay(id: string, date: string): Promise<Programme[]> {
  try {
    const j = JSON.parse(await readFile(path.join(EPG_DIR, id, `${date}.json`), 'utf8')) as {
      programmes: Programme[];
    };
    return j.programmes;
  } catch {
    return [];
  }
}

/** 某個台灣日期的節目（依開始時間排序、去除完全重複的列） */
export async function getDay(id: string, date: string): Promise<Programme[]> {
  const seen = new Set<string>();
  return (await readDay(id, date))
    .filter((p) => {
      const k = `${p.start}|${p.title}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** 指定時刻正在播與下一個節目 */
export async function getOnAir(id: string, at: Date) {
  const day = twDate(at);
  const prev = twDate(new Date(at.getTime() - 86400_000));
  const list = [...(await getDay(id, prev)), ...(await getDay(id, day))].sort((a, b) =>
    a.start.localeCompare(b.start),
  );
  const t = at.getTime();
  const i = list.findIndex((p) => new Date(p.start).getTime() <= t && t < new Date(p.stop).getTime());
  if (i === -1) return { now: null, next: list.find((p) => new Date(p.start).getTime() > t) ?? null };
  return { now: list[i], next: list[i + 1] ?? null };
}

export async function availableDates(id: string): Promise<string[]> {
  try {
    return (await readdir(path.join(EPG_DIR, id)))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''))
      .sort();
  } catch {
    return [];
  }
}
