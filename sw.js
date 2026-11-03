const CACHE_NAME = "tazkeer-v10.0.0";
const QURAN_CACHE_NAME = "tazkeer-quran-pages-v1";
const PROPHETS_CACHE_NAME = "tazkeer-prophets-v1";
const API_CACHE_NAME = "tazkeer-api-v1";

// 1. Critical local app shell assets (cached atomically)
const CORE_LOCAL_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./quran.css",
  "./manifest.json",
  "./js/core/storage.js",
  "./js/core/router.js",
  "./js/modules/qibla.js",
  "./js/modules/misbaha.js",
  "./dailyDuas.js",
  "./script.js",
  "./quran.js",
  "./prophets.js",
  "./data/prophets-index.json",
  "./images/icon.png",
  "./images/icon-192.png",
  "./images/icon-512.png"
];

// 2. External CDN assets (cached fault-tolerantly so CDN slowdowns never block install)
const EXTERNAL_CDN_ASSETS = [
  "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Amiri+Quran&family=Cairo:wght@300;400;600;700&family=Noto+Naskh+Arabic:wght@400;600;700&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-regular-400.woff2"
];

// Install event - cache resources with zero-failure resilience
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async function (cache) {
        await cache.addAll(CORE_LOCAL_ASSETS);

        // B) Fault-tolerant cache for CDN assets
        await Promise.allSettled(
          EXTERNAL_CDN_ASSETS.map(async function (url) {
            try {
              const resp = await fetch(url, { mode: "cors" });
              if (resp && resp.status === 200) {
                await cache.put(url, resp);
              }
            } catch (cdnErr) {
              console.warn("[SW] External CDN asset skipped/failed:", url, cdnErr);
            }
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

// Fetch event - Cache first for static assets, network first for API calls
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Dedicated cache strategy for Quran page images
  if (
    url.hostname.includes("jsdelivr.net") &&
    url.pathname.includes("quran-hd-images")
  ) {
    event.respondWith(
      caches.open(QURAN_CACHE_NAME).then(function (quranCache) {
        return quranCache.match(event.request).then(function (response) {
          if (response) {
            return response;
          }
          return fetch(event.request).then(function (networkResponse) {
            if (networkResponse && networkResponse.ok) {
              return quranCache
                .put(event.request, networkResponse.clone())
                .then(function () {
                  return networkResponse;
                });
            }
            return networkResponse;
          }).catch(function () {
            return Response.error();
          });
        });
      }),
    );
    return;
  }

  // Dedicated cache strategy for Prophet story JSON files (Cache-First)
  if (
    url.pathname.includes("data/prophets/") &&
    url.pathname.endsWith(".json")
  ) {
    event.respondWith(
      caches.open(PROPHETS_CACHE_NAME).then(function (prophetsCache) {
        return prophetsCache.match(event.request).then(function (response) {
          if (response) {
            return response;
          }
          return fetch(event.request).then(function (networkResponse) {
            if (networkResponse && networkResponse.ok) {
              return prophetsCache
                .put(event.request, networkResponse.clone())
                .then(function () {
                  return networkResponse;
                });
            }
            return networkResponse;
          }).catch(function () {
            return new Response("{}", {
              status: 503,
              headers: { "Content-Type": "application/json" },
            });
          });
        });
      }),
    );
    return;
  }

  // For API calls (prayer times), use network first
  if (
    url.hostname === "api.aladhan.com" ||
    url.hostname === "api.bigdatacloud.net" ||
    url.hostname === "api.alquran.cloud"
  ) {
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          if (!response.ok) throw new Error("API request failed");
          const responseClone = response.clone();
          caches.open(API_CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(function () {
          return caches.match(event.request);
        }),
    );
  } else {
    // For static assets, use cache first
    event.respondWith(
      caches.match(event.request).then(function (response) {
        if (response) {
          // Update cache in background
          fetch(event.request)
            .then(function (networkResponse) {
              if (networkResponse && networkResponse.ok) {
                caches.open(CACHE_NAME).then(function (cache) {
                  cache.put(event.request, networkResponse.clone());
                });
              }
            })
            .catch(() => {});
          return response;
        }

        return fetch(event.request).then(function (networkResponse) {
          if (!networkResponse || !networkResponse.ok) {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseClone);
          });

          return networkResponse;
        });
      }),
    );
  }
});

// Activate event - clean up old caches
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== QURAN_CACHE_NAME &&
              cacheName !== PROPHETS_CACHE_NAME &&
              cacheName !== API_CACHE_NAME
            ) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

// Handle push notifications (for future use)
self.addEventListener("push", function (event) {
  const options = {
    body: event.data ? event.data.text() : "حان وقت الذكر",
    icon: "./images/icon-192.png",
    badge: "./images/icon-192.png",
    vibrate: [100, 50, 100],
    dir: "rtl",
    lang: "ar",
  };

  event.waitUntil(self.registration.showNotification("ذَكِّرْ", options));
});

// Handle notification click
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow("./"));
});
