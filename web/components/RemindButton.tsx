'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Props = {
  slug: string;
  remindAt: string; // ISO
  remindLabel: string; // 例：11/13（五）07:30
  googleCalUrl: string;
  icsUrl: string;
};

type State =
  | 'checking' // 讀取登入狀態中
  | 'anon' // 未登入
  | 'need-email' // 顯示 Email 輸入框
  | 'sending-link'
  | 'link-sent'
  | 'signed-in' // 已登入但這個事件還沒設提醒
  | 'saving'
  | 'saved'
  | 'error';

// 寄登入信時記下「回來要自動設定哪個事件」，點信中連結回到同一個瀏覽器就自動完成
const PENDING_KEY = 'pendingRemind';

function readPending(): string | null {
  try {
    return localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}
function writePending(slug: string | null) {
  try {
    if (slug) localStorage.setItem(PENDING_KEY, slug);
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* 私密模式等情況：退回手動按鈕 */
  }
}

export default function RemindButton({ slug, remindAt, remindLabel, googleCalUrl, icsUrl }: Props) {
  const sb = supabaseBrowser();
  const [state, setState] = useState<State>('checking');
  const [email, setEmail] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [justDone, setJustDone] = useState(false); // 剛從登入信回來自動完成
  const userIdRef = useRef<string | null>(null);
  const handledRef = useRef(false);

  const save = useCallback(
    async (uid: string) => {
      if (!sb) return false;
      setState('saving');
      const { error } = await sb.from('reminders').upsert(
        { user_id: uid, target_type: 'site_event', target_id: slug, remind_at: remindAt },
        { onConflict: 'user_id,target_type,target_id' },
      );
      if (error) {
        setState('error');
        setMsg('儲存失敗，請再按一次。');
        return false;
      }
      setState('saved');
      return true;
    },
    [sb, slug, remindAt],
  );

  const onSession = useCallback(
    async (uid: string | null, mail: string | null) => {
      userIdRef.current = uid;
      setUserEmail(mail);
      if (!sb) return;
      if (!uid) {
        setState((s) => (s === 'link-sent' || s === 'need-email' ? s : 'anon'));
        return;
      }
      if (handledRef.current) return;
      handledRef.current = true;

      const { data: row } = await sb
        .from('reminders')
        .select('target_id')
        .eq('target_type', 'site_event')
        .eq('target_id', slug)
        .maybeSingle();
      if (row) {
        writePending(null);
        setState('saved');
        return;
      }
      if (readPending() === slug) {
        // 從登入信回來：自動完成，不用再按一次
        const ok = await save(uid);
        if (ok) {
          writePending(null);
          setJustDone(true);
        }
        return;
      }
      setState('signed-in');
    },
    [sb, slug, save],
  );

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      onSession(data.session?.user.id ?? null, data.session?.user.email ?? null);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        if (event === 'SIGNED_OUT') handledRef.current = false;
        onSession(session?.user.id ?? null, session?.user.email ?? null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [sb, onSession]);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!sb) return;
    setState('sending-link');
    writePending(slug);
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) {
      writePending(null);
      setState('error');
      setMsg('寄送登入連結失敗，請確認 Email 或稍後再試。');
    } else {
      setState('link-sent');
    }
  }

  const showMainButton = state === 'anon' || state === 'signed-in' || state === 'saving' || state === 'error';

  return (
    <div className="remind">
      <div className="remind-row">
        {sb && showMainButton && (
          <button
            className="btn primary"
            disabled={state === 'saving'}
            onClick={() => {
              const uid = userIdRef.current;
              if (uid) save(uid);
              else setState('need-email');
            }}
          >
            {state === 'saving'
              ? '設定中…'
              : state === 'signed-in'
                ? `完成設定：Email 提醒我（${remindLabel}）`
                : `Email 提醒我（${remindLabel}）`}
          </button>
        )}
        {state === 'saved' && (
          <span className="ok saved-badge" role="status">
            ✓ 提醒已設定
          </span>
        )}
        <a className="btn" href={googleCalUrl} target="_blank" rel="noopener noreferrer">
          加到 Google 日曆
        </a>
        <a className="btn" href={icsUrl}>
          下載 .ics
        </a>
      </div>

      {state === 'saved' && (
        <p className="ok remind-detail" role="status">
          {justDone ? '登入成功，提醒已自動設定完成。' : ''}
          {remindLabel} 會寄到 {userEmail ?? '你的信箱'}。
        </p>
      )}

      {state === 'signed-in' && (
        <p className="hint">已登入 {userEmail}，按上面的按鈕就完成設定。</p>
      )}

      {state === 'need-email' && (
        <form className="remind-form" onSubmit={sendLink}>
          <label htmlFor="remind-email">輸入 Email，我們寄一封登入信給你。點信中連結回到這頁，提醒會自動設定完成。</label>
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
              寄登入信
            </button>
          </div>
        </form>
      )}
      {state === 'sending-link' && <p className="hint">寄送中…</p>}
      {state === 'link-sent' && (
        <p className="ok">
          已寄到 {email}。請在<strong>這個瀏覽器</strong>點信中連結，回來後提醒會自動設定完成，不用再按。
        </p>
      )}
      {state === 'error' && <p className="err">{msg}</p>}
    </div>
  );
}
