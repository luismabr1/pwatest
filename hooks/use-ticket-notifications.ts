"use client"

import { useState, useEffect } from "react"

export function useTicketNotifications(ticketCode: string) {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check if push notifications are supported
    const supported = "serviceWorker" in navigator && "PushManager" in window
    setIsSupported(supported)

    if (supported) {
      checkSubscriptionStatus()
    }
  }, [ticketCode])

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)

      // Check if this ticket is registered for notifications
      if (subscription) {
        // You could check with your backend if this subscription is registered for this ticket
        // For now, we'll assume it's registered if there's a subscription
        setIsRegistered(true)
      }
    } catch (error) {
      console.error("Error checking subscription status:", error)
    }
  }

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!("Notification" in window)) {
      throw new Error("This browser does not support notifications")
    }

    let permission = Notification.permission

    if (permission === "default") {
      permission = await Notification.requestPermission()
    }

    return permission
  }

  const enableNotificationsForTicket = async (): Promise<boolean> => {
    setIsLoading(true)
    try {
      // Request permission
      const permission = await requestPermission()
      if (permission !== "granted") {
        return false
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      // Register subscription for this specific ticket
      const response = await fetch("/api/ticket-subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketCode,
          subscription: subscription.toJSON(),
        }),
      })

      if (response.ok) {
        setIsSubscribed(true)
        setIsRegistered(true)
        return true
      } else {
        console.error("Failed to register subscription")
        return false
      }
    } catch (error) {
      console.error("Error enabling notifications:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isSupported,
    isSubscribed,
    isRegistered,
    isLoading,
    requestPermission,
    enableNotificationsForTicket,
  }
}
