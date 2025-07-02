import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI!
const client = new MongoClient(uri)

export async function GET() {
  try {
    await client.connect()
    const db = client.db("parking")

    // Contar pagos pendientes
    const pagosPendientes = await db.collection("pagos").countDocuments({
      $or: [{ estado: "pendiente_validacion" }, { estadoValidacion: "pendiente" }],
    })

    // Otras estadísticas...
    const ticketsCollection = db.collection("tickets")
    const carsCollection = db.collection("cars")

    const [totalTickets, ticketsDisponibles, ticketsOcupados, totalCars] = await Promise.all([
      ticketsCollection.countDocuments(),
      ticketsCollection.countDocuments({ estado: "disponible" }),
      ticketsCollection.countDocuments({ estado: { $in: ["ocupado", "pagado_pendiente_validacion"] } }),
      carsCollection.countDocuments(),
    ])

    const stats = {
      totalTickets,
      ticketsDisponibles,
      ticketsOcupados,
      totalCars,
      pagosPendientes,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  } finally {
    await client.close()
  }
}
