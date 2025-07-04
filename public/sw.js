const CACHE_NAME = "parking-pwa-v1"
const urlsToCache = ["/", "/manifest.json"]

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...")
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache")
      // Solo cachear URLs que sabemos que existen
      return cache.addAll(urlsToCache).catch((error) => {
        console.error("Error adding to cache:", error)
        // Continuar aunque falle el cache
        return Promise.resolve()
      })
    }),
  )
  self.skipWaiting()
})

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...")
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

// Fetch event
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if available
      if (response) {
        return response
      }

      // Try to fetch from network
      return fetch(event.request).catch((error) => {
        console.log("Fetch failed for:", event.request.url, error)
        // Return a basic response for failed requests
        if (event.request.destination === "document") {
          return new Response("Offline", { status: 200, statusText: "OK" })
        }
        return new Response("", { status: 404, statusText: "Not Found" })
      })
    }),
  )
})

// Push event for notifications
self.addEventListener("push", (event) => {
  console.log("Push event received:", event)

  let notificationData = {
    title: "Parking PWA",
    body: "Nueva notificación",
    icon: "/favicon.ico", // Usar favicon como fallback
    badge: "/favicon.ico",
    tag: "parking-notification",
    requireInteraction: false,
    silent: false,
  }

  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = { ...notificationData, ...data }
    } catch (e) {
      console.error("Error parsing push data:", e)
      notificationData.body = event.data.text() || "Nueva notificación"
    }
  }

  event.waitUntil(self.registration.showNotification(notificationData.title, notificationData))
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event)
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus()
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow("/")
      }
    }),
  )
})
