// send-reminders：pg_cron 每 5 分鐘呼叫一次，把到期的提醒用 Email 寄出（Gmail SMTP 或 Resend）
//
// 寄信方式（Supabase Dashboard → Edge Functions → Secrets），優先順序：
//   1. Gmail SMTP：GMAIL_APP_PASSWORD（Google 帳戶的「應用程式密碼」）
//                  GMAIL_USER 選填，預設 prpispace@gmail.com
//   2. Resend：    RESEND_API_KEY，寄件人 REMINDER_FROM（要先在 Resend 驗證自有網域）
//   兩者都沒設定時直接回 503，不會消耗任何提醒
//   SITE_URL         選填，預設 https://global-tv-guide.vercel.app
// 自動提供：SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY
//
// 驗證：Header x-cron-secret 要等於 Vault 裡的 reminders_cron_secret

import { createClient } from 'npm:@supabase/supabase-js@2';

type Claimed = {
  user_id: string;
  target_type: 'site_event' | 'yt_event' | 'epg_programme';
  target_id: string;
  remind_at: string;
  attempts: number;
};

type Target = {
  title: string;
  when: string; // 台灣時間文字
  url: string;
  extra?: string; // 觀看管道等補充（HTML）
};

const SITE = (Deno.env.get('SITE_URL') ?? 'https://global-tv-guide.vercel.app').replace(/\/$/, '');
const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const GMAIL_USER = Deno.env.get('GMAIL_USER') ?? 'prpispace@gmail.com';
const GMAIL_PASS = Deno.env.get('GMAIL_APP_PASSWORD')?.replace(/\s+/g, ''); // Google 顯示時有空格
const PROVIDER: 'gmail' | 'resend' | null = GMAIL_PASS ? 'gmail' : RESEND_KEY ? 'resend' : null;
const FROM =
  PROVIDER === 'gmail'
    ? `全球節目表 <${GMAIL_USER}>` // Gmail 只允許用登入帳號當寄件人
    : (Deno.env.get('REMINDER_FROM') ?? '全球節目表 <onboarding@resend.dev>');

// Supabase Edge Functions 擋 25／587 埠，Gmail 要走 465（SSL）
let gmail: any = null;
async function gmailTransport() {
  if (!gmail) {
    const nodemailer = (await import('npm:nodemailer@6.9.16')).default;
    gmail = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });
  }
  return gmail;
}

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const tw = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// ── 事件資料 ────────────────────────────────────────────────
let siteEvents: Map<string, any> | null = null;

async function loadSiteEvents() {
  if (siteEvents) return siteEvents;
  const res = await fetch(`${SITE}/events.json`);
  if (!res.ok) throw new Error(`events.json ${res.status}`);
  const { events } = await res.json();
  siteEvents = new Map(events.map((e: any) => [e.slug, e]));
  return siteEvents;
}

async function resolveTarget(r: Claimed): Promise<Target | null> {
  if (r.target_type === 'site_event') {
    const ev = (await loadSiteEvents()).get(r.target_id);
    if (!ev) return null;
    const watch = (ev.watch ?? [])
      .map((w: any) => `<li><a href="${esc(w.url)}">${esc(w.label)}</a>（${esc(w.region)}）</li>`)
      .join('');
    return {
      title: ev.title,
      when: ev.pre_show_tw ? `${ev.start_tw}（前導秀 ${ev.pre_show_tw}）` : ev.start_tw,
      url: ev.url,
      extra: watch ? `<p style="margin:16px 0 4px">官方觀看管道：</p><ul style="margin:0;padding-left:20px">${watch}</ul>` : '',
    };
  }
  if (r.target_type === 'yt_event') {
    const { data } = await sb
      .from('yt_events')
      .select('title, scheduled_start, actual_start')
      .eq('video_id', r.target_id)
      .maybeSingle();
    if (!data) return null;
    const start = data.actual_start ?? data.scheduled_start;
    return {
      title: data.title,
      when: start ? tw.format(new Date(start)) : '即將開始',
      url: `${SITE}/watch/${encodeURIComponent(r.target_id)}`,
    };
  }
  if (r.target_type === 'epg_programme') {
    const { data } = await sb
      .from('epg_programmes')
      .select('title, channel, start_at')
      .eq('id', r.target_id)
      .maybeSingle();
    if (!data) return null;
    return {
      title: `${data.title}（${data.channel}）`,
      when: tw.format(new Date(data.start_at)),
      url: `${SITE}/channel/${encodeURIComponent(data.channel)}`,
    };
  }
  return null;
}

