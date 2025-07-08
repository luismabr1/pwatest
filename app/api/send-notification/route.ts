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
    let query = {}

    // Construir query para buscar suscripciones
    if (type === "test") {
      // Para tests, usar siempre TEST-001 independientemente del userType
      query = {
        ticketCode: "TEST-001",
        isActive: true,
      }
      console.log("🧪 [SEND-NOTIFICATION] Modo TEST - Buscando suscripciones para TEST-001")
    } else if (userType === "admin") {
      // Para admins, buscar suscripciones admin (pueden ser de cualquier ticket)
      query = {
        userType: "admin",
        isActive: true,
      }
      if (ticketCode) {
        query.ticketCode = ticketCode
      }
      console.log("👨‍💼 [SEND-NOTIFICATION] Buscando suscripciones de ADMIN")
    } else if (userType === "user" && ticketCode) {
      // Para usuarios, buscar suscripciones específicas del ticket
      query = {
        ticketCode: ticketCode,
        userType: "user",
        isActive: true,
      }
      console.log("👤 [SEND-NOTIFICATION] Buscando suscripciones de USER para ticket:", ticketCode)
    } else {
      console.error("❌ [SEND-NOTIFICATION] Parámetros insuficientes para determinar suscripciones")
      return NextResponse.json({ error: "Parámetros insuficientes" }, { status: 400 })
    }

    console.log("🔍 [SEND-NOTIFICATION] Query de búsqueda:", JSON.stringify(query, null, 2))

    // Buscar suscripciones
    const subscriptionDocs = await db.collection("ticket_subscriptions").find(query).toArray()

    console.log("📊 [SEND-NOTIFICATION] Resultados de búsqueda:")
    console.log("   Total encontradas:", subscriptionDocs.length)

    if (subscriptionDocs.length === 0) {
      console.log("⚠️ [SEND-NOTIFICATION] No se encontraron suscripciones activas")
      console.log("🔍 [SEND-NOTIFICATION] Verificando todas las suscripciones en la base de datos...")

      // Debug: mostrar todas las suscripciones
      const allSubs = await db.collection("ticket_subscriptions").find({}).toArray()
      console.log("📋 [SEND-NOTIFICATION] Todas las suscripciones en BD:")
      allSubs.forEach((sub, index) => {
        console.log(`   ${index + 1}. Ticket: ${sub.ticketCode}, UserType: ${sub.userType}, Active: ${sub.isActive}`)
      })

      return NextResponse.json({
        message: "No hay suscripciones activas",
        sent: 0,
        total: 0,
        query: query,
        debug: {
          totalSubscriptionsInDB: allSubs.length,
          subscriptionsFound: subscriptionDocs.length,
        },
      })
    }

    // Extraer suscripciones push - filtrar virtuales/placeholder para notificaciones reales
    if (type === "test") {
      // Para tests, incluir todas las suscripciones
      subscriptions = subscriptionDocs.map((doc) => doc.subscription).filter((sub) => sub && sub.endpoint && sub.keys)
    } else {
      // Para notificaciones reales, incluir suscripciones virtuales activas pero excluir placeholder
      subscriptions = subscriptionDocs
        .filter((doc) => {
          // Incluir suscripciones reales
          if (!doc.isVirtual && !doc.isPlaceholder) {
            return true
          }
          // Incluir suscripciones virtuales activas (para admin)
          if (doc.isVirtual && doc.isActive) {
            console.log(`✅ [SEND-NOTIFICATION] Incluyendo suscripción virtual activa para ${doc.userType}`)
            return true
          }
          // Excluir placeholder
          if (doc.isPlaceholder) {
            console.log(`❌ [SEND-NOTIFICATION] Excluyendo suscripción placeholder para ${doc.userType}`)
            return false
          }
          return false
        })
        .map((doc) => doc.subscription)
        .filter((sub) => sub && sub.endpoint && sub.keys)
    }

    console.log("✅ [SEND-NOTIFICATION] Suscripciones válidas encontradas:", subscriptions.length)

    subscriptionDocs.forEach((doc, index) => {
      console.log(`   ${index + 1}. Ticket: ${doc.ticketCode}, UserType: ${doc.userType}`)
      console.log(`      Endpoint: ${doc.subscription?.endpoint?.substring(0, 50)}...`)
      if (doc.isVirtual) console.log(`      [VIRTUAL]`)
      if (doc.isPlaceholder) console.log(`      [PLACEHOLDER]`)
    })

    if (subscriptions.length === 0 && type !== "test") {
      console.log("❌ [SEND-NOTIFICATION] No hay suscripciones reales para enviar")
      return NextResponse.json({
        message: "No hay suscripciones reales válidas",
        sent: 0,
        total: subscriptionDocs.length,
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
        message: error.message,
      },
      { status: 500 },
    )
  }
}
