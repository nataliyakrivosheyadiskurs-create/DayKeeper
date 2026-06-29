/* =========================================================
   DayKeeper — Service Worker
   Кэширует приложение для работы офлайн
   ========================================================= */

const CACHE_NAME = "daykeeper-v1";

// Файлы которые кэшируем при установке
const PRECACHE_URLS = [
  "/DayKeeper/",
  "/DayKeeper/index.html",
  "/DayKeeper/styles.css",
  "/DayKeeper/app.js",
  "/DayKeeper/supabase-layer.js",
  "/DayKeeper/assets/logo-circle-64.png",
  "/DayKeeper/assets/logo-circle-512.png",
  "/DayKeeper/assets/favicon-32.png",
  "/DayKeeper/assets/apple-touch-icon-180.png",
  "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
];

// Установка — кэшируем основные файлы
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        PRECACHE_URLS.map(url => cache.add(url).catch(e => console.warn("SW: cant cache", url, e)))
      );
    })
  );
});

// Активация — удаляем старые кэши
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — сначала сеть, при ошибке кэш (network-first для Supabase API, cache-first для статики)
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Supabase запросы — всегда через сеть, не кэшировать
  if (url.hostname.includes("supabase.co")) {
    return; // браузер сам обработает
  }

  // Статические файлы — network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Кэшируем свежий ответ
        if (response.ok && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Офлайн — отдаём из кэша
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Если запрос на страницу — отдаём index.html
          if (event.request.destination === "document") {
            return caches.match("/DayKeeper/index.html");
          }
        });
      })
  );
});

// Push-уведомления (для будущего использования с сервером)
self.addEventListener("push", event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || "DayKeeper 🦊", {
    body: data.body || "",
    icon: "/DayKeeper/assets/logo-circle-64.png",
    badge: "/DayKeeper/assets/favicon-32.png",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/DayKeeper/" }
  });
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || "/DayKeeper/")
  );
});