// ── 寄信 ────────────────────────────────────────────────────
function buildEmail(t: Target) {
  const link = `${t.url}${t.url.includes('?') ? '&' : '?'}utm_source=reminder&utm_medium=email`;
  const subject = `【開播提醒】${t.title}｜台灣時間 ${t.when}`;
  const html = `<!doctype html><html lang="zh-Hant-TW"><body style="margin:0;background:#f6f6f3;padding:24px 12px;font-family:system-ui,-apple-system,'PingFang TC','Microsoft JhengHei',sans-serif;color:#1b1b1f">
<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e3e2dc;border-radius:12px;padding:24px">
<p style="margin:0 0 4px;color:#62646c;font-size:13px">全球節目表・開播提醒</p>
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.4">${esc(t.title)}</h1>
<p style="margin:0;font-size:16px">台灣時間 <strong style="color:#d8342b">${esc(t.when)}</strong></p>
${t.extra ?? ''}
<p style="margin:24px 0 0"><a href="${esc(link)}" style="display:inline-block;background:#d8342b;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">打開節目頁</a></p>
<p style="margin:24px 0 0;color:#62646c;font-size:12px;line-height:1.6">你收到這封信，是因為你在全球節目表為這個節目設定了提醒。時間以主辦單位公告為準。</p>
</div></body></html>`;
  const text = `${t.title}\n台灣時間 ${t.when}\n\n節目頁：${link}\n\n你收到這封信，是因為你在全球節目表為這個節目設定了提醒。`;
  return { subject, html, text };
}

async function sendOne(r: Claimed, email: string, t: Target) {
  const { subject, html, text } = buildEmail(t);
  if (PROVIDER === 'gmail') {
    const tr = await gmailTransport();
    await tr.sendMail({
      from: FROM,
      to: email,
      subject,
      html,
      text,
      // 同一筆提醒固定同一個 Message-ID，萬一重送收件端也比較容易去重
      messageId: `<reminder.${r.user_id}.${r.target_type}.${encodeURIComponent(r.target_id)}@global-tv-guide>`,
    });
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
      // 同一筆提醒重試也只會寄一次
      'Idempotency-Key': `reminder/${r.user_id}/${r.target_type}/${r.target_id}`.slice(0, 256),
    },
    body: JSON.stringify({ from: FROM, to: [email], subject, html, text }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

// ── 主流程 ──────────────────────────────────────────────────
Deno.serve(async (req) => {
  const { data: secret, error: secErr } = await sb.rpc('reminders_cron_secret');
  if (secErr || !secret || req.headers.get('x-cron-secret') !== secret) {
    return new Response('forbidden', { status: 403 });
  }
  if (!PROVIDER) {
    // 還沒設定寄信方式：不領取任何提醒，設定好下一輪就會寄
    return Response.json({ ok: false, reason: 'no mail provider (set GMAIL_APP_PASSWORD or RESEND_API_KEY)' }, { status: 503 });
  }

  const { data: claimed, error } = await sb.rpc('claim_due_reminders', { p_limit: 50 });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  const result = { claimed: claimed?.length ?? 0, sent: 0, failed: 0, skipped: 0 };

  for (const r of (claimed ?? []) as Claimed[]) {
    try {
      const { data: u, error: uErr } = await sb.auth.admin.getUserById(r.user_id);
      const email = u?.user?.email;
      if (uErr || !email) {
        // 找不到收件人：不重試
        await sb.from('reminders').update({ last_error: 'no email' }).match({
          user_id: r.user_id,
          target_type: r.target_type,
          target_id: r.target_id,
        });
        result.skipped++;
        continue;
      }
      const target = await resolveTarget(r);
      if (!target) {
        await sb.from('reminders').update({ last_error: 'target not found' }).match({
          user_id: r.user_id,
          target_type: r.target_type,
          target_id: r.target_id,
        });
        result.skipped++;
        continue;
      }
      await sendOne(r, email, target);
      result.sent++;
    } catch (e) {
      result.failed++;
      await sb.rpc('release_reminder', {
        p_user: r.user_id,
        p_type: r.target_type,
        p_id: r.target_id,
        p_error: String(e instanceof Error ? e.message : e),
      });
    }
  }

  return Response.json({ ok: true, provider: PROVIDER, ...result });
});
