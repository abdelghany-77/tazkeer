const CACHE_NAME = "tazkeer-v6.7";
const urlsToCache = [
  "./",
  "./index.html",
  "./styles.css",
  "./quran.css",
  "./dailyDuas.js",
  "./script.js",
  "./quran.js",
  "./manifest.json",
  "./widget.html",
  "./widget.css",
  "./widget.js",
  "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@300;400;600;700&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-regular-400.woff2",
];

// Install event - cache resources
self.addEventListener("install", function (event) {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        console.log("Opened cache");
        return cache.addAll(urlsToCache);
      })
      .catch(function (error) {
        console.error("Cache install failed:", error);
      }),
  );
});

// Fetch event - Cache first for static assets, network first for API calls
self.addEventListener("fetch", function (event) {
  const url = new URL(event.request.url);

  // For API calls (prayer times), use network first
  if (
    url.hostname.includes("aladhan.com") ||
    url.hostname.includes("alquran.cloud") ||
    url.hostname.includes("api")
  ) {
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
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
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then(function (cache) {
                  cache.put(event.request, networkResponse.clone());
                });
              }
            })
            .catch(() => {});
          return response;
        }

        return fetch(event.request).then(function (networkResponse) {
          if (!networkResponse || networkResponse.status !== 200) {
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
            if (cacheName !== CACHE_NAME) {
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
    icon: "./favicon.svg",
    badge: "./favicon.svg",
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
