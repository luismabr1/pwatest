const CACHE_NAME = "parking-app-v1"
const urlsToCache = ["/", "/admin", "/manifest.json", "/icons/icon-192x192.png", "/icons/icon-512x512.png"]

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache")
      return cache.addAll(urlsToCache)
    }),
  )
})

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request)
    }),
  )
})

// Push event for notifications
self.addEventListener("push", (event) => {
  console.log("Push event received:", event)

  let notificationData = {}

  if (event.data) {
    try {
      notificationData = event.data.json()
    } catch (e) {
      notificationData = {
        title: "Sistema de Estacionamiento",
        body: event.data.text() || "Nueva notificación",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
      }
    }
  }

  const options = {
    body: notificationData.body || "Nueva notificación",
    icon: notificationData.icon || "/icons/icon-192x192.png",
    badge: notificationData.badge || "/icons/icon-72x72.png",
    vibrate: [100, 50, 100],
    data: notificationData.data || {},
    actions: notificationData.actions || [],
    tag: notificationData.tag || "parking-notification",
    requireInteraction: notificationData.requireInteraction || false,
    silent: false,
  }

  event.waitUntil(self.registration.showNotification(notificationData.title || "Sistema de Estacionamiento", options))
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event)

  event.notification.close()

  const urlToOpen = event.notification.data?.url || "/"

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus()
          }
        }

        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      }),
  )
})

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("Background sync:", event.tag)

  if (event.tag === "payment-sync") {
    event.waitUntil(syncPayments())
  }
})

async function syncPayments() {
  try {
    // Sync any pending payments when back online
    console.log("Syncing payments...")
    // Implementation would depend on your offline storage strategy
  } catch (error) {
    console.error("Error syncing payments:", error)
  }
}
