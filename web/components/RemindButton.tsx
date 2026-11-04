'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Props = {
  slug: string;
  remindAt: string; // ISO
  remindLabel: string; // 例：11/13（五）07:30
  googleCalUrl: string;
  icsUrl: string;
};

type State = 'idle' | 'need-email' | 'sending-link' | 'link-sent' | 'saving' | 'saved' | 'error';

export default function RemindButton({ slug, remindAt, remindLabel, googleCalUrl, icsUrl }: Props) {
  const sb = supabaseBrowser();
  const [state, setState] = useState<State>('idle');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data: row } = await sb
        .from('reminders')
        .select('target_id')
        .eq('target_type', 'site_event')
        .eq('target_id', slug)
        .maybeSingle();
      if (row) setState('saved');
    });
  }, [sb, slug]);

  async function save() {
    if (!sb) return;
    if (!userId) {
      setState('need-email');
      return;
    }
    setState('saving');
    const { error } = await sb.from('reminders').upsert(
      { user_id: userId, target_type: 'site_event', target_id: slug, remind_at: remindAt },
      { onConflict: 'user_id,target_type,target_id' },
    );
    if (error) {
      setState('error');
      setMsg('儲存失敗，請稍後再試。');
    } else {
      setState('saved');
    }
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!sb) return;
    setState('sending-link');
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    if (error) {
      setState('error');
      setMsg('寄送登入連結失敗，請確認 Email。');
    } else {
      setState('link-sent');
    }
  }

  return (
    <div className="remind">
      <div className="remind-row">
        {sb && state !== 'saved' && state !== 'need-email' && state !== 'link-sent' && (
          <button className="btn primary" onClick={save} disabled={state === 'saving'}>
            {state === 'saving' ? '設定中…' : `Email 提醒我（${remindLabel}）`}
          </button>
        )}
        {state === 'saved' && <span className="ok">✓ 已設定，{remindLabel} 會寄提醒給你</span>}
        <a className="btn" href={googleCalUrl} target="_blank" rel="noopener noreferrer">
          加到 Google 日曆
        </a>
        <a className="btn" href={icsUrl}>
          下載 .ics
        </a>
      </div>

      {state === 'need-email' && (
        <form className="remind-form" onSubmit={sendLink}>
          <label htmlFor="remind-email">輸入 Email，我們寄登入連結給你，回來後再按一次就完成。</label>
          <div className="remind-row">
            <input
              id="remind-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <button className="btn primary" type="submit">
              寄登入連結
            </button>
          </div>
        </form>
      )}
      {state === 'sending-link' && <p className="hint">寄送中…</p>}
      {state === 'link-sent' && <p className="ok">已寄出，請到信箱點連結回到這頁。</p>}
      {state === 'error' && <p className="err">{msg}</p>}
    </div>
  );
}
