// XMLTV → JSON（依頻道 / 台灣日期切檔）
// 用法：node scripts/xmltv-to-json.mjs <guide.xml> <outDir>
// 產出：
//   <outDir>/channels.json                    頻道索引
//   <outDir>/<channelId>/<YYYY-MM-DD>.json    該台當日（Asia/Taipei）節目
// 只保留「昨天 ~ +7 天」，舊檔自動刪除，repo 不會無限長大。

import fs from 'node:fs'
import path from 'node:path'
import { XMLParser } from 'fast-xml-parser'

const [, , input, outDir] = process.argv
if (!input || !outDir) {
  console.error('usage: node scripts/xmltv-to-json.mjs <guide.xml> <outDir>')
  process.exit(1)
}

const TZ = 'Asia/Taipei'
const KEEP_PAST_DAYS = 1
const KEEP_FUTURE_DAYS = 7

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text',
  isArray: name => ['channel', 'programme', 'title', 'desc', 'category', 'display-name', 'sub-title'].includes(name)
})

const xml = parser.parse(fs.readFileSync(input, 'utf8'))
const tv = xml.tv ?? {}
const channels = tv.channel ?? []
const programmes = tv.programme ?? []

// "20261101120000 +0900" → Date
function parseXmltvTime(s) {
  const m = String(s).match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/)
  if (!m) return null
  const [, Y, M, D, h, mi, se, off = '+0000'] = m
  return new Date(`${Y}-${M}-${D}T${h}:${mi}:${se}${off.slice(0, 3)}:${off.slice(3)}`)
}

const dateFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const taipeiDate = d => dateFmt.format(d) // YYYY-MM-DD

const pickText = arr => {
  if (!arr || !arr.length) return null
  const v = arr[0]
  return (typeof v === 'object' ? v.text : v) ?? null
}
const safeId = id => String(id).replace(/[^A-Za-z0-9._@-]/g, '_')

// 頻道索引
const channelIndex = channels.map(c => ({
  id: c.id,
  slug: safeId(c.id),
  name: pickText(c['display-name']),
  icon: c.icon?.src ?? null,
  url: c.url ?? null
}))

// 依頻道 + 台灣日期分組
const groups = new Map()
for (const p of programmes) {
  const start = parseXmltvTime(p.start)
  const stop = parseXmltvTime(p.stop)
  if (!start) continue
  const key = `${safeId(p.channel)}/${taipeiDate(start)}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push({
    start: start.toISOString(),
    stop: stop ? stop.toISOString() : null,
    title: pickText(p.title),
    subTitle: pickText(p['sub-title']),
    desc: pickText(p.desc),
    category: (p.category ?? []).map(c => (typeof c === 'object' ? c.text : c)).filter(Boolean)
  })
}

fs.mkdirSync(outDir, { recursive: true })
for (const [key, list] of groups) {
  list.sort((a, b) => a.start.localeCompare(b.start))
  const file = path.join(outDir, `${key}.json`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ tz: TZ, programmes: list }))
}

// 合併頻道索引（某台當天抓失敗時不會從索引消失）
const indexFile = path.join(outDir, 'channels.json')
const prev = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')).channels ?? [] : []
const merged = new Map(prev.map(c => [c.id, c]))
for (const c of channelIndex) merged.set(c.id, { ...merged.get(c.id), ...c })
fs.writeFileSync(
  indexFile,
  JSON.stringify({ updatedAt: new Date().toISOString(), channels: [...merged.values()] }, null, 2)
)

// 清掉超出保留區間的舊檔
const today = taipeiDate(new Date())
const shift = n => taipeiDate(new Date(Date.now() + n * 86400000))
const minDate = shift(-KEEP_PAST_DAYS)
const maxDate = shift(KEEP_FUTURE_DAYS)
let removed = 0
for (const dir of fs.readdirSync(outDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue
  for (const f of fs.readdirSync(path.join(outDir, dir.name))) {
    const d = f.replace(/\.json$/, '')
    if (d < minDate || d > maxDate) {
      fs.rmSync(path.join(outDir, dir.name, f))
      removed++
    }
  }
}

// 每台節目數（第一次跑時用來找出抓不到的台）
const perChannel = new Map(channelIndex.map(c => [c.id, 0]))
for (const p of programmes) perChannel.set(p.channel, (perChannel.get(p.channel) ?? 0) + 1)
const empty = []
for (const [id, n] of perChannel) {
  console.log(`${n === 0 ? '⚠️ ' : '   '}${String(n).padStart(5)}  ${id}`)
  if (n === 0) empty.push(id)
}
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = [...perChannel].map(([id, n]) => `| ${id} | ${n} |`).join('\n')
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### EPG 抓取結果\n\n| channel | programmes |\n|---|---|\n${rows}\n\n0 節目：${empty.length} 台\n`)
}

console.log(`today(${TZ})=${today} channels=${channelIndex.length} programmes=${programmes.length} files=${groups.size} removed=${removed}`)
