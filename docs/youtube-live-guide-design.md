# 全球 YouTube 官方直播節目表：設計文件

> 版本：v0.1（2026-11-01）｜狀態：草案，待驗證項目見各表「驗證」欄
> 範圍：在既有 iptv-org/epg 管線旁，新增「官方 YouTube 直播與首播」資料源，跟傳統電視 EPG 混排在同一個節目表 UI。

---

## 0. 結論先講

| 項目 | 結論 |
|---|---|
| 資料取得 | **RSS（0 unit）找新影片 → `videos.list` 批次查詳細（1 unit/次，最多 50 ID）**。完全不用 `search.list`。 |
| 每日 quota | MVP 18 台約 **450 units/日**，擴到 45 台約 **730–1,200 units/日**，都在 10,000 的 12% 以內。 |
| 24/7 頻道 | 不做節目表，做「正在直播」卡片，嵌入用 `embed/live_stream?channel=UC…`，再定時用 API 確認 video ID 跟狀態。 |
| 鎖區 | `contentDetails.regionRestriction` **只能當參考**，live 常常沒有填。最後的判斷交給前端 IFrame `onError` 加上「去官方頁看」的 fallback。 |
| 最大條款風險 | Developer Policies III.G.1.d（放 API 資料的頁面要賣廣告，非 YouTube 內容本身要有足夠獨立價值）、III.F.3.a（不能對觀看嵌入影片收費）、III.E.4（非授權資料最多存 30 天，要刷新）。 |
| MVP | 18 台：新聞 8、太空 4、知識或音樂 3、動畫 2、體育 1（BWF）。理由見 §6。 |

---

## 1. 頻道清單（45 列，可收錄約 40 台）

### 1.1 收錄規則

- 只收**內容擁有者本人或電視台**經營的頻道。不收轉載、剪輯台、「24H World News」這類聚合台。
- 「全球可看」的定義：在台灣、美國、歐洲至少一地能播，而且沒有已知的大範圍鎖區。
- Channel ID 只填在第三方統計站或官方頁面**看得到原文**的那些。其餘一律標 `待驗證`，上線前要用 `channels.list?forHandle=@xxx`（1 unit）換成 UC ID。
- 本次研究環境連不到 youtube.com，所以**所有 handle 跟直播型態都要在上線前人工確認一次**（見 §7 驗證清單）。

型態代碼：**24/7** = 常駐直播｜**排程** = 不定期排程直播（`liveBroadcastContent=upcoming`）｜**PR** = premiere 首播

### 1.2 國際新聞（24/7 為主）

