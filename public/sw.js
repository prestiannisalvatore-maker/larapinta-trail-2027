/* Larapinta Trail — app shell + CARTO tiles, same pattern as Australind */
const SHELL = "larapinta-shell-v1";
const TILES = "larapinta-tiles-v1";

const PRECACHE = ["/", "/map", "/itinerary", "/costs", "/gear", "/logistics", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("larapinta-") && key !== SHELL && key !== TILES)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isTileRequest(url) {
  return url.hostname.includes("basemaps.cartocdn.com");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (url.pathname.startsWith("/data/")) {
    event.respondWith(
      caches.open(TILES).then(async (cache) => {
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          const hit = await cache.match(req);
          if (hit) return hit;
          return Response.error();
        }
      }),
    );
    return;
  }

  if (isTileRequest(url)) {
    event.respondWith(
      caches.open(TILES).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return hit || Response.error();
        }
      }),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then(async (res) => {
          if (res.ok && req.mode === "navigate") {
            const cache = await caches.open(SHELL);
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(SHELL);
          const hit = await cache.match(req);
          if (hit) return hit;
          if (req.mode === "navigate") {
            const home = await cache.match("/");
            if (home) return home;
          }
          return Response.error();
        }),
    );
  }
});
