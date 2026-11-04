export default function NotFound() {
  return (
    <main className="wrap">
      <header className="hero">
        <h1>找不到這個頁面</h1>
        <p className="sub">頁面可能已移除，或活動已經結束。</p>
      </header>
      <p>
        <a href="/upcoming">看即將開始的活動 →</a>
      </p>
      <p>
        <a href="/">回全球節目表首頁</a>
      </p>
    </main>
  );
}
