import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    const tickets = await db.collection("tickets").find({}).sort({ fechaCreacion: -1 }).toArray()

    const stats = {
      total: tickets.length,
      disponibles: tickets.filter((t) => t.estado === "disponible").length,
      ocupados: tickets.filter((t) => t.estado === "ocupado").length,
      pagados: tickets.filter((t) => t.estado === "pagado_validado").length,
    }

    return NextResponse.json({ tickets, stats })
  } catch (error) {
    console.error("Error fetching tickets:", error)
    return NextResponse.json({ message: "Error al obtener tickets" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { cantidad } = await request.json()

    if (!cantidad || cantidad < 1 || cantidad > 100) {
      return NextResponse.json({ message: "La cantidad debe estar entre 1 y 100" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("parking")

    // Obtener el último número de ticket
    const lastTicket = await db.collection("tickets").findOne({}, { sort: { codigoTicket: -1 } })

    let nextNumber = 1
    if (lastTicket && lastTicket.codigoTicket.startsWith("PARK")) {
      const lastNumber = Number.parseInt(lastTicket.codigoTicket.replace("PARK", ""))
      nextNumber = lastNumber + 1
    } else {
      // Si no hay tickets PARK, empezar desde 6 (después de PARK005)
      const parkTickets = await db
        .collection("tickets")
        .find({ codigoTicket: { $regex: "^PARK" } })
        .toArray()
      nextNumber = parkTickets.length + 1
    }

    // Crear los nuevos tickets
    const newTickets = []
    for (let i = 0; i < cantidad; i++) {
      const ticketNumber = (nextNumber + i).toString().padStart(3, "0")
      newTickets.push({
        codigoTicket: `PARK${ticketNumber}`,
        estado: "disponible",
        fechaCreacion: new Date(),
        horaOcupacion: null,
        montoCalculado: 0,
        ultimoPagoId: null,
      })
    }

    const result = await db.collection("tickets").insertMany(newTickets)

    return NextResponse.json({
      message: `${cantidad} tickets creados exitosamente`,
      ticketsCreados: result.insertedCount,
      primerTicket: newTickets[0].codigoTicket,
      ultimoTicket: newTickets[newTickets.length - 1].codigoTicket,
    })
  } catch (error) {
    console.error("Error creating tickets:", error)
    return NextResponse.json({ message: "Error al crear tickets" }, { status: 500 })
  }
}
