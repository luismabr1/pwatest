"use client"

import { useState, useEffect, useCallback } from "react"

interface PushNotificationState {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
  subscription: PushSubscription | null
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: false,
    error: null,
    subscription: null,
  })

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      if (typeof window === "undefined") return

      const isSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window

      if (!isSupported) {
        setState((prev) => ({
          ...prev,
          isSupported: false,
          error: "Las notificaciones push no son compatibles con este navegador",
        }))
        return
      }

      try {
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready

        // Check existing subscription
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          const existingSubscription = await registration.pushManager.getSubscription()

          setState((prev) => ({
            ...prev,
            isSupported: true,
            isSubscribed: !!existingSubscription,
            subscription: existingSubscription,
            error: null,
          }))
        } else {
          setState((prev) => ({
            ...prev,
            isSupported: true,
            error: null,
          }))
        }
      } catch (error) {
        console.error("Error checking support:", error)
        setState((prev) => ({
          ...prev,
          isSupported: true,
          error: "Error al verificar el soporte de notificaciones",
        }))
      }
    }

    checkSupport()
  }, [])

  const subscribe = useCallback(
    async (userType: "user" | "admin" = "user", ticketCode: string = "TEST-001") => {
      if (!state.isSupported) {
        setState((prev) => ({ ...prev, error: "Notificaciones no soportadas" }))
        return false
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        console.log("Requesting notification permission...")

        // Request notification permission
        const permission = await Notification.requestPermission()
        console.log("Permission result:", permission)

        if (permission !== "granted") {
          throw new Error("Permisos de notificación denegados")
        }

        console.log("Getting service worker registration...")

        // Get service worker registration
        const registration = await navigator.serviceWorker.ready
        console.log("Service worker ready:", registration)

        // Check for existing subscription first
        let subscription = await registration.pushManager.getSubscription()
        console.log("Existing subscription:", subscription)

        if (!subscription) {
          console.log("Creating new subscription...")

          // Get VAPID public key
          const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

          if (!vapidPublicKey) {
            throw new Error("Clave VAPID pública no configurada. Verifica tu archivo .env.local")
          }

          console.log("VAPID key available, subscribing...")

          // Create new subscription
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          })

          console.log("New subscription created:", subscription)
        }

        console.log("Sending subscription to server...")

        // Send subscription to server
        const response = await fetch("/api/push-subscriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            userType,
            ticketCode, // Added ticketCode to the request
          }),
        })

        console.log("Server response status:", response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("Server error:", errorText)
          throw new Error(`Error del servidor: ${response.status}`)
        }

        const result = await response.json()
        console.log("Server response:", result)

        setState((prev) => ({
          ...prev,
          isSubscribed: true,
          isLoading: false,
          subscription,
          error: null,
        }))

        // Show success notification
        try {
          await registration.showNotification("¡Notificaciones Activadas!", {
            body: "Ahora recibirás actualizaciones sobre tus pagos y vehículo",
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: "subscription-success",
            requireInteraction: false,
          })
        } catch (notifError) {
          console.warn("Could not show success notification:", notifError)
        }

        return true
      } catch (error) {
        console.error("Error subscribing to push notifications:", error)
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al activar notificaciones"

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }))
        return false
      }
    },
    [state.isSupported],
  )

  const unsubscribe = useCallback(async () => {
    if (!state.subscription) return false

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      console.log("Unsubscribing from push notifications...")

      await state.subscription.unsubscribe()

      // Remove from server
      await fetch("/api/push-subscriptions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: state.subscription.endpoint,
        }),
      })

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        subscription: null,
        error: null,
      }))

      return true
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Error al desactivar notificaciones",
      }))
      return false
    }
  }, [state.subscription])

  return {
    ...state,
    subscribe,
    unsubscribe,
  }
}

// Utility function to convert VAPID key
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