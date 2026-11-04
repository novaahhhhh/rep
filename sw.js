// Rep service worker: keeps the app working offline and remembers GIFs you've viewed.
const SHELL = "rep-shell-v1";
const IMGS = "rep-gifs-v1";
const FILES = ["./", "index.html", "exercises.json", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable.png", "apple-touch-icon.png", "favicon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== IMGS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Exercise GIFs and thumbnails: use the saved copy if there is one.
  if (url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(
      caches.open(IMGS).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === "opaque") c.put(req, res.clone());
        return res;
      })))
    );
    return;
  }

  // The app's own files: try the network first so updates show up, fall back to the saved copy offline.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) caches.open(SHELL).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match("index.html")))
    );
  }
});
