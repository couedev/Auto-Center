const CACHE_NAME = "auto-ct-pwa-v1";
const OFFLINE_PAGE = "/offline.html";
const OFFLINE_ASSETS = [OFFLINE_PAGE, "/assets/Auto%20CT%20transparent%20logo-2.webp"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("auto-ct-pwa-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(OFFLINE_PAGE)) || new Response(
        "Você está sem conexão. Conecte-se à internet e tente novamente.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }),
  );
});
