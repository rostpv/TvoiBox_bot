export default function AndroidCheckPage() {
  const script = `
    (function () {
      function setText(id, value) {
        var node = document.getElementById(id);
        if (node) {
          node.textContent = value;
        }
      }

      var webApp = window.Telegram && window.Telegram.WebApp;
      setText("status", "HTML и встроенный JS загрузились.");
      setText("user-agent", navigator.userAgent || "unknown");
      setText("url", window.location.href);
      setText("telegram", webApp ? "Telegram.WebApp доступен" : "Telegram.WebApp недоступен");
      setText("version", webApp && webApp.version ? webApp.version : "unknown");
      setText("initdata", webApp && webApp.initData ? String(webApp.initData.length) : "0");

      if (webApp) {
        try {
          webApp.ready();
        } catch (error) {}

        try {
          webApp.expand();
        } catch (error) {}
      }
    })();
  `;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f4ef",
        color: "#161616",
        padding: "24px 18px 40px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "560px",
          margin: "0 auto",
          display: "grid",
          gap: "14px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "28px", lineHeight: 1.05 }}>Android Telegram Check</h1>
        <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.45 }}>
          Эта страница нужна только для диагностики загрузки внутри Android Telegram. Если она открылась, значит сам WebView и домен уже
          работают, а проблема остаётся в основном mini app bootstrap.
        </p>

        <section
          style={{
            display: "grid",
            gap: "10px",
            padding: "16px",
            borderRadius: "18px",
            background: "#ffffff",
            border: "1px solid rgba(22, 22, 22, 0.08)",
          }}
        >
          <div>
            <strong>Статус:</strong> <span id="status">Ждём выполнения встроенного JS...</span>
          </div>
          <div>
            <strong>Telegram API:</strong> <span id="telegram">Пока неизвестно</span>
          </div>
          <div>
            <strong>Версия Telegram WebApp:</strong> <span id="version">unknown</span>
          </div>
          <div>
            <strong>Длина initData:</strong> <span id="initdata">0</span>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gap: "10px",
            padding: "16px",
            borderRadius: "18px",
            background: "#ffffff",
            border: "1px solid rgba(22, 22, 22, 0.08)",
            wordBreak: "break-word",
          }}
        >
          <div>
            <strong>URL:</strong> <span id="url">unknown</span>
          </div>
          <div>
            <strong>User-Agent:</strong> <span id="user-agent">unknown</span>
          </div>
        </section>
      </div>

      <script dangerouslySetInnerHTML={{ __html: script }} />
    </main>
  );
}
