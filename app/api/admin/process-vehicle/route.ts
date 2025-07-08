import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    const { ticketCode, carData } = await request.json()

    if (process.env.NODE_ENV === "development") {
      console.log("🚗 [PROCESS-VEHICLE] ===== INICIANDO PROCESAMIENTO DE VEHÍCULO =====")
      console.log("🎫 [PROCESS-VEHICLE] Código de ticket:", ticketCode)
      console.log("🚗 [PROCESS-VEHICLE] Datos del vehículo:", carData)
    }

    if (!ticketCode || !carData) {
      return NextResponse.json({ message: "Código de ticket y datos del vehículo son requeridos" }, { status: 400 })
    }

    const now = new Date()

    // Find and update the ticket
    const ticket = await db.collection("tickets").findOne({ codigoTicket: ticketCode })
    if (!ticket) {
      return NextResponse.json({ message: "Ticket no encontrado" }, { status: 404 })
    }

    if (ticket.estado !== "disponible") {
      return NextResponse.json({ message: "El ticket no está disponible" }, { status: 400 })
    }

    // Update ticket status
    await db.collection("tickets").updateOne(
      { codigoTicket: ticketCode },
      {
        $set: {
          estado: "ocupado",
          horaOcupacion: now,
          horaEntrada: now,
        },
      },
    )

    // Create car record
    const carRecord = {
      ...carData,
      ticketAsociado: ticketCode,
      horaIngreso: now,
      fechaRegistro: now,
      estado: "estacionado",
    }

    const carResult = await db.collection("cars").insertOne(carRecord)
    const carId = carResult.insertedId.toString()

    // Create car history
    await db.collection("car_history").insertOne({
      carId,
      ticketAsociado: ticketCode,
      estadoActual: "estacionado",
      activo: true,
      completado: false,
      fechaCreacion: now,
      fechaUltimaActualizacion: now,
      eventos: [
        {
          tipo: "vehiculo_registrado",
          fecha: now,
          estado: "estacionado",
          datos: {
            ...carData,
            ticketCodigo: ticketCode,
            registradoPor: "admin",
          },
        },
      ],
      datosVehiculo: carData,
    })

    // 🔔 CREATE AUTOMATIC ADMIN SUBSCRIPTION FOR THIS TICKET
    try {
      console.log("🔔 [PROCESS-VEHICLE] Creating automatic admin subscription for ticket:", ticketCode)

      // This creates a "virtual" subscription for admin notifications
      // In a real scenario, this would be the admin's actual push subscription
      await db.collection("ticket_subscriptions").insertOne({
        ticketCode,
        subscription: {
          endpoint: `admin-virtual-${ticketCode}-${Date.now()}`,
          keys: {
            p256dh: "admin-virtual-key",
            auth: "admin-virtual-auth",
          },
        },
        userType: "admin",
        isActive: true,
        createdAt: now,
        lifecycle: {
          stage: "active",
          createdAt: now,
          updatedAt: now,
        },
        autoExpire: true,
        expiresAt: null,
        deviceInfo: {
          userAgent: "admin-system",
          timestamp: now,
          ip: "system",
        },
        isVirtual: true, // Mark as virtual subscription for admin system
      })

      console.log("✅ [PROCESS-VEHICLE] Admin subscription created for ticket:", ticketCode)
    } catch (subscriptionError) {
      console.error("❌ [PROCESS-VEHICLE] Error creating admin subscription:", subscriptionError)
      // Don't fail the vehicle processing if subscription fails
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ [PROCESS-VEHICLE] Vehículo procesado exitosamente:")
      console.log("   Ticket:", ticketCode)
      console.log("   Car ID:", carId)
      console.log("   Placa:", carData.placa)
    }

    return NextResponse.json({
      message: "Vehículo procesado exitosamente",
      ticketCode,
      carId,
      carData,
    })
  } catch (error) {
    console.error("❌ [PROCESS-VEHICLE] Error:", error)
    return NextResponse.json(
      {
        message: "Error al procesar el vehículo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
