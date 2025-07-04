import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// POST: Registrar suscripción para un ticket específico
export async function POST(request: NextRequest) {
  try {
    const { ticketCode, subscription } = await request.json()

    if (process.env.NODE_ENV === "development") {
      console.log("🔔 [TICKET-SUBSCRIPTION] Registrando suscripción para ticket:", ticketCode)
      console.log("📱 [TICKET-SUBSCRIPTION] Datos de suscripción:", {
        endpoint: subscription?.endpoint?.substring(0, 50) + "...",
        hasKeys: !!subscription?.keys,
        p256dh: subscription?.keys?.p256dh?.substring(0, 20) + "...",
        auth: subscription?.keys?.auth?.substring(0, 20) + "...",
      })
    }

    if (!ticketCode || !subscription) {
      console.error("❌ [TICKET-SUBSCRIPTION] Faltan parámetros:", {
        ticketCode: !!ticketCode,
        subscription: !!subscription,
      })
      return NextResponse.json({ error: "Código de ticket y suscripción son requeridos" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("parking")

    // Verificar que el ticket existe
    const ticket = await db.collection("tickets").findOne({
      codigoTicket: ticketCode,
    })

    if (!ticket) {
      console.error("❌ [TICKET-SUBSCRIPTION] Ticket no encontrado:", ticketCode)
      return NextResponse.json({ error: "Ticket no encontrado o no válido" }, { status: 404 })
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ [TICKET-SUBSCRIPTION] Ticket encontrado:", {
        codigo: ticket.codigoTicket,
        estado: ticket.estado,
      })
    }

    // Registrar o actualizar la suscripción para este ticket
    const result = await db.collection("ticket_subscriptions").updateOne(
      {
        ticketCode: ticketCode,
        "subscription.endpoint": subscription.endpoint,
      },
      {
        $set: {
          ticketCode,
          subscription,
          deviceInfo: {
            userAgent: request.headers.get("user-agent") || "",
            timestamp: new Date(),
            ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
          },
          isActive: true,
          lastUpdated: new Date(),
        },
      },
      { upsert: true },
    )

    if (process.env.NODE_ENV === "development") {
      console.log("✅ [TICKET-SUBSCRIPTION] Suscripción guardada:", {
        ticketCode,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Suscripción registrada para el ticket",
    })
  } catch (error) {
    console.error("❌ [TICKET-SUBSCRIPTION] Error registrando suscripción:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// GET: Obtener suscripciones activas para un ticket
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ticketCode = searchParams.get("ticketCode")

    if (!ticketCode) {
      return NextResponse.json({ error: "Código de ticket requerido" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("parking")

    const subscriptions = await db
      .collection("ticket_subscriptions")
      .find({
        ticketCode,
        isActive: true,
      })
      .toArray()

    if (process.env.NODE_ENV === "development") {
      console.log("🔍 [TICKET-SUBSCRIPTION] Consultando suscripciones para:", ticketCode)
      console.log("📊 [TICKET-SUBSCRIPTION] Encontradas:", subscriptions.length, "suscripciones activas")
    }

    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error("❌ [TICKET-SUBSCRIPTION] Error obteniendo suscripciones:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
