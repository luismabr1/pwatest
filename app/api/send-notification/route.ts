import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { pushNotificationService } from "@/lib/push-notifications"

export async function POST(request: Request) {
  try {
    console.log("🔔 [SEND-NOTIFICATION] ===== INICIANDO ENVÍO DE NOTIFICACIÓN =====")
    console.log("🕐 [SEND-NOTIFICATION] Timestamp:", new Date().toISOString())

    const client = await clientPromise
    const db = client.db("parking")

    const body = await request.json()
    console.log("📦 [SEND-NOTIFICATION] Payload recibido:", JSON.stringify(body, null, 2))

    const { type, ticketCode, userType, data } = body

    if (!type) {
      console.error("❌ [SEND-NOTIFICATION] Tipo de notificación faltante")
      return NextResponse.json({ error: "Tipo de notificación requerido" }, { status: 400 })
    }

    console.log("🔍 [SEND-NOTIFICATION] Parámetros:")
    console.log("   Tipo:", type)
    console.log("   Ticket Code:", ticketCode)
    console.log("   User Type:", userType)
    console.log("   Data:", data)

    let subscriptions = []
    let query: any = {}

    // Construir query para buscar suscripciones
    if (type === "test") {
      // Para tests, usar siempre TEST-001 independientemente del userType
      query = {
        ticketCode: "TEST-001",
        isActive: true,
      }
      console.log("🧪 [SEND-NOTIFICATION] Modo TEST - Buscando suscripciones para TEST-001")
    } else if (userType === "admin") {
      // Para admins, buscar SOLO suscripciones reales de admin (no virtuales)
      query = {
        userType: "admin",
        isActive: true,
        $or: [
          { isVirtual: { $exists: false } }, // Suscripciones reales (sin campo isVirtual)
          { isVirtual: false }, // Suscripciones explícitamente marcadas como no virtuales
        ],
      }
      console.log("👨‍💼 [SEND-NOTIFICATION] Buscando suscripciones REALES de ADMIN")
    } else if (userType === "user" && ticketCode) {
      // Para usuarios, buscar suscripciones específicas del ticket (reales, no placeholder)
      query = {
        ticketCode: ticketCode,
        userType: "user",
        isActive: true,
        $or: [
          { isPlaceholder: { $exists: false } }, // Suscripciones reales (sin campo isPlaceholder)
          { isPlaceholder: false }, // Suscripciones explícitamente marcadas como no placeholder
        ],
      }
      console.log("👤 [SEND-NOTIFICATION] Buscando suscripciones REALES de USER para ticket:", ticketCode)
    } else {
      console.error("❌ [SEND-NOTIFICATION] Parámetros insuficientes para determinar suscripciones")
      return NextResponse.json({ error: "Parámetros insuficientes" }, { status: 400 })
    }

    console.log("🔍 [SEND-NOTIFICATION] Query de búsqueda:", JSON.stringify(query, null, 2))

    // Buscar suscripciones
    const subscriptionDocs = await db.collection("ticket_subscriptions").find(query).toArray()

    console.log("📊 [SEND-NOTIFICATION] Resultados de búsqueda:")
    console.log("   Total encontradas:", subscriptionDocs.length)

    // Debug detallado de las suscripciones encontradas
    subscriptionDocs.forEach((doc, index) => {
      console.log(`🔍 [SEND-NOTIFICATION] Suscripción ${index + 1}:`)
      console.log(`   Ticket: ${doc.ticketCode}`)
      console.log(`   UserType: ${doc.userType}`)
      console.log(`   Active: ${doc.isActive}`)
      console.log(`   Virtual: ${doc.isVirtual}`)
      console.log(`   Placeholder: ${doc.isPlaceholder}`)
      console.log(`   Endpoint: ${doc.subscription?.endpoint?.substring(0, 50)}...`)
      console.log(
        `   Keys valid: ${!!(
          doc.subscription?.keys?.p256dh &&
            doc.subscription?.keys?.auth &&
            doc.subscription.keys.p256dh !== "admin-virtual-key" &&
            doc.subscription.keys.p256dh !== "user-placeholder-key"
        )}`,
      )
    })

    if (subscriptionDocs.length === 0) {
      console.log("⚠️ [SEND-NOTIFICATION] No se encontraron suscripciones activas")
      console.log("🔍 [SEND-NOTIFICATION] Verificando todas las suscripciones en la base de datos...")

      // Debug: mostrar todas las suscripciones para el ticket específico
      if (ticketCode) {
        const ticketSubs = await db.collection("ticket_subscriptions").find({ ticketCode }).toArray()
        console.log(`📋 [SEND-NOTIFICATION] Suscripciones para ticket ${ticketCode}:`)
        ticketSubs.forEach((sub, index) => {
          console.log(
            `   ${index + 1}. UserType: ${sub.userType}, Active: ${sub.isActive}, Virtual: ${sub.isVirtual}, Placeholder: ${sub.isPlaceholder}`,
          )
        })
      }

      // Debug: mostrar todas las suscripciones de admin
      if (userType === "admin") {
        const adminSubs = await db.collection("ticket_subscriptions").find({ userType: "admin" }).toArray()
        console.log("📋 [SEND-NOTIFICATION] Todas las suscripciones de ADMIN:")
        adminSubs.forEach((sub, index) => {
          console.log(
            `   ${index + 1}. Ticket: ${sub.ticketCode}, Active: ${sub.isActive}, Virtual: ${sub.isVirtual}, Real: ${!sub.isVirtual}`,
          )
        })
      }

      return NextResponse.json({
        success: true,
        message: "No hay suscripciones activas",
        sent: 0,
        total: 0,
        query: query,
        debug: {
          subscriptionsFound: subscriptionDocs.length,
        },
      })
    }

    // Extraer suscripciones push - SOLO suscripciones con keys reales
    subscriptions = subscriptionDocs
      .map((doc) => doc.subscription)
      .filter((sub) => {
        if (!sub || !sub.endpoint || !sub.keys) {
          console.log("❌ [SEND-NOTIFICATION] Suscripción sin endpoint o keys")
          return false
        }

        // Verificar que las keys no sean hardcodeadas
        const hasRealKeys =
          sub.keys.p256dh &&
          sub.keys.auth &&
          sub.keys.p256dh !== "admin-virtual-key" &&
          sub.keys.p256dh !== "user-placeholder-key" &&
          sub.keys.auth !== "admin-virtual-auth" &&
          sub.keys.auth !== "user-placeholder-auth"

        if (!hasRealKeys) {
          console.log("❌ [SEND-NOTIFICATION] Suscripción con keys hardcodeadas, omitiendo")
          return false
        }

        console.log("✅ [SEND-NOTIFICATION] Suscripción válida con keys reales")
        return true
      })

    console.log("✅ [SEND-NOTIFICATION] Suscripciones válidas encontradas:", subscriptions.length)

    if (subscriptions.length === 0) {
      console.log("❌ [SEND-NOTIFICATION] No hay suscripciones válidas para enviar")
      return NextResponse.json({
        success: true,
        message: "No hay suscripciones válidas con keys reales",
        sent: 0,
        total: subscriptionDocs.length,
        reason: "Todas las suscripciones encontradas tienen keys hardcodeadas o son virtuales/placeholder",
      })
    }

    // Crear payload de notificación según el tipo
    let notificationPayload

    console.log("🎨 [SEND-NOTIFICATION] Creando payload de notificación para tipo:", type)

    switch (type) {
      case "test":
        notificationPayload = {
          title: "🧪 Notificación de Prueba",
          body: `Esta es una notificación de prueba enviada a las ${new Date().toLocaleTimeString("es-ES")}`,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          tag: `test-${Date.now()}`,
          data: { type: "test", timestamp: new Date().toISOString(), ...data },
          requireInteraction: true,
          actions: [
            {
              action: "close",
              title: "Cerrar",
            },
          ],
        }
        break

      case "vehicle_registered":
        notificationPayload = pushNotificationService.createVehicleRegisteredNotification(
          ticketCode,
          data.plate || "N/A",
        )
        break

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

      case "vehicle_delivered":
        notificationPayload = pushNotificationService.createVehicleDeliveredNotification(
          ticketCode,
          data.plate || "N/A",
          data.duration || 0,
          data.amount || 0,
        )
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
        return NextResponse.json({ error: "Tipo de notificación no válido" }, { status: 400 })
    }

    console.log("📝 [SEND-NOTIFICATION] Payload creado:")
    console.log("   Título:", notificationPayload.title)
    console.log("   Cuerpo:", notificationPayload.body)
    console.log("   Tag:", notificationPayload.tag)

    // Enviar notificaciones
    console.log("📤 [SEND-NOTIFICATION] Enviando notificaciones...")
    const sentCount = await pushNotificationService.sendToMultipleSubscriptions(subscriptions, notificationPayload)

    console.log("📊 [SEND-NOTIFICATION] Resumen final:")
    console.log("   Suscripciones encontradas:", subscriptionDocs.length)
    console.log("   Suscripciones válidas:", subscriptions.length)
    console.log("   Notificaciones enviadas:", sentCount)
    console.log(
      "   Tasa de éxito:",
      subscriptions.length > 0 ? ((sentCount / subscriptions.length) * 100).toFixed(1) + "%" : "0%",
    )

    // Actualizar lastUsed para las suscripciones utilizadas
    if (sentCount > 0) {
      const subscriptionIds = subscriptionDocs.map((doc) => doc._id)
      await db.collection("ticket_subscriptions").updateMany(
        { _id: { $in: subscriptionIds } },
        {
          $set: {
            lastUsed: new Date(),
            "lifecycle.updatedAt": new Date(),
          },
        },
      )
      console.log("✅ [SEND-NOTIFICATION] Timestamps de suscripciones actualizados")
    }

    console.log("✅ [SEND-NOTIFICATION] ===== ENVÍO COMPLETADO =====")

    return NextResponse.json({
      success: true,
      message: `Notificaciones enviadas: ${sentCount}/${subscriptions.length}`,
      sent: sentCount,
      total: subscriptions.length,
      type: type,
      ticketCode: ticketCode,
      userType: userType,
    })
  } catch (error) {
    console.error("❌ [SEND-NOTIFICATION] ===== ERROR CRÍTICO =====")
    console.error("   Error:", error.message)
    console.error("   Stack:", error.stack)

    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
