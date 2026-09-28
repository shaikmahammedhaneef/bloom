// Bloom service worker. It makes the app installable and shows reminders as
// system notifications. Clicking a notification focuses Bloom (or opens it).
// Pages and API calls always go to the network, so data is never stale.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Offline fallback for page loads only.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bloom</title>' +
            '<body style="font-family:system-ui,sans-serif;background:#f6f2ea;color:#1e1b16;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:16px">' +
            "<div><h1 style=\"font-size:22px\">You're offline</h1><p>Bloom needs a connection to sync your data. Try again when you're back online.</p></div>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        ),
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/today", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin) {
          if (w.url !== url && "navigate" in w) w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
