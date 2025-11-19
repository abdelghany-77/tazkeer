const CACHE_NAME = "tazkeer-v2.1";
const urlsToCache = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.json",
  "./favicon.svg",
  "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@300;400;600;700&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css",
];

// Install event - cache resources
self.addEventListener("install", function (event) {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(urlsToCache);
      })
      .catch(function (error) {
        console.log("Cache install failed:", error);
      })
  );
});

// Fetch event - Network first, fallback to cache (better for dynamic content)
self.addEventListener("fetch", function (event) {
  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        // Clone the response
        const responseClone = response.clone();

        // Update cache with new version
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseClone);
        });

        return response;
      })
      .catch(function () {
        // If network fails, try cache
        return caches.match(event.request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", function (event) {
  // Take control of all pages immediately
  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});
