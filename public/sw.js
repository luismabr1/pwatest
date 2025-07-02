const CACHE_NAME = "parking-app-v1"
const urlsToCache = [
  "/",
  "/admin",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/offline.html",
]

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...")
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache")
      return cache.addAll(urlsToCache)
    }),
  )
  // Force the waiting service worker to become the active service worker
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
  // Claim control of all clients
  self.clients.claim()
})

// Fetch event
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      if (response) {
        return response
      }

      return fetch(event.request).catch(() => {
        // If both cache and network fail, show offline page for navigation requests
        if (event.request.mode === "navigate") {
          return caches.match("/offline.html")
        }
      })
    }),
  )
})

// Push event for notifications
self.addEventListener("push", (event) => {
  console.log("Push event received:", event)

  let notificationData = {
    title: "Sistema de Estacionamiento",
    body: "Nueva notificación",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
  }

  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        ...notificationData,
        ...data,
      }
    } catch (e) {
      console.error("Error parsing notification data:", e)
      notificationData.body = event.data.text() || "Nueva notificación"
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [100, 50, 100],
    data: notificationData.data || {},
    actions: notificationData.actions || [],
    tag: notificationData.tag || "parking-notification",
    requireInteraction: notificationData.requireInteraction || false,
    silent: false,
    timestamp: Date.now(),
  }

  event.waitUntil(self.registration.showNotification(notificationData.title, options))
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event)

  event.notification.close()

  const urlToOpen =
    event.notification.data?.url || event.notification.data?.ticketCode
      ? `/ticket/${event.notification.data.ticketCode}`
      : "/"

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && "focus" in client) {
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

// Handle notification action clicks
self.addEventListener("notificationclick", (event) => {
  if (event.action === "view" || event.action === "retry") {
    const ticketCode = event.notification.data?.ticketCode
    const url = ticketCode ? `/ticket/${ticketCode}` : "/"

    event.waitUntil(clients.openWindow(url))
  } else if (event.action === "validate" || event.action === "process") {
    event.waitUntil(clients.openWindow("/admin/dashboard"))
  }

  event.notification.close()
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
    console.log("Syncing payments...")
    // Implementation would depend on your offline storage strategy
  } catch (error) {
    console.error("Error syncing payments:", error)
  }
}

// Handle messages from the main thread
self.addEventListener("message", (event) => {
  console.log("Service Worker received message:", event.data)

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
