import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// POST: Registrar suscripción para un ticket específico
export async function POST(request: NextRequest) {
  try {
    const { ticketCode, subscription } = await request.json()

    if (!ticketCode || !subscription) {
      return NextResponse.json({ error: "Código de ticket y suscripción son requeridos" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("parking")

    // Verificar que el ticket existe
    const ticket = await db.collection("tickets").findOne({
      codigoTicket: ticketCode,
      estado: { $in: ["activo", "ocupado", "estacionado_pendiente", "estacionado_confirmado"] },
    })

    if (!ticket) {
      return NextResponse.json({ error: "Ticket no encontrado o no válido" }, { status: 404 })
    }

    // Registrar o actualizar la suscripción para este ticket
    await db.collection("ticket_subscriptions").updateOne(
      {
        ticketCode: ticketCode,
        endpoint: subscription.endpoint,
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

    return NextResponse.json({
      success: true,
      message: "Suscripción registrada para el ticket",
    })
  } catch (error) {
    console.error("Error registrando suscripción de ticket:", error)
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

    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error("Error obteniendo suscripciones:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
