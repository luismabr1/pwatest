import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { pushNotificationService } from "@/lib/push-notifications"

export async function POST(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    const { type, ticketCode, userType = "user", data = {} } = await request.json()

    if (!type || !ticketCode) {
      return NextResponse.json({ message: "Tipo y código de ticket requeridos" }, { status: 400 })
    }

    // Get active subscriptions for the user type
    const subscriptions = await db
      .collection("push_subscriptions")
      .find({
        active: true,
        userType: userType,
      })
      .toArray()

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay suscripciones activas",
        sent: 0,
      })
    }

    let notification

    // Create notification based on type
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

    // Send notifications
    const pushSubscriptions = subscriptions.map((sub) => sub.subscription)
    const sentCount = await pushNotificationService.sendToMultipleSubscriptions(pushSubscriptions, notification)

    if (process.env.NODE_ENV === "development") {
      console.log(`📱 Notificaciones enviadas: ${sentCount}/${subscriptions.length}`)
    }

    return NextResponse.json({
      success: true,
      message: `Notificaciones enviadas: ${sentCount}/${subscriptions.length}`,
      sent: sentCount,
      total: subscriptions.length,
    })
  } catch (error) {
    console.error("Error sending notifications:", error)
    return NextResponse.json({ message: "Error enviando notificaciones" }, { status: 500 })
  }
}