| # | 頻道 | @handle / channel ID | 型態 | 鎖區 | 語言 | 來源 | 驗證 |
|---|---|---|---|---|---|---|---|
| 1 | Al Jazeera English | `UCNye-wNBqNL5ZzHSJj3l8Bg` | 24/7 | 全球（已知） | en | [vidIQ](https://vidiq.com/youtube-stats/channel/UCNye-wNBqNL5ZzHSJj3l8Bg)、[Wikipedia](https://en.wikipedia.org/wiki/Al_Jazeera_English) | ID 已見 |
| 2 | DW News | `@dwnews` | 24/7 | 全球（已知） | en | [Wikipedia: Livestreamed news](https://en.wikipedia.org/wiki/Livestreamed_news)、[subsub](https://open.subsub.io/uk/channels/dwnews/view) | ID 待驗證 |
| 3 | FRANCE 24 English | `@France24_en`（待驗證） | 24/7 | 全球（已知） | en（另有 fr/ar/es 台） | [AIB](https://aib.org.uk/france-24-now-broadcasting-live-on-youtube/)、[Livestreamed news](https://en.wikipedia.org/wiki/Livestreamed_news) | 待驗證 |
| 4 | Sky News | `@skynews` | 24/7 | 全球（未見限制） | en | [Livestreamed news](https://en.wikipedia.org/wiki/Livestreamed_news)、[vidIQ](https://vidiq.com/youtube-stats/channel/@skynews/) | ID 待驗證 |
| 5 | CNA | `UC83jt4dlz1Gjl58fzQrrKZg` | 24/7（待驗證） | 未知 | en | [vidIQ](https://vidiq.com/youtube-stats/channel/UC83jt4dlz1Gjl58fzQrrKZg) | 24/7 待驗證 |
| 6 | ABC News (Australia) | `UCVgO39Bk5sMo66-6o6Spn6Q` | 24/7 | YouTube 可國際觀看；iview 才鎖澳洲 | en | [Livestreamed news](https://en.wikipedia.org/wiki/Livestreamed_news)、[vidIQ](https://vidiq.com/youtube-stats/channel/UCVgO39Bk5sMo66-6o6Spn6Q) | ID 已見 |
| 7 | euronews (English) | 待驗證 | 24/7 | 未知 | en（另有多語台） | [Livestreamed news](https://en.wikipedia.org/wiki/Livestreamed_news) | 待驗證 |
| 8 | TaiwanPlus | 待驗證 | 24/7 | 國際（中國封鎖網站） | en | [Wikipedia](https://en.wikipedia.org/wiki/TaiwanPlus) | 待驗證 |
| 9 | NHK WORLD-JAPAN | 待驗證 | 排程或 24/7（待驗證） | 未知 | en | [Wikipedia](https://en.wikipedia.com/wiki/NHK_World) | 待驗證；EPG 已有此台，可對照 |
| 10 | Bloomberg Television | 待驗證 | 24/7（待驗證） | 未知 | en | [TheWrap](https://www.thewrap.com/bloomberg-news-youtube-tv-channels/) | 注意：2025 年起 Bloomberg 上 YouTube **TV**（付費），免費 YouTube 直播狀態待驗證 |
| 11 | PBS NewsHour | 待驗證 | 排程（平日晚間 6pm ET） | 未知 | en | [PBS](https://www.pbs.org/newshour/how-to-watch-pbs-newshour) | 待驗證 |
| 12 | TRT World | 待驗證 | 24/7（待驗證） | 未知 | en | 只有二手資料 | 待驗證 |
| 13 | WION | 待驗證 | 24/7（待驗證） | 未知 | en | 只有二手資料 | 待驗證 |
| 14 | ANNnewsCH（テレ朝） | `UCGCZAYq5Xxojl_tSXcVJhiQ` | 排程或 24/7（待驗證） | 海外：未知 | ja | [vidIQ](https://vidiq.com/youtube-stats/channel/UCGCZAYq5Xxojl_tSXcVJhiQ) | 待驗證 |
| 15 | TBS NEWS DIG | `UC6AG81pAkf6Lbi_1VC5NmPA` | 排程或 24/7（待驗證） | 海外：未知 | ja | [vidIQ](https://vidiq.com/youtube-stats/channel/UC6AG81pAkf6Lbi_1VC5NmPA) | 待驗證 |
| 16 | 日テレNEWS | 待驗證 | 24/7（待驗證） | 海外：未知 | ja | [Wikipedia NTV News24](https://en.wikipedia.org/wiki/NTV_News24) | 待驗證 |
| 17 | TVBS NEWS | `@tvbsnews01`（待驗證） | 24/7 | 未知（台灣台常有海外差異） | zh-TW | [vidIQ](https://vidiq.com/youtube-stats/channel/@tvbsnews01/videos/)、[蘋果仁](https://mrmad.com.tw/taiwan-news-channel-youtube-live) | 待驗證 |
| 18 | 公視新聞網 PNN | 待驗證 | 24/7（待驗證） | 未知 | zh-TW | [蘋果仁](https://mrmad.com.tw/taiwan-news-channel-youtube-live) | 待驗證 |
| 19 | 民視／華視／台視／三立等 | 待驗證 | 24/7 | 未知 | zh-TW | [蘋果仁](https://mrmad.com.tw/taiwan-news-channel-youtube-live) | 第二版再收，先選 2–3 台 |

> **不收**：CGTN 等國營宣傳台（品牌風險，等營運決定再說）、SpaceX（2023 起直播移到 X，見 §1.5）、Arirang（2026-09 起 24h 改上 SOOP，[Sports Khan](https://sports.khan.co.kr/en/article/202609221349017)，YouTube 狀態待驗證）。

### 1.3 體育（排程直播，鎖區最嚴重）

| # | 頻道 | @handle / ID | 型態 | 鎖區 | 語言 | 來源 | 驗證 |
|---|---|---|---|---|---|---|---|
| 20 | BWF TV（羽球） | `@bwf`（待驗證） | 排程 | **部分**：有本地轉播的國家會被擋（例如美、英） | en | [TechRadar](https://www.techradar.com/news/badminton-live-stream-world-tour-finals-watch-online-anywhere)、[vidIQ](https://vidiq.com/youtube-stats/channel/@bwf/) | 台灣是否可看待驗證 |
| 21 | WTT 世界桌球 | 待驗證 | 排程（資格賽 1–4 桌） | **部分**：有獨家轉播的地區會被擋 | en | [Global Game Guide](https://www.globalgameguide.com/article/wtt-live-streams-guide-2026) | 待驗證 |
| 22 | J.LEAGUE International | 待驗證 | 排程 | **部分**：只開放 MENA 跟部分亞洲國家 | en/ja | [SportBusiness](https://www.sportbusiness.com/news/j-league-to-stream-matches-in-mena-selected-asian-territories-on-youtube-channel/)、[J.League](https://www.jleague.co/news/mito-hollyhock-vs-zweigen-kanazawa-free-live-streaming-on-the-jleague-international-youtube-channel-on-august-2nd/) | 待驗證 |
| 23 | DAZN（UWCL 女子歐冠） | 待驗證 | 排程 | 原合約為全球免費（2021–2025 季），**現況待驗證** | en | [Advanced Television](https://www.advanced-television.com/2021/06/30/dazn-youtube-offer-free-womens-champions-league/) | 合約可能已變更 |
| 24 | NFL | 待驗證 | 單場特例 | 2025 W1 巴西場全球免費 | en | [YouTube Blog](https://blog.youtube/news-and-events/2025-nfl-season/) | 只收「單場事件」，不收頻道常態 |
| 25 | LoL Esports | 待驗證 | 排程（賽季期間） | 未知（官方台大致開放） | en 等 | [Sportskeeda](https://www.sportskeeda.com/us/streamers/league-legends-worlds-2025-list-confirmed-co-streamers-revealed) | 待驗證 |
| 26 | Volleyball World | 待驗證 | 以精華為主 | 全場多在 VBTV（付費） | en | [Tom's Guide](https://www.tomsguide.com/entertainment/sports/watch-fivb-womens-volleyball-world-championship-2025-free) | 只收精華或 premiere |
| 27 | World Athletics | 待驗證 | 以精華為主 | 直播在 World Athletics+，會鎖區 | en | [World Athletics](https://worldathletics.org/watch/live) | 只收精華 |
| 28 | Olympics | 待驗證 | 特定賽事 | 歷史上只開放「無轉播權」地區 | en | [World Archery](https://www.worldarchery.sport/news/101061/ioc-live-stream-london-2012-64-territories-its-youtube-channel) | 不放 MVP |

### 1.4 動畫與影集官方首播（premiere 跟上架）

| # | 頻道 | @handle / ID | 型態 | 鎖區 | 語言 | 來源 | 驗證 |
|---|---|---|---|---|---|---|---|
| 29 | Muse 木棉花 | `@musetw`（待驗證） | PR／上架 | **部分**：以台灣為主 | zh-TW | [Wikipedia](https://en.wikipedia.org/wiki/Muse_Communication)、[vidIQ](https://vidiq.com/youtube-stats/channel/@musetw/) | 待驗證 |
| 30 | Muse Asia | `@museasia`（待驗證） | PR／上架 | **部分**：東南亞、東亞、南亞 | en/zh 字幕 | [Wikipedia](https://en.wikipedia.org/wiki/Muse_Communication)、[ONE Esports](https://www.oneesports.gg/anime/best-anime-youtube-channels-watch-free) | 待驗證 |
| 31 | Ani-One Asia | `@anioneasia`（待驗證） | PR／上架 | **部分**：亞洲 | 多語字幕 | [ONE Esports](https://www.oneesports.gg/anime/best-anime-youtube-channels-watch-free)、[vidIQ](https://vidiq.com/youtube-stats/channel/@anioneasia/) | 待驗證 |
| 32 | GundamInfo | 待驗證 | PR／上架 | **部分**：依作品逐步擴區 | ja + 字幕 | [Siliconera](https://www.siliconera.com/gundam-witch-from-mercury-streaming-youtube-in-new-regions/) | 待驗證 |
| 33 | Anime Made By Bilibili | 待驗證 | 上架 | 未知 | zh + en 字幕 | [ONE Esports](https://www.oneesports.gg/anime/best-anime-youtube-channels-watch-free) | 待驗證 |
| 34 | VIZ Media | 待驗證 | 上架 | **部分**：部分播放清單會鎖區 | en | [ONE Esports](https://www.oneesports.gg/anime/best-anime-youtube-channels-watch-free) | 待驗證 |

> 動畫台的鎖區是「逐支影片」設定，所以 `regionRestriction` 在這類頻道最有用（VOD 跟 premiere 通常會填）。

### 1.5 太空

| # | 頻道 | @handle / ID | 型態 | 鎖區 | 語言 | 來源 | 驗證 |
|---|---|---|---|---|---|---|---|
| 35 | NASA | `@NASA` / `UCLA_DiR1FfKNvjuUpBHmylQ` | 排程 + ISS 畫面 | 全球（已知） | en | [NASA Live](https://www.nasa.gov/nasalive)、[vidIQ](https://vidiq.com/youtube-stats/channel/UCLA_DiR1FfKNvjuUpBHmylQ) | 已見 |
| 36 | ESA | `UCIBaDdAbGlFDeS33shmlD0A` | 排程 | 全球（已知） | en | [Planetary Society](https://planetary.org/articles/live-space-feeds-you-should-follow) | 已見 |
| 37 | JAXA | `UCfMIdADo6FQayQCOkLYGhrQ` | 排程（發射） | 未知 | ja | [Planetary Society](https://planetary.org/articles/live-space-feeds-you-should-follow) | 已見 |
| 38 | ISRO | `UCw5hEVOTfz_AfzsNFWyNlNg` | 排程（發射） | 未知 | en/hi | [Planetary Society](https://planetary.org/articles/live-space-feeds-you-should-follow) | 已見 |
| 39 | Blue Origin | 待驗證 | 排程（發射） | 未知 | en | [Planetary Society](https://planetary.org/articles/live-space-feeds-you-should-follow) | 待驗證 |
| — | SpaceX | — | — | — | — | [Cord Cutters](https://cordcuttersnews.com/elon-musks-spacex-is-ditching-youtube-as-he-tries-to-make-x-a-youtube-competitor/) | **不收**：2023 起直播移到 X，改連官網 |

### 1.6 音樂、知識、其他

| # | 頻道 | @handle / ID | 型態 | 鎖區 | 語言 | 來源 | 驗證 |
|---|---|---|---|---|---|---|---|
| 40 | Lofi Girl | 待驗證 | 24/7 | 全球（已知） | 無語言 | [YouTube Blog](https://blog.youtube/culture-and-trends/rise-lofi-girl)、[Statista](https://www.statista.com/statistics/1409400/top-live-streaming-channels-youtube-hours-watched) | 待驗證 |
| 41 | Coachella | `yt.be/coachella` | 排程（每年 4 月、6 舞台） | 免費；全球狀態未明 | en | [YouTube Blog](https://blog.youtube/news-and-events/coachella-2025-livestream-how-to-watch/) | 季節性，只做事件頁 |
| 42 | ウェザーニュース | `UCNsidkYpIAQ4QaufptQBPHQ` | 24/7（真人時段 05–23 JST） | 全球（線上） | ja | [Wikipedia](https://en.wikipedia.org/wiki/Weathernews_LiVE)、[vidIQ](https://vidiq.com/youtube-stats/channel/UCNsidkYpIAQ4QaufptQBPHQ) | 颱風季流量高 |
| 43 | explore.org | 待驗證 | 24/7（多支 cam） | 未知 | 無語言 | [explore.org](https://explore.org/events/watch/ytb_4CwttNV4Lv) | 待驗證 |
| 44 | Royal Observatory Greenwich | 待驗證 | 排程 | 未知 | en | [Planetary Society](https://planetary.org/articles/live-space-feeds-you-should-follow) | 待驗證 |
| 45 | Red Bull | 待驗證 | 排程（大型賽事） | 未知；主要在 Red Bull TV | en | [Red Bull](https://www.redbull.com/int-en/red-bull-rampage-guide) | 只收有 YouTube 直播的事件 |

---

## 2. 排程資料取得：方法比較

### 2.1 官方規格（已查證）

| 項目 | 規格 | 來源 |
|---|---|---|
| `videos.list` | **1 unit/次**；`id` 帶逗號分隔多個 ID；`maxResults` 1–50（不能跟 `id` 一起用）。實務上一次 50 個 ID，官方頁沒有明寫上限，要實測。 | [videos.list](https://developers.google.cn/youtube/v3/docs/videos/list)、[quota](https://developers.google.com/youtube/v3/determine_quota_cost) |
| `channels.list` / `playlistItems.list` | 1 unit/次 | [quota](https://developers.google.com/youtube/v3/determine_quota_cost) |
| `search.list` | **官方頁（2026-10-15 版）**：獨立 bucket，每日 100 次，每次 1 unit。舊資料寫每次 100 units，兩種說法都會看到，但不管哪一種都只有約 100 次/日。 | [quota](https://developers.google.com/youtube/v3/determine_quota_cost)、[ChannelCrawler](https://channelcrawler.com/insights/youtube-api-daily-limit-quotas-costs-and-how-to-scale-beyond-10000-units-channelcrawler) |
| 預設額度 | 10,000 units/日（不含 search 跟 upload bucket），**太平洋時間午夜重置**（台灣 15:00 或 16:00） | 同上 |
| `liveStreamingDetails` | 只在 upcoming、live 或結束的直播出現。`scheduledStartTime`、`actualStartTime`、`actualEndTime`、`scheduledEndTime`（空值代表無限期，24/7 台常這樣）、`concurrentViewers` | [videos resource](https://developers.google.com/youtube/v3/docs/videos?hl=zh-cn) |
| `snippet.liveBroadcastContent` | `live` / `upcoming` / `none` | 同上 |
| `contentDetails.regionRestriction` | `allowed[]`：只有列出的國家能看（空陣列代表全部擋）；`blocked[]`：列出的國家擋掉（空陣列代表全開） | 同上 |
| `status.embeddable` | 布林值。官方特別說明：**就算是 true，也可能因為 Content ID 等第三方主張而在嵌入時播不了** | 同上 |
| 頻道 live 嵌入 | `https://www.youtube.com/embed/live_stream?channel=UC…`，只吃 UC ID，不吃 @handle；載入當下才決定播哪一場，直播重開後要重新載入 | [webcam.io](https://webcam.io/docs/live-streaming/embed.html) |
| RSS | `feeds/videos.xml?channel_id=UC…`；也支援 `?playlist_id=`。`UULV`+ID 尾段代表「該頻道直播」清單，`UULF` 代表長片 | [Zegnat](https://zegnat.bearblog.dev/the-rss-world-of-youtube/) |

### 2.2 方法比較

| 方法 | 成本 | 可靠度 | 條款風險 | 結論 |
|---|---|---|---|---|
| **A. 頻道 RSS → `videos.list` 批次** | RSS 0 unit；`videos.list` 每 50 支 1 unit | 中高。RSS 只有最新約 15 筆（社群觀察，待驗證）；upcoming 跟 premiere 一般會出現在 RSS，但**要實測**。24/7 台的影片可能很舊，不在 RSS 裡。 | 低。RSS 是 YouTube 公開提供的 feed，不算 scraping（III.E.6 禁的是抓 HTML）。 | **主力** |
| **B. `playlistItems.list` 查 `UULV…` 直播清單** | 1 unit/頻道/次 | 高（官方 API）。`UULV` 前綴是非官方文件記載的行為，要實測。 | 低 | **備援**：RSS 抓不到或頻道 >15 支/日時才用 |
| C. `search.list eventType=upcoming` | 每日只有 100 次 | 中（search 結果有延遲、會漏） | 低 | **不用**，留給手動 debug |
| D. 抓 youtube.com HTML 或 `/live` 頁 | 0 | 不穩 | **高**：違反 III.E.6 scraping | **禁用** |
| E. 官網或 EPG 交叉比對（例如 NASA Live 頁） | 0 | 中 | 低（只用文字資料） | 用在太空跟體育的「預告」，跟 YouTube ID 對上以後再顯示 |

### 2.3 24/7 常駐直播怎麼呈現

| 項目 | 做法 |
|---|---|
| 資料 | `channels` 表加 `is_247=true`，每 30 分鐘用 `videos.list` 檢查已知的 `current_live_video_id` 是否還是 `live`。如果變成 `none`，就用 RSS 或 `UULV` 找新 ID。 |
| 嵌入 | 優先用 video ID 嵌入（狀態可控、可以偵測錯誤）；找不到 ID 時退回 `embed/live_stream?channel=UC…`。 |
| UI | 時間軸上畫成「整條橫跨」的長條（`start=now-∞`、`end=null`），標「24/7 LIVE」。如果 EPG 有同一家電視台（Al Jazeera、NHK World、DW），就把 **EPG 節目名稱疊在 24/7 長條上**，告訴使用者「現在 YouTube 直播正在播 XX 節目」。這是本站跟 YouTube 本身最大的差異化。 |
| 不顯示 | `concurrentViewers` 不顯示，也不存（統計資料只能存 30 天、不能拿來做衍生指標，III.E.4.b/h）。 |

### 2.4 `regionRestriction` 對 live 可不可靠

| 情境 | 可靠度 | 原因與對策 |
|---|---|---|
| VOD、premiere（動畫台） | 中高 | 上傳者常常在影片層級設國家。直接用。 |
| 排程直播（體育） | **低** | 地區限制常常是在直播設定或權利管理（Content ID）層級做的，API 欄位不一定會填。官方也說 embeddable=true 仍可能因第三方主張播不了。 |
| 24/7 新聞 | 低到中 | 大多不鎖。鎖的話通常是個別節目段落暫時擋掉，API 不會即時反映。 |
| **對策** | — | 1）API 有資料就照用（`allowed`/`blocked` 對照觀眾國家）。2）在 `channels.geo_note` 手填已知限制（例如 BWF：「美、英不可看」）。3）前端 IFrame `onError` 才是最後的判斷（§3.5）。4）收集匿名的「國家 × 影片 × 錯誤碼」統計（只存自家的前端事件，不存 YouTube 資料），反過來修正 `geo_note`。 |

---

## 3. 設計

### 3.1 資料結構（Supabase）

```sql
-- 頻道主檔（手動維護，不是 API 快取）
create table yt_channels (
  id              text primary key,          -- UC… channel ID
  handle          text,                      -- @nasa
  slug            text unique not null,      -- nasa（URL 用）
  name_zh         text not null,
  name_orig       text,
  category        text not null check (category in
                  ('news','sports','anime','music','knowledge','space','other')),
  langs           text[] not null,           -- {'en'} / {'ja'} / {'zh-TW'}
  kind            text not null check (kind in ('247','scheduled','premiere','mixed')),
  owner_type      text not null check (owner_type in ('broadcaster','rights_holder','creator','agency')),
  official_url    text not null,             -- 官網（fallback 連結）
  epg_channel_id  text,                      -- 對應 data/epg/<id>，例如 AlJazeera.qa@English
  geo_note        jsonb default '{}',        -- {"blocked":["US","GB"],"note":"有本地轉播國家不可看","source":"https://…"}
  verified_at     timestamptz,               -- 最後一次人工確認官方身分
  active          boolean default true
);

-- 直播與首播事件（YouTube API Non-Authorized Data，≤30 天就刷新或刪除）
create table yt_events (
  video_id              text primary key,
  channel_id            text not null references yt_channels(id),
  title                 text not null,       -- 照 API 原樣，不改寫（RMF：標題不能改）
  thumbnail_url         text,
  status                text not null check (status in ('upcoming','live','ended','none')),
  is_premiere           boolean default false,
  scheduled_start       timestamptz,
  scheduled_end         timestamptz,
  actual_start          timestamptz,
  actual_end            timestamptz,
  embeddable            boolean,
  region_allowed        text[],              -- contentDetails.regionRestriction.allowed
  region_blocked        text[],              -- contentDetails.regionRestriction.blocked
  made_for_kids         boolean,             -- III.E.4.j：兒童內容要關追蹤
  topics                text[],              -- 自家分類（slug），例如 {'launch','badminton'}
  fetched_at            timestamptz not null default now(),
  expires_at            timestamptz generated always as (fetched_at + interval '29 days') stored
);
create index on yt_events (status, scheduled_start);
create index on yt_events (channel_id, status);

-- 24/7 常駐：目前那支 live video
create table yt_live_slots (
  channel_id      text primary key references yt_channels(id),
  video_id        text references yt_events(video_id),
  checked_at      timestamptz not null
);

-- 自家前端回報（不是 YouTube 資料，可以長期保存）
create table embed_errors (
  id          bigserial primary key,
  video_id    text not null,
  country     text not null,                 -- 從 Vercel x-vercel-ip-country 取得
  error_code  int not null,                  -- 2/5/100/101/150/152/153
  at          timestamptz default now()
);

-- Premium 節目提醒（沿用既有變現計畫）
create table reminders (
  user_id     uuid references auth.users,
  target_type text check (target_type in ('yt_event','epg_programme')),
  target_id   text,                          -- video_id 或 epg 的 <channel>|<start>
  remind_at   timestamptz not null,
  primary key (user_id, target_type, target_id)
);
```

**統一時間軸 view**（把 EPG JSON 匯進 `epg_programmes` 表，或由 Next.js 在 build 時合併）：

```sql
create view guide_items as
select 'yt'  as src, e.video_id as id, c.slug as channel, e.title,
       coalesce(e.actual_start, e.scheduled_start) as start_at,
       coalesce(e.actual_end, e.scheduled_end)     as end_at,
       e.status, c.category
from yt_events e join yt_channels c on c.id = e.channel_id
where e.status in ('upcoming','live')
union all
select 'epg', p.id, p.channel, p.title, p.start_at, p.end_at, 'tv', p.category
from epg_programmes p;
```

### 3.2 GitHub Actions 排程

| Workflow | cron（UTC） | 做什麼 | API 呼叫 |
|---|---|---|---|
| `yt-discover.yml` | `7 * * * *`（每小時） | 抓所有頻道 RSS（0 unit），找出不在 DB 裡的新 video ID → `videos.list` 批次查 | 新 ID 數 ÷ 50 |
| `yt-refresh.yml` | `*/10 * * * *` | 所有 `upcoming`（48h 內）跟 `live` 的 ID → `videos.list`，更新狀態跟時間 | (upcoming+live) ÷ 50 |
| `yt-247.yml` | `*/30 * * * *` | 檢查 `yt_live_slots`；掛掉的頻道用 `playlistItems.list(UULV…)` 補 | 1 + 掛掉頻道數 |
| `yt-gc.yml` | `17 19 * * *`（跟 EPG 同一時間） | 刪 `ended` 超過 7 天的；`expires_at` 到期還在用的重抓（III.E.4 的 30 天規則） | 少量 |
| `epg-daily.yml`（既有） | `17 19 * * *` | 不變，結束後觸發 Vercel ISR revalidate | — |

注意：
- GitHub Actions 的 cron **常常延遲 5–15 分鐘**，`*/10` 只是「盡量」。要準點的「即將開播→直播中」切換交給前端：到了 `scheduled_start`，UI 先顯示「即將開始」，嵌入的 player 自己會切換。
- 寫進 Supabase 以後呼叫 `revalidateTag('live')`（Next.js on-demand ISR），不要靠 commit JSON 觸發部署（每 10 分鐘 commit 會灌爆 repo 歷史）。**YouTube 資料只寫 Supabase，不 commit 進 git**（git 歷史等於永久保存，跟 30 天規則衝突）。
- API key 放在 GitHub Secrets，只開 YouTube Data API v3，限制 IP 或 API。只用**一個** GCP project（Developer Policies 指南第 6 點：不能拆多個 project 灌 quota）。

### 3.3 每日 quota 估算

假設：每台每天平均 3 支新影片（新聞台片多，太空跟體育少）、同時 upcoming 加 live 約 60 支。

| 項目 | MVP 18 台 | 擴充 45 台 |
|---|---|---|
| discover：24 次 × ⌈新 ID/50⌉（每小時約 2–6 支新片 → 1 call） | 24 | 48 |
| refresh：144 次 × ⌈60/50⌉ = 2 calls | 288 | 432（約 120 支 → 3 calls） |
| 24/7 檢查：48 次 × 1 call + 補 ID（約 10/日） | 58 | 70 |
| `UULV` 備援（RSS 漏抓的頻道，每 6h） | 4 × 5 台 = 20 | 4 × 15 台 = 60 |
| `channels.list` 換 ID 跟每週驗證 | 3 | 7 |
| GC 重抓 | 5 | 10 |
| 手動或除錯 buffer | 50 | 100 |
| **合計** | **約 450 units/日（4.5%）** | **約 730–1,200 units/日（12% 以內）** |

結論：quota 不是瓶頸，瓶頸是 Actions 的 cron 延遲跟 RSS 的覆蓋率。

### 3.4 頁面

| 路由 | 內容 | 渲染 | 備註 |
|---|---|---|---|
| `/live` | 正在直播：24/7 卡片 + 排程直播中的事件。依分類 tab 切換。 | ISR `revalidate: 120` + tag revalidate | 一頁**最多一個 autoplay player**（RMF），其他用縮圖，點了才載入 iframe（lite-embed，縮圖 ≥120×70） |
| `/upcoming` | 接下來 24h，依觀眾時區分「今晚、明早」。 | ISR 300s；時區轉換在 client | 時區用 `Intl.DateTimeFormat().resolvedOptions().timeZone`，預設 Asia/Taipei，允許手動切換並記在 cookie |
| `/topic/[...slug]` | `/topic/space/launch`、`/topic/sports/badminton`、`/topic/anime/premiere` | ISR 600s | SEO 主力，見 §3.6 |
| `/channel/[slug]` | 單台頁：官方連結、型態、已知鎖區、近期排程、對應 EPG | ISR 600s | 頁面要有站方自寫的頻道介紹（獨立價值，III.G.1.d） |
| `/watch/[videoId]` | 單場頁：嵌入、開播倒數、提醒按鈕、相關 EPG | ISR 120s | 標題、縮圖照原樣顯示 |
| `/guide`（既有） | 混排時間軸 | — | 見下表 |

**同一條時間軸混排 TV EPG 與 YouTube**

| 設計點 | 做法 |
|---|---|
| 列（row） | 每台一列。EPG 台跟 YouTube 台**同一家就合併成一列**（用 `yt_channels.epg_channel_id` 對應），例如「Al Jazeera English」一列：上半是 EPG 節目格，下半是 YouTube LIVE 細條。 |
| 視覺區分 | TV 節目格是實心；YouTube 事件格加 ▶ 圖示跟紅色左邊框；24/7 是整列底色條，不切格。premiere 用虛線框。 |
| 篩選 | 「只看可免費線上看」：只留有 YouTube 事件或 24/7 的列。這是給海外觀眾的主要入口。 |
| 時間 | 所有 `timestamptz` 由 client 轉成觀眾時區；SSR 輸出 ISO 字串加 Asia/Taipei 預設值，避免 hydration mismatch（先 render 台北時間，mount 以後再換）。 |
| 「現在」線 | 垂直紅線；左側捲動的錨點放在 now−30 分鐘。 |
| 點擊 | TV 格 → 節目詳情加官網連結；YouTube 格 → `/watch/[id]`。 |

### 3.5 鎖區 UI fallback

```
狀態機（每個嵌入卡）
 預檢：API 的 region_blocked 含 viewerCountry，或 region_allowed 存在但不含 → 直接顯示 fallback（不載 iframe）
 載入：lite-embed（縮圖 + 播放鈕）→ 點擊 → 建立 YT.Player
 onError(code):
   100           → 「影片已移除或設為私人」→ 標記 status=none，觸發 refresh
   101/150/152   → 「此直播在你所在地區或本站無法嵌入播放」→ 按鈕：在 YouTube 觀看 ↗ / 前往官方網站 ↗
   153           → 「播放器設定錯誤」（缺 Referer），記錄 log，這是我們的 bug
   2/5           → 一般錯誤，重試一次
 每次錯誤 → POST /api/embed-error {videoId, code}（國家由 edge header 取得）
```

| UI 文案（zh-TW） | 條件 |
|---|---|
| 「此直播在你所在的地區（{國家}）無法播放。」＋「在 YouTube 開啟」＋「{官方名稱} 官方網站」 | 預檢命中或 101/150/152 |
| 「依過去紀錄，{國家} 觀眾可能無法觀看此頻道」小字警示（不擋播放） | `embed_errors` 該國錯誤率 > 50% 或 `geo_note.blocked` 命中 |
| 絕不出現 | 任何 VPN、換區、代理的字眼或連結（專案紅線） |

技術注意：
- iframe 必須帶 Referer：Next.js 預設的 `Referrer-Policy: strict-origin-when-cross-origin` 可以；**不能**設 `no-referrer`，否則會出現 153 錯誤（[IFrame API 修訂紀錄](https://developers.google.com/youtube/iframe_api_revision_history?hl=ko)）。
- 不能在 player 上疊任何元素（RMF「Overlays and frames」）；fallback 是**取代** iframe，不是蓋在上面。
- player 尺寸 ≥ 200×200，建議 ≥ 480×270（[RMF](https://developers.google.com/youtube/terms/required-minimum-functionality)）。
- `made_for_kids=true` 的影片用 `youtube-nocookie.com`，並關掉自家追蹤（III.E.4.j）。

### 3.6 SEO 頁面策略

| 關鍵字類型 | 範例 | 流量潛力 | 對應頁面 | 備註 |
|---|---|---|---|---|
| 機構 + live | 「NASA live」「NASA 直播」「ISS live」 | 全球高、台灣中 | `/channel/nasa`、`/topic/space/iss` | 常青關鍵字 |
| 事件 + 直播時間 | 「H3 火箭 發射 直播 時間」「Artemis 直播」 | 爆量但短期 | `/watch/[id]` + `/topic/space/launch` | 顯示台灣時間是最大賣點 |
| 賽事 + 免費直播 | 「BWF 直播 免費」「羽球 世界巡迴賽 直播 YouTube」 | 台灣高（羽球熱） | `/topic/sports/badminton` | 要老實寫「部分地區不可看」，不寫繞過方式 |
| 動畫 + 首播時間 | 「XX 第 5 集 首播時間」「木棉花 YouTube 更新時間」 | 台灣很高 | `/topic/anime/premiere`、`/channel/musetw` | 每季新番固定流量，可用 `scheduled_start` 自動產生 |
| 電視台 + 線上看 | 「半島電視台 直播」「DW 直播 線上看」「NHK World live」 | 中 | `/channel/[slug]` | 加 EPG「現在播什麼」是差異化 |
| 天氣或災害 | 「颱風 直播」「ウェザーニュース live」 | 季節性爆量 | `/topic/weather` | 跟颱風季強相關 |
| 「現在」意圖 | 「現在有什麼直播」「24小時新聞直播」 | 中 | `/live` | 可以做結構化資料 |

技術 SEO：
- 每個 `/watch/[id]` 輸出 `BroadcastEvent` + `VideoObject` JSON-LD（`isLiveBroadcast`、`startDate`、`publication`）。
- hreflang 先做 `zh-Hant-TW`，未來多語用 `/en/...`。
- 結束超過 7 天的事件頁回 410 或 noindex（資料也被 GC 掉，避免薄內容）。
- **每頁都要有站方自寫的內容**（頻道介紹、賽事說明、台灣時間對照、EPG 關聯），一方面是 SEO，另一方面是滿足 III.G.1.d 才能放 AdSense。

---

## 4. 條款重點對照（YouTube API Services）

| 條款 | 要求（改寫） | 本設計怎麼做 |
|---|---|---|
| III.E.4.d/e/f | 非授權資料只能暫存，最多 30 天；要保持跟 YouTube 一致、顯示最新資料 | `expires_at = fetched_at + 29d`；GC workflow；不存進 git |
| III.E.4.b/h | 統計資料不能存超過 30 天；不能做衍生指標 | 不存、不顯示觀看數或同時在線數 |
| III.E.6 | 不能 scrape YouTube | 只用 RSS（官方 feed）+ Data API |
| III.E.2 | 跨內容擁有者聚合 API 資料有限制（主要針對分析或統計） | 只顯示 title、時間、縮圖（metadata），不做跨頻道統計或排名。**建議請熟悉條款的人再讀一次原文** |
| III.F.3.a/b | 不能對觀看嵌入內容收費；除了按播放，不能要求其他動作 | Premium（NT$49）只賣「提醒、個人化、無廣告的站方 UI」，**播放永遠免費、不用登入** |
| III.G.1.c | 不能在 player 上或裡面賣廣告 | AdSense 放在 player 以外的區塊，不貼 player 邊框 |
| III.G.1.d | 有 API 資料的頁面要賣廣告，非 YouTube 內容要有足夠獨立價值 | 每頁有 EPG、台灣時間、自寫介紹；純嵌入頁不放廣告 |
| III.I.01 | 不能做成 YouTube 的替代品 | 定位是「節目表」，核心是 EPG + 時間；不做搜尋、推薦、留言 |
| III.I.06/07/09/21 | 不能改 player、分離影音、背景播放、巢狀 iframe 繞規則 | 只用官方 IFrame API |
| RMF | player ≥200×200、不能疊任何元素、一頁最多一個 autoplay、帶 Referer | §3.4、§3.5 |
| 指南第 6 點 | 不能開多個 project 灌 quota | 只用一個 prod project + 一個 dev project |

來源：[Developer Policies](https://developers.google.com/youtube/terms/developer-policies)、[合規指南](https://developers.google.com/youtube/terms/developer-policies-guide?authuser=5)、[Required Minimum Functionality](https://developers.google.com/youtube/terms/required-minimum-functionality)

---

## 5. 風險

| # | 風險 | 影響 | 機率 | 緩解 |
|---|---|---|---|---|
| R1 | **AdSense 跟 III.G.1.d**：頁面被認定主要價值來自 YouTube 內容 | 高（API 停權） | 中 | 每頁要有 EPG 或自寫內容；純嵌入頁不放廣告；上線前自評 |
| R2 | **鎖區判斷不準**：live 的 `regionRestriction` 常常空白，台灣觀眾點進去才發現看不了 | 中（跳出率、信任） | 高 | §3.5 的三層 fallback + `embed_errors` 回饋；體育類先標「可能鎖區」 |
| R3 | **官方身分誤判或頻道變動**：收到非官方台、24/7 停播（Arirang 改上 SOOP、SpaceX 改上 X）、合約到期（UWCL） | 中（紅線、品牌） | 中 | `verified_at` 每季人工複查；只收 §1.1 規則內的台；24/7 掛掉 24h 自動下架 |
| R4 | RSS 不含 upcoming 或格式改變 | 中 | 低到中 | `UULV` playlistItems 備援（quota 很夠） |
| R5 | Actions cron 延遲，「LIVE」狀態慢 10–20 分鐘 | 低 | 高 | 前端依 `scheduled_start` 自動切換；之後可改用 Vercel Cron 或 Supabase pg_cron |
| R6 | 30 天規則違規（資料進 git 或 CDN 長期快取） | 中 | 低 | YouTube 資料不 commit；ISR 頁面重新產生就會換掉 |
| R7 | Premium 被解讀成「付費看嵌入影片」 | 高 | 低 | 播放永遠不需要登入或付費；Premium 文案只講提醒功能 |

---

## 6. 建議 MVP（18 台）

選台原則：①**全球可看**的把握高（新聞、太空）②跟既有 EPG 有對應，可以做混排差異化 ③台灣搜尋需求明確 ④覆蓋 24/7、排程、premiere 三種型態，把管線測完整。

| # | 頻道 | 類別 | 型態 | 選它的理由 |
|---|---|---|---|---|
| 1 | Al Jazeera English | 新聞 | 24/7 | 全球開放；EPG 已有 → 混排示範 |
| 2 | DW News | 新聞 | 24/7 | 全球開放；README 已列 DW 備用 EPG 來源 |
| 3 | FRANCE 24 English | 新聞 | 24/7 | 全球開放、多語版本可以擴充 |
| 4 | Sky News | 新聞 | 24/7 | 全球開放、英國新聞代表 |
| 5 | ABC News (Australia) | 新聞 | 24/7 | YouTube 可國際觀看（明確文件記載），覆蓋亞太時段 |
| 6 | CNA | 新聞 | 24/7 | 亞洲英語新聞；台灣受眾相關 |
| 7 | TaiwanPlus | 新聞 | 24/7 | 台灣自家英語台，在地 SEO |
| 8 | NHK WORLD-JAPAN | 新聞 | 待驗證 | EPG 已有；如果 YouTube 不是 24/7 就換成 TBS NEWS DIG |
| 9 | NASA | 太空 | 排程 | 「NASA live」全球大字；ISS 畫面 |
| 10 | ESA | 太空 | 排程 | 歐洲發射，ID 已確認 |
| 11 | JAXA | 太空 | 排程 | H3 發射，台灣關注度高 |
| 12 | ISRO | 太空 | 排程 | 發射頻率高，填滿時間軸 |
| 13 | ウェザーニュース | 知識 | 24/7 | 颱風季流量爆量；可跟 `/topic/weather` 互相導流 |
| 14 | Lofi Girl | 音樂 | 24/7 | 全球最大 24/7 直播之一，`/live` 頁常駐 |
| 15 | explore.org | 知識 | 24/7 | 自然 cam，長尾 SEO |
| 16 | Muse 木棉花 | 動畫 | premiere | 台灣首播時間是高價值關鍵字；鎖區欄位實測 |
| 17 | Ani-One Asia | 動畫 | premiere | 同上，涵蓋港台東南亞 |
| 18 | BWF TV | 體育 | 排程 | 台灣羽球需求高；**刻意選一個會鎖區的台**來驗證 fallback |

暫緩：J.League（台灣不確定在開放區）、WTT（rights 變動大）、UWCL（合約狀態不明）、日本民放新聞台（海外可看與否待實測）、台灣新聞台（先做 1–2 台，避免政治色彩跟比較爭議）。

---

## 7. 上線前驗證清單

| # | 項目 | 方法 | quota |
|---|---|---|---|
| 1 | 所有 `待驗證` handle → UC ID | `channels.list?forHandle=@x&part=id,snippet` | 每台 1 |
| 2 | 確認是官方台 | 對照官網上的 YouTube 連結（官網連到該頻道才算） | 0 |
| 3 | 24/7 台目前的 live video ID | `playlistItems.list(UULV…)` → `videos.list` | 每台 2 |
| 4 | RSS 是否含 upcoming 跟 premiere | 找一場已排程的 NASA 直播，比對 RSS 跟 API | 1 |
| 5 | `videos.list` 一次 50 ID | 實測 | 1 |
| 6 | 台灣跟非台灣實測可否嵌入 | 用 Vercel preview + 不同地區的實機（同事或朋友），**不用 VPN** | 0 |
| 7 | `regionRestriction` 對 BWF live 有沒有值 | 在下一場 BWF 賽事時查 | 數 units |

---

## 附錄：來源

- YouTube Data API：[Quota costs](https://developers.google.com/youtube/v3/determine_quota_cost)｜[Videos resource](https://developers.google.com/youtube/v3/docs/videos?hl=zh-cn)｜[videos.list](https://developers.google.cn/youtube/v3/docs/videos/list)
- 條款：[Developer Policies](https://developers.google.com/youtube/terms/developer-policies)｜[Policies guide](https://developers.google.com/youtube/terms/developer-policies-guide?authuser=5)｜[Required Minimum Functionality](https://developers.google.com/youtube/terms/required-minimum-functionality)｜[Player parameters](https://developers.google.com/youtube/player_parameters)｜[IFrame API revision history](https://developers.google.com/youtube/iframe_api_revision_history?hl=ko)
- 嵌入與 RSS：[webcam.io live embed](https://webcam.io/docs/live-streaming/embed.html)｜[Zegnat: RSS world of YouTube](https://zegnat.bearblog.dev/the-rss-world-of-youtube/)｜[youtube_player_iframe error codes](https://pub.dev/documentation/youtube_player_iframe/latest/youtube_player_iframe/YoutubeError.html)
- 頻道：見 §1 各列連結
