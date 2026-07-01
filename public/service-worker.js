/* Simple offline-first service worker: caches the app shell so the reporter
   app loads even on a poor connection (relevant for rural, low-bandwidth use). */
const CACHE = "malaria-shell-v1";
const SHELL = [
  "/", "/report.html", "/index.html",
  "/css/styles.css", "/js/i18n.js", "/js/api.js", "/js/report.js",
  "/manifest.webmanifest", "/icons/icon-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Never cache API calls — always go to network.
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ error: "offline" }), { headers: { "Content-Type": "application/json" } })));
    return;
  }
  // App shell: cache-first, fall back to network.
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});