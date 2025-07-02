import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db("parking")
    const { ticketCode } = await request.json()

    if (!ticketCode) {
      return NextResponse.json({ message: "Código de ticket requerido" }, { status: 400 })
    }

    const now = new Date()

    // Find the ticket first
    const ticket = await db.collection("tickets").findOne({
      codigoTicket: ticketCode,
      estado: "ocupado",
    })

    if (!ticket) {
      return NextResponse.json({ message: "Ticket no encontrado o no está ocupado" }, { status: 404 })
    }

    // Find the associated car using the ticket code
    const car = await db.collection("cars").findOne({
      ticketAsociado: ticketCode,
      estado: { $in: ["estacionado", "ocupado"] },
    })

    if (!car) {
      return NextResponse.json({ message: "No se encontró el vehículo asociado a este ticket" }, { status: 404 })
    }

    const carId = car._id.toString()

    // Update car status
    const carResult = await db.collection("cars").updateOne(
      { _id: new ObjectId(carId) },
      {
        $set: {
          estado: "estacionado_confirmado",
          horaConfirmacion: now,
        },
      },
    )

    if (carResult.matchedCount === 0) {
      return NextResponse.json({ message: "Error actualizando el vehículo" }, { status: 404 })
    }

    // Update ticket status and add car info
    await db.collection("tickets").updateOne(
      { codigoTicket: ticketCode },
      {
        $set: {
          estado: "estacionado_confirmado",
          horaConfirmacion: now,
          carInfo: {
            _id: car._id,
            placa: car.placa,
            marca: car.marca,
            modelo: car.modelo,
            color: car.color,
            nombreDueño: car.nombreDueño,
            telefono: car.telefono,
            horaIngreso: car.horaIngreso,
            fechaRegistro: car.fechaRegistro,
            imagenes: car.imagenes || {},
          },
        },
      },
    )

    // Update or create car_history entry
    await db.collection("car_history").updateOne(
      { carId: carId },
      {
        $set: {
          estadoActual: "estacionado_confirmado",
          fechaUltimaActualizacion: now,
        },
        $push: {
          eventos: {
            tipo: "confirmacion_estacionamiento",
            fecha: now,
            estado: "estacionado_confirmado",
            datos: {
              ticketCodigo: ticketCode,
              confirmadoPor: "admin",
            },
          },
        },
      },
      { upsert: true },
    )

    // Send notification to user about parking confirmation
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "vehicle_parked",
          ticketCode: ticketCode,
          userType: "user",
          data: {
            plate: car.placa || "N/A",
          },
        }),
      })
    } catch (notificationError) {
      console.error("Error sending parking confirmation notification:", notificationError)
      // Don't fail the confirmation if notification fails
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Estacionamiento confirmado para ticket:", ticketCode, "carId:", carId)
    }

    return NextResponse.json({
      success: true,
      message: "Estacionamiento confirmado exitosamente",
    })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error confirming parking:", error)
    }
    return NextResponse.json(
      {
        message: "Error al confirmar estacionamiento",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
