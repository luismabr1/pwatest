interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: any
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  tag?: string
  requireInteraction?: boolean
  url?: string
}

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export class PushNotificationService {
  private static instance: PushNotificationService
  private vapidKeys = {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService()
    }
    return PushNotificationService.instance
  }

  async sendNotification(subscription: PushSubscription, payload: NotificationPayload): Promise<boolean> {
    try {
      const webpush = await import("web-push")

      webpush.default.setVapidDetails(
        "mailto:admin@parkingapp.com",
        this.vapidKeys.publicKey,
        this.vapidKeys.privateKey,
      )

      const notificationPayload = JSON.stringify(payload)

      await webpush.default.sendNotification(subscription, notificationPayload)

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Notificación enviada exitosamente:", payload.title)
      }

      return true
    } catch (error) {
      console.error("❌ Error enviando notificación:", error)
      return false
    }
  }

  async sendToMultipleSubscriptions(subscriptions: PushSubscription[], payload: NotificationPayload): Promise<number> {
    let successCount = 0

    const promises = subscriptions.map(async (subscription) => {
      const success = await this.sendNotification(subscription, payload)
      if (success) successCount++
      return success
    })

    await Promise.all(promises)

    if (process.env.NODE_ENV === "development") {
      console.log(`📊 Notificaciones enviadas: ${successCount}/${subscriptions.length}`)
    }

    return successCount
  }

  // Notification templates
  createPaymentValidatedNotification(ticketCode: string, amount: number): NotificationPayload {
    return {
      title: "✅ Pago Validado",
      body: `Tu pago para el ticket ${ticketCode} ha sido validado. Monto: ${amount.toFixed(2)} Bs`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `payment-validated-${ticketCode}`,
      data: { ticketCode, type: "payment_validated" },
      url: `/ticket/${ticketCode}`,
      actions: [
        {
          action: "view",
          title: "Ver Ticket",
        },
      ],
    }
  }

  createPaymentRejectedNotification(ticketCode: string, reason: string): NotificationPayload {
    return {
      title: "❌ Pago Rechazado",
      body: `Tu pago para el ticket ${ticketCode} fue rechazado. Razón: ${reason}`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `payment-rejected-${ticketCode}`,
      data: { ticketCode, type: "payment_rejected" },
      url: `/ticket/${ticketCode}`,
      requireInteraction: true,
      actions: [
        {
          action: "retry",
          title: "Reintentar Pago",
        },
      ],
    }
  }

  createVehicleParkedNotification(ticketCode: string, plate: string): NotificationPayload {
    return {
      title: "🚗 Vehículo Estacionado",
      body: `Tu vehículo ${plate} ha sido confirmado en el espacio ${ticketCode}`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `vehicle-parked-${ticketCode}`,
      data: { ticketCode, plate, type: "vehicle_parked" },
      url: `/ticket/${ticketCode}`,
    }
  }

  createVehicleExitNotification(ticketCode: string, plate: string): NotificationPayload {
    return {
      title: "🚪 Vehículo Saliendo",
      body: `Tu vehículo ${plate} está siendo procesado para la salida`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `vehicle-exit-${ticketCode}`,
      data: { ticketCode, plate, type: "vehicle_exit" },
      url: `/ticket/${ticketCode}`,
    }
  }

  // Admin notifications
  createAdminPaymentNotification(ticketCode: string, amount: number, plate: string): NotificationPayload {
    return {
      title: "💰 Nuevo Pago Recibido",
      body: `Pago de ${amount.toFixed(2)} Bs para vehículo ${plate} (${ticketCode})`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `admin-payment-${ticketCode}`,
      data: { ticketCode, amount, plate, type: "admin_payment" },
      url: "/admin/dashboard",
      requireInteraction: true,
      actions: [
        {
          action: "validate",
          title: "Validar",
        },
        {
          action: "view",
          title: "Ver Detalles",
        },
      ],
    }
  }

  createAdminExitRequestNotification(ticketCode: string, plate: string): NotificationPayload {
    return {
      title: "🚪 Solicitud de Salida",
      body: `El vehículo ${plate} está listo para salir (${ticketCode})`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `admin-exit-${ticketCode}`,
      data: { ticketCode, plate, type: "admin_exit_request" },
      url: "/admin/dashboard",
      actions: [
        {
          action: "process",
          title: "Procesar Salida",
        },
      ],
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance()
