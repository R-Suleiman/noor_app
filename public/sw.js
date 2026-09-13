const CACHE_NAME = "noor-shell-__NOOR_BUILD__";
const DATA_CACHE_NAME = "noor-public-data-v1";
const PRECACHE_ASSETS = [/* __NOOR_PRECACHE__ */];
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/favicon-16.png",
  "/favicon-32.png",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
  "/pwa-icon-maskable-512.png",
  "/apple-touch-icon.png",
  ...PRECACHE_ASSETS,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        const previousNoorCaches = keys.filter((key) => key.startsWith("noor-shell-") && key !== CACHE_NAME);
        // Retain one prior build so an already-open tab can still request one
        // of its lazy chunks while the new service worker takes control.
        return Promise.all(previousNoorCaches.slice(0, -1).map((key) => caches.delete(key)));
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== "GET"
    || request.headers.has("range")
    || request.destination === "audio"
    || url.pathname.startsWith("/uploads/")
  ) {
    return;
  }

  const isPublicCatalogRequest = !request.headers.has("authorization")
    && /^\/api\/v1\/(tracks|artists|albums|search)(?:[/?]|$)/.test(url.pathname);

  if (isPublicCatalogRequest) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const copy = response.clone();
            const cache = await caches.open(DATA_CACHE_NAME);
            await cache.put(request, copy);
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || new Response(
          JSON.stringify({ error: "No cached catalog data is available while offline" }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        )),
    );
    return;
  }

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          const copy = response.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put("/", copy);
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Immutable, hashed application assets load instantly after their first
  // install and remain available when a connection drops.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then(async (response) => {
        if (response.ok) {
          const copy = response.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, copy);
        }
        return response;
      });
    }),
  );
});
