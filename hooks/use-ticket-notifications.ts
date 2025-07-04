"use client"

import { useState, useEffect, useCallback } from "react"
import { usePushNotifications } from "./use-push-notifications"

interface TicketNotificationState {
  isRegistered: boolean
  isLoading: boolean
  error: string | null
}

export function useTicketNotifications(ticketCode: string) {
  const { isSupported, isSubscribed, subscription, subscribe } = usePushNotifications()
  const [state, setState] = useState<TicketNotificationState>({
    isRegistered: false,
    isLoading: false,
    error: null,
  })

  // Registrar automáticamente la suscripción para este ticket
  const registerForTicket = useCallback(async () => {
    if (!ticketCode || !subscription) return false

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
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

      if (!response.ok) {
        throw new Error("Error registrando notificaciones para el ticket")
      }

      setState((prev) => ({
        ...prev,
        isRegistered: true,
        isLoading: false,
        error: null,
      }))

      return true
    } catch (error) {
      console.error("Error registering ticket notifications:", error)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      }))
      return false
    }
  }, [ticketCode, subscription])

  // Activar notificaciones con prompt amigable
  const enableNotificationsForTicket = useCallback(async () => {
    try {
      // Primero suscribirse a push notifications
      const subscribed = await subscribe("user")

      if (subscribed) {
        // Luego registrar para este ticket específico
        return await registerForTicket()
      }

      return false
    } catch (error) {
      console.error("Error enabling notifications:", error)
      return false
    }
  }, [subscribe, registerForTicket])

  // Auto-registrar si ya está suscrito
  useEffect(() => {
    if (isSubscribed && subscription && ticketCode && !state.isRegistered) {
      registerForTicket()
    }
  }, [isSubscribed, subscription, ticketCode, state.isRegistered, registerForTicket])

  return {
    ...state,
    isSupported,
    isSubscribed,
    enableNotificationsForTicket,
    registerForTicket,
  }
}
