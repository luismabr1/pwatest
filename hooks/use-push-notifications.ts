"use client"

import { useState, useEffect, useCallback } from "react"

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true)
      initializeServiceWorker()
    }
  }, [])

  const initializeServiceWorker = useCallback(async () => {
    try {
      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration()

      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        })
        console.log("Service Worker registered:", registration)
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready

      // Check existing subscription
      await checkSubscription()
    } catch (err) {
      console.error("Error initializing service worker:", err)
      setError("Error inicializando service worker")
    }
  }, [])

  const checkSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const existingSubscription = await registration.pushManager.getSubscription()

      if (existingSubscription) {
        const subscriptionData = {
          endpoint: existingSubscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(existingSubscription.getKey("p256dh")!),
            auth: arrayBufferToBase64(existingSubscription.getKey("auth")!),
          },
        }
        setSubscription(subscriptionData)
        setIsSubscribed(true)
      }
    } catch (err) {
      console.error("Error checking subscription:", err)
      setError("Error verificando suscripción")
    }
  }, [])

  const subscribe = useCallback(
    async (userType: "user" | "admin" = "user") => {
      if (!isSupported) {
        setError("Las notificaciones push no están soportadas")
        return false
      }

      setIsLoading(true)
      setError(null)

      try {
        // Request notification permission
        const permission = await Notification.requestPermission()

        if (permission !== "granted") {
          throw new Error("Permisos de notificación denegados")
        }

        // Ensure service worker is ready
        const registration = await navigator.serviceWorker.ready

        // Check if VAPID key is available
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) {
          throw new Error("VAPID key no configurada")
        }

        // Subscribe to push notifications
        const pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })

        const subscriptionData = {
          endpoint: pushSubscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(pushSubscription.getKey("p256dh")!),
            auth: arrayBufferToBase64(pushSubscription.getKey("auth")!),
          },
        }

        // Save subscription to server
        const response = await fetch("/api/push-subscriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscription: subscriptionData,
            userType,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || "Error guardando suscripción")
        }

        setSubscription(subscriptionData)
        setIsSubscribed(true)

        // Show success message
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("¡Notificaciones Activadas!", {
            body: "Ahora recibirás notificaciones sobre tu estacionamiento",
            icon: "/icons/icon-192x192.png",
          })
        }

        return true
      } catch (err) {
        console.error("Error subscribing to push notifications:", err)
        const errorMessage = err instanceof Error ? err.message : "Error desconocido"
        setError(errorMessage)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [isSupported],
  )

  const unsubscribe = useCallback(async () => {
    if (!subscription) return false

    setIsLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const pushSubscription = await registration.pushManager.getSubscription()

      if (pushSubscription) {
        await pushSubscription.unsubscribe()
      }

      // Remove subscription from server
      const response = await fetch("/api/push-subscriptions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription }),
      })

      if (!response.ok) {
        console.warn("Error removing subscription from server")
      }

      setSubscription(null)
      setIsSubscribed(false)

      return true
    } catch (err) {
      console.error("Error unsubscribing from push notifications:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      return false
    } finally {
      setIsLoading(false)
    }
  }, [subscription])

  return {
    isSupported,
    subscription,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    checkSubscription,
  }
}

// Utility functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}
