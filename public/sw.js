// 通知を受けて出す Service Worker。送る側は lib/push.ts。
// ページの読み込みには口を出さない（fetch は扱わない）

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  // null や数だけが届いても、通知は必ず出す（出さないとブラウザが受け口を取り消すことがある）
  if (!payload || typeof payload !== "object") payload = {};

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title || "PLATE LAB", {
        body: payload.body || "",
        icon: "/icon-192x192.png",
        data: { url: payload.url || "/" },
      }),
      setBadge(payload.badge),
    ])
  );
});

// ホーム画面のアイコンに、知らせたプレートの枚数を出す。アプリを開くと消す（components/app-badge-clearer.tsx）。
// アプリを前に出して見ている間は出さない。出せない端末では何もしない
async function setBadge(count) {
  if (typeof count !== "number" || count <= 0) return;
  if (!("setAppBadge" in self.navigator)) return;
  try {
    const windows = await self.clients.matchAll({ type: "window" });
    if (windows.some((client) => client.visibilityState === "visible")) return;
    await self.navigator.setAppBadge(count);
  } catch {
    // バッジが出なくても、通知は出ているのでそのままにする
  }
}

// 通知を押したら、開いている画面があればそこで、無ければ新しく開く
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin
  ).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const client = windows[0];
      if (client) {
        try {
          await client.focus();
          await client.navigate(url);
          return;
        } catch {
          // この Service Worker が受け持っていない画面は移動できないので、新しく開く
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
