# global-tv-guide

全球節目表的資料管線：每天用 [iptv-org/epg](https://github.com/iptv-org/epg) 抓 20 個頻道的 EPG，轉成依頻道與台灣日期切好的 JSON，給 Next.js（ISR）讀。

只處理 EPG 文字資料。不含任何串流、m3u 或 proxy。

## 結構

```
channels.xml                     要抓的頻道（iptv-org 格式）
scripts/xmltv-to-json.mjs        XMLTV → JSON
.github/workflows/epg-daily.yml  每天台灣時間 03:17 執行
data/epg/channels.json           頻道索引（Actions 產生）
data/epg/<id>/<YYYY-MM-DD>.json  該台當日節目，日期以 Asia/Taipei 為準
```

`data/epg` 只保留昨天到 +7 天的資料，舊檔會自動刪除。

## 為什麼不 fork

workflow 執行時會直接 checkout 最新的 `iptv-org/epg`。上游修好 site parser，這裡下一次執行就會用到，不用同步 fork。

## 換頻道

1. 到 `iptv-org/epg/sites/<site>/<site>.channels.xml` 找到該台那一行。
2. 把那一行貼進 `channels.xml`。
3. 手動執行 workflow（Actions → EPG daily grab → Run workflow），在 Summary 看節目數。

已知的備用來源：

- JTBC：`m.tving.com` C01582
- DW English：`singtel.com` 5161
- BBC、CNN、beIN：`nowplayer.now.com`
