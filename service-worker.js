const CACHE_NAME = "bibleapp-pwa-v83";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js?v=64",
  "./daily_verses.json",
  "./efemerides.json",
  "./manifest.json",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).catch(() => cached)
    )
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = null;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Versículo del día", body: event.data.text() };
  }
  const title = payload.title || "Versículo del día";
  const options = {
    body: payload.body || "",
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    data: {
      url: payload.url || "./"
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((client) => client.url === url);
      if (existing) {
        existing.focus();
        return null;
      }
      return clients.openWindow(url);
    })
  );
});
