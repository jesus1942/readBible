const CACHE_NAME = "bibleapp-pwa-v118";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=3",
  "./core.js?v=4",
  "./apocrypha.js?v=2",
  "./net.js?v=2",
  "./auth.js?v=2",
  "./app.js?v=92",
  "./daily_verses.json",
  "./efemerides.json",
  "./manifest.json",
  "./data/enoch-es-01-36.tsv?v=1",
  "./data/enoch-es-37-71.tsv?v=1",
  "./data/enoch-es-72-90.tsv?v=1",
  "./data/enoch-es-91-108.tsv?v=1",
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
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
      const all = await self.clients.matchAll({ type: "window" });
      all.forEach((client) => client.postMessage({ type: "SW_UPDATED", version: CACHE_NAME }));
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // index.html conserva una URL historica de core.js. Redirigimos la peticion
  // al artefacto versionado actual para que la extension de libros antiguos
  // no dependa de que el HTML cambie al mismo tiempo que el service worker.
  if (requestUrl.pathname.endsWith("/core.js")) {
    const currentCore = new URL("./core.js?v=4", self.location.href).toString();
    event.respondWith(
      caches.match(currentCore).then((cached) =>
        cached || fetch(currentCore).catch(() => cached)
      )
    );
    return;
  }

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
    data: { url: payload.url || "./" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((client) => client.url === url);
      if (existing) { existing.focus(); return null; }
      return clients.openWindow(url);
    })
  );
});
