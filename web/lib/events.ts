// 站方自建事件（editorial 資料，非 YouTube API 資料，可以 commit 進 git）
// 新增事件：在 EVENTS 加一筆 → push → /upcoming/<slug> 自動產生

export type EventSegment = {
  label: string;
  start: string | null; // ISO 8601（含時區）；null = 待公布
  end?: string | null;
  note?: string;
};

export type WatchOption = {
  label: string;
  url: string;
  region: string; // 適用地區說明
  verified: boolean; // false = 尚未確認，前台會標「待確認」
};

export type SiteEvent = {
  slug: string;
  title: string; // 頁面 H1
  shortTitle: string;
  category: 'music' | 'sports' | 'game' | 'movie' | 'news' | 'space';
  venue: string;
  city: string;
  sourceTz: string; // 主辦地時區（IANA）
  sourceTzLabel: string;
  main: EventSegment; // 倒數與提醒以此為準
  preShow?: EventSegment;
  otherSegments: EventSegment[];
  watch: WatchOption[];
  officialUrl: string;
  intro: string[]; // 站方自寫說明（AdSense III.G.1.d：要有獨立價值）
  highlights: { text: string; source?: { label: string; url: string } }[];
  sources: { label: string; url: string }[];
  updatedAt: string;
};

export const EVENTS: SiteEvent[] = [
  {
    slug: 'latin-grammy-2026',
    title: '2026 拉丁葛萊美獎（第 27 屆）台灣時間與觀看方式',
    shortTitle: '2026 拉丁葛萊美',
    category: 'music',
    venue: 'MGM Grand Garden Arena',
    city: '美國 拉斯維加斯',
    sourceTz: 'America/New_York',
    sourceTzLabel: '美東時間',
    main: {
      label: '頒獎典禮（電視轉播）',
      start: '2026-11-12T20:00:00-05:00',
      end: '2026-11-12T23:00:00-05:00',
      note: '美國 Univision 轉播，全長約 3 小時',
    },
    preShow: {
      label: '前導秀',
      start: '2026-11-12T19:00:00-05:00',
      end: '2026-11-12T20:00:00-05:00',
    },
    otherSegments: [
      {
        label: 'Latin GRAMMY Premiere（大部分獎項在此頒發）',
        start: null,
        note: '當天稍早舉行，主辦單位尚未公布時間',
      },
      {
        label: '年度人物晚會（Daddy Yankee）',
        start: null,
        note: '11/12 前一晚在拉斯維加斯舉行，時間待公布',
      },
    ],
    watch: [
      {
        label: 'Univision（美國電視）',
        url: 'https://www.univision.com/',
        region: '美國',
        verified: true,
      },
      {
        label: 'Latin GRAMMY 官方網站',
        url: 'https://www.latingrammy.com/',
        region: '全球（官方公告、得獎名單）',
        verified: true,
      },
    ],
    officialUrl: 'https://www.latingrammy.com/',
    intro: [
      '拉丁葛萊美（Latin GRAMMY Awards）由拉丁錄音藝術與科學學院主辦，是西班牙語與葡萄牙語音樂最重要的年度獎項。第 27 屆典禮在美國拉斯維加斯舉行。',
      '美國東岸 11 月 1 日起改回標準時間（UTC−5），跟台灣時差 13 小時。所以美東 11 月 12 日（四）晚上 8 點的典禮，在台灣是 11 月 13 日（五）早上 9 點，剛好是上班、上課時間，建議先設提醒。',
      '美國西岸觀眾看的是延遲播出版本，台灣時間請以美東直播為準。',
    ],
    highlights: [
      {
        text: 'Daddy Yankee 獲選本屆「年度人物」，並名列典禮領銜表演者。他 10 月 30 日推出新專輯《La Postal》，與印度歌手 Diljit Dosanjh 合作的〈POKITO〉本週登上 YouTube 全球熱門前十。',
        source: {
          label: 'Metro PR',
          url: 'https://www.metro.pr/entretenimiento/2026/10/20/daddy-yankee-y-rosalia-encabezaran-las-actuaciones-en-los-latin-grammy-2026/',
        },
      },
    ],
    sources: [
      {
        label: 'AmericanTV：2026 Latin GRAMMYs 播出時間（11/12 8pm ET/PT、前導秀 7pm）',
        url: 'https://www.americantv.com/how-to-watch-2026-latin-grammys-on-directv.php',
      },
      {
        label: 'Latin GRAMMY：Daddy Yankee 獲選 2026 年度人物',
        url: 'https://cms.latingrammy.com/en/news/daddy-yankee-named-2026-latin-recording-academy-person-of-the-year/',
      },
      {
        label: 'Metro PR：Daddy Yankee、Rosalía 領銜表演',
        url: 'https://www.metro.pr/entretenimiento/2026/10/20/daddy-yankee-y-rosalia-encabezaran-las-actuaciones-en-los-latin-grammy-2026/',
      },
    ],
    updatedAt: '2026-11-04T22:00:00+08:00',
  },
];

export const CATEGORY_ZH: Record<SiteEvent['category'], string> = {
  music: '音樂',
  sports: '體育',
  game: '電競',
  movie: '電影',
  news: '新聞',
  space: '太空',
};

/** 尚未結束、依開始時間排序（ISR 重新產生時更新） */
export function upcomingEvents(category?: SiteEvent['category']): SiteEvent[] {
  const now = Date.now();
  return EVENTS.filter((e) => e.main.start)
    .filter((e) => !category || e.category === category)
    .filter((e) => new Date(e.main.end ?? e.main.start!).getTime() > now)
    .sort((a, b) => new Date(a.main.start!).getTime() - new Date(b.main.start!).getTime());
}

export function getEvent(slug: string): SiteEvent | undefined {
  return EVENTS.find((e) => e.slug === slug);
}
