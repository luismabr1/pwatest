import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { pushNotificationService } from "@/lib/push-notifications"

export async function POST(request: Request) {
  try {
    console.log("🔔 [SEND-NOTIFICATION] ===== INICIANDO ENVÍO DE NOTIFICACIÓN =====")
    console.log("🕐 [SEND-NOTIFICATION] Timestamp:", new Date().toISOString())

    const client = await clientPromise
    const db = client.db("parking")

    const { type, ticketCode, userType, data } = await request.json()

    console.log("📦 [SEND-NOTIFICATION] Datos recibidos:")
    console.log("   Tipo:", type)
    console.log("   Ticket Code:", ticketCode)
    console.log("   User Type:", userType)
    console.log("   Data:", data)

    if (!type || !ticketCode || !userType) {
      console.error("❌ [SEND-NOTIFICATION] ERROR: Datos incompletos")
      console.error("   Type:", !!type)
      console.error("   TicketCode:", !!ticketCode)
      console.error("   UserType:", !!userType)
      return NextResponse.json({ message: "Datos incompletos" }, { status: 400 })
    }

    // Build search criteria
    const searchCriteria: any = {
      isActive: true,
      userType: userType,
    }

    // For specific ticket notifications, look for that ticket
    if (ticketCode !== "ALL") {
      searchCriteria.ticketCode = ticketCode
    }

    console.log("🔍 [SEND-NOTIFICATION] Criterios de búsqueda:")
    console.log("   IsActive:", searchCriteria.isActive)
    console.log("   UserType:", searchCriteria.userType)
    console.log("   TicketCode:", searchCriteria.ticketCode || "ALL")

    // Find active subscriptions
    const subscriptions = await db.collection("ticket_subscriptions").find(searchCriteria).toArray()

    console.log("📊 [SEND-NOTIFICATION] Suscripciones encontradas:")
    console.log("   Total:", subscriptions.length)

    if (subscriptions.length === 0) {
      console.log("⚠️ [SEND-NOTIFICATION] No hay suscripciones activas para:")
      console.log("   UserType:", userType)
      console.log("   TicketCode:", ticketCode)

      // Let's check what subscriptions exist in the database
      const allSubscriptions = await db.collection("ticket_subscriptions").find({}).toArray()
      console.log("🔍 [SEND-NOTIFICATION] Todas las suscripciones en BD:")
      console.log("   Total en BD:", allSubscriptions.length)

      allSubscriptions.forEach((sub, index) => {
        console.log(
          `   ${index + 1}. UserType: ${sub.userType}, TicketCode: ${sub.ticketCode}, IsActive: ${sub.isActive}`,
        )
      })

      return NextResponse.json({
        message: "No hay suscripciones activas",
        sent: 0,
        total: 0,
        debug: {
          searchCriteria,
          totalInDB: allSubscriptions.length,
          activeInDB: allSubscriptions.filter((s) => s.isActive).length,
        },
      })
    }

    console.log("📋 [SEND-NOTIFICATION] Detalles de suscripciones encontradas:")
    subscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. UserType: ${sub.userType}, TicketCode: ${sub.ticketCode}`)
      console.log(`      Endpoint: ${sub.subscription.endpoint.substring(0, 50)}...`)
      console.log(`      Created: ${sub.createdAt}`)
      console.log(`      Stage: ${sub.lifecycle?.stage || "N/A"}`)
    })

    // Create notification payload based on type
    let notificationPayload

    console.log("🏭 [SEND-NOTIFICATION] Creando payload de notificación para tipo:", type)

    switch (type) {
      case "payment_validated":
        notificationPayload = pushNotificationService.createPaymentValidatedNotification(ticketCode, data.amount || 0)
        break
      case "payment_rejected":
        notificationPayload = pushNotificationService.createPaymentRejectedNotification(
          ticketCode,
          data.reason || "Motivo no especificado",
        )
        break
      case "vehicle_parked":
        notificationPayload = pushNotificationService.createVehicleParkedNotification(ticketCode, data.plate || "N/A")
        break
      case "vehicle_exit":
        notificationPayload = pushNotificationService.createVehicleExitNotification(ticketCode, data.plate || "N/A")
        break
      case "admin_payment":
        notificationPayload = pushNotificationService.createAdminPaymentNotification(
          ticketCode,
          data.amount || 0,
          data.plate || "N/A",
        )
        break
      case "admin_exit_request":
        notificationPayload = pushNotificationService.createAdminExitRequestNotification(
          ticketCode,
          data.plate || "N/A",
        )
        break
      default:
        console.error("❌ [SEND-NOTIFICATION] Tipo de notificación no reconocido:", type)
        return NextResponse.json({ message: "Tipo de notificación no válido" }, { status: 400 })
    }

    console.log("✅ [SEND-NOTIFICATION] Payload creado:")
    console.log("   Título:", notificationPayload.title)
    console.log("   Cuerpo:", notificationPayload.body)
    console.log("   Tag:", notificationPayload.tag)

    // Extract push subscriptions
    const pushSubscriptions = subscriptions.map((sub) => sub.subscription)

    console.log("📤 [SEND-NOTIFICATION] Iniciando envío a", pushSubscriptions.length, "suscripciones...")

    // Send notifications
    const sentCount = await pushNotificationService.sendToMultipleSubscriptions(pushSubscriptions, notificationPayload)

    console.log("📊 [SEND-NOTIFICATION] Resultado del envío:")
    console.log("   Enviadas exitosamente:", sentCount)
    console.log("   Total intentos:", pushSubscriptions.length)
    console.log("   Tasa de éxito:", ((sentCount / pushSubscriptions.length) * 100).toFixed(1) + "%")

    // Update last used timestamp for successful subscriptions
    if (sentCount > 0) {
      console.log("🔄 [SEND-NOTIFICATION] Actualizando timestamp de uso...")
      const updateResult = await db.collection("ticket_subscriptions").updateMany(searchCriteria, {
        $set: {
          lastUsed: new Date(),
          "lifecycle.updatedAt": new Date(),
        },
      })
      console.log("✅ [SEND-NOTIFICATION] Timestamps actualizados:", updateResult.modifiedCount)
    }

    console.log("✅ [SEND-NOTIFICATION] ===== ENVÍO COMPLETADO =====")

    return NextResponse.json({
      message: sentCount > 0 ? "Notificaciones enviadas exitosamente" : "No se pudieron enviar notificaciones",
      sent: sentCount,
      total: pushSubscriptions.length,
      type: type,
      ticketCode: ticketCode,
      userType: userType,
    })
  } catch (error: any) {
    console.error("❌ [SEND-NOTIFICATION] ===== ERROR CRÍTICO =====")
    console.error("   Error:", error.message)
    console.error("   Stack:", error.stack)
    return NextResponse.json(
      {
        message: "Error interno del servidor",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
