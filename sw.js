// Take Tren service worker: the app works fully offline after the first visit.
const CACHE = "taketren-v2.2.0";
const FILES = ["./", "index.html", "core.js", "views.js", "actions.js", "body.js", "manifest.webmanifest",
  "icons/logo.svg", "img/splash.jpg", "img/pr.jpg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable.png", "icons/apple-touch-icon.png", "icons/favicon.png",
  "fonts/barlow-600.woff2", "fonts/barlow-700.woff2", "fonts/barlow-800.woff2", "fonts/inter-400.woff2", "fonts/inter-500.woff2", "fonts/inter-600.woff2", "fonts/inter-700.woff2"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // Network first so updates arrive; the saved copy is used when offline.
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch: true}).then(hit => hit || caches.match("index.html")))
  );
});
