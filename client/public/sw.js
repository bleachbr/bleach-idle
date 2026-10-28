// Service worker do app instalável: arte e mapas em cache (cache primeiro);
// páginas e scripts pela rede, com o cache como reserva se estiver sem internet.
// O jogo em si precisa de conexão com o servidor; o cache só acelera o carregamento.
const CACHE = "bleach-idle-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const asset = url.pathname.startsWith("/assets/") || url.pathname.startsWith("/maps/") || url.pathname.startsWith("/icons/");
  if (asset) {
    e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(e.request)) ?? fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; })));
  } else {
    e.respondWith(fetch(e.request).then((r) => { if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, r.clone())); return r; }).catch(() => caches.match(e.request)));
  }
});
