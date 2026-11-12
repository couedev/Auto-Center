/* global self */

const CACHE_NAME = "lavajato-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    self.caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith("lavajato-") && cacheName !== CACHE_NAME)
            .map((cacheName) => self.caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new self.URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin || request.mode !== "navigate") {
    return;
  }

  event.respondWith(
    self.fetch(request)
      .then(async (response) => {
        if (response.ok && requestUrl.pathname === "/") {
          await self.caches.open(CACHE_NAME).then((cache) => cache.put("/", response.clone()));
        }
        return response;
      })
      .catch(async () => {
        return (await self.caches.match("/", { ignoreSearch: true })) || (await self.caches.match(OFFLINE_URL));
      }),
      ),
  );
});
