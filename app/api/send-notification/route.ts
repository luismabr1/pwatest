import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { pushNotificationService } from "@/lib/push-notifications"

export async function POST(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    const { type, ticketCode, userType = "user", data = {} } = await request.json()

    if (process.env.NODE_ENV === "development") {
      console.log("🔔 [SEND-NOTIFICATION] Recibida solicitud POST")
      console.log("📦 [SEND-NOTIFICATION] Request body:", { type, ticketCode, userType, hasData: !!data })
    }

    if (!type) {
      console.error("❌ [SEND-NOTIFICATION] Tipo de notificación faltante")
      return NextResponse.json({ message: "Tipo de notificación requerido" }, { status: 400 })
    }

    // Para notificaciones de prueba, no necesitamos ticketCode
    if (type === "test") {
      if (process.env.NODE_ENV === "development") {
        console.log("🧪 [SEND-NOTIFICATION] Procesando notificación de prueba para:", userType)
      }

      // Get all active subscriptions for the user type (for test notifications)
      const subscriptions = await db.collection("ticket_subscriptions").find({ userType, isActive: true }).toArray()

      if (process.env.NODE_ENV === "development") {
        console.log("🔍 [SEND-NOTIFICATION] Suscripciones de prueba encontradas:", subscriptions.length)
      }

      if (subscriptions.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No hay suscripciones activas para prueba",
          sent: 0,
        })
      }

      // Create test notification manually
      const notification = {
        title: userType === "admin" ? "🧪 Notificación de Prueba - Admin" : "🧪 Notificación de Prueba - Usuario",
        body:
          userType === "admin"
            ? "Esta es una notificación de prueba para administradores. El sistema funciona correctamente."
            : "Esta es una notificación de prueba para usuarios. El sistema funciona correctamente.",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: `test-${userType}`,
        data: { type: "test", userType, timestamp: new Date().toISOString() },
        url: userType === "admin" ? "/admin/dashboard" : "/",
      }

      const pushSubscriptions = subscriptions.map((sub) => sub.subscription)
      const sentCount = await pushNotificationService.sendToMultipleSubscriptions(pushSubscriptions, notification)

      return NextResponse.json({
        success: true,
        message: `Notificaciones de prueba enviadas: ${sentCount}/${subscriptions.length}`,
        sent: sentCount,
        total: subscriptions.length,
      })
    }

    // Para otras notificaciones, ticketCode es requerido
    if (!ticketCode) {
      console.error("❌ [SEND-NOTIFICATION] Código de ticket faltante")
      return NextResponse.json({ message: "Código de ticket requerido" }, { status: 400 })
    }

    // Get active subscriptions for the ticket and user type
    const subscriptions = await db
      .collection("ticket_subscriptions")
      .find({ ticketCode, userType, isActive: true })
      .toArray()

    if (process.env.NODE_ENV === "development") {
      console.log("🔍 [SEND-NOTIFICATION] Suscripciones obtenidas de BD:", subscriptions.length)
      subscriptions.forEach((sub, index) =>
        console.log(`📋 [SEND-NOTIFICATION] Sub ${index + 1}:`, {
          endpoint: sub.subscription.endpoint.substring(0, 50) + "...",
          userType: sub.userType,
          ticketCode: sub.ticketCode,
        }),
      )
    }

    if (subscriptions.length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.log("⚠️ [SEND-NOTIFICATION] No hay suscripciones para enviar")
      }
      return NextResponse.json({
        success: true,
        message: "No hay suscripciones activas",
        sent: 0,
      })
    }

    let notification

    // Create notification based on type using PushNotificationService methods
    switch (type) {
      case "payment_validated":
        notification = pushNotificationService.createPaymentValidatedNotification(ticketCode, data.amount || 0)
        break
      case "payment_rejected":
        notification = pushNotificationService.createPaymentRejectedNotification(
          ticketCode,
          data.reason || "Pago rechazado",
        )
        break
      case "vehicle_parked":
        notification = pushNotificationService.createVehicleParkedNotification(ticketCode, data.plate || "N/A")
        break
      case "vehicle_exit":
        notification = pushNotificationService.createVehicleExitNotification(ticketCode, data.plate || "N/A")
        break
      case "admin_payment":
        notification = pushNotificationService.createAdminPaymentNotification(
          ticketCode,
          data.amount || 0,
          data.plate || "N/A",
        )
        break
      case "admin_exit_request":
        notification = pushNotificationService.createAdminExitRequestNotification(ticketCode, data.plate || "N/A")
        break
      default:
        return NextResponse.json({ message: "Tipo de notificación no válido" }, { status: 400 })
    }

    if (process.env.NODE_ENV === "development") {
      console.log("📝 [SEND-NOTIFICATION] Notificación creada:", {
        title: notification.title,
        body: notification.body,
        subscriptionsToSend: subscriptions.length,
      })
    }

    // Send notifications using the service's batch method
    const pushSubscriptions = subscriptions.map((sub) => sub.subscription)
    const sentCount = await pushNotificationService.sendToMultipleSubscriptions(pushSubscriptions, notification)

    if (process.env.NODE_ENV === "development") {
      console.log(`📊 [SEND-NOTIFICATION] Resultado: ${sentCount}/${subscriptions.length} enviadas exitosamente`)
    }

    return NextResponse.json({
      success: true,
      message: `Notificaciones enviadas: ${sentCount}/${subscriptions.length}`,
      sent: sentCount,
      total: subscriptions.length,
    })
  } catch (error) {
    console.error("❌ [SEND-NOTIFICATION] Error enviando notificaciones:", error)
    return NextResponse.json({ message: "Error enviando notificaciones", error: error.message }, { status: 500 })
  }
}
