import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI!
const client = new MongoClient(uri)

export async function GET() {
  try {
    await client.connect()
    const db = client.db("parking")

    // Buscar pagos pendientes en la colección pagos
    const pagosPendientes = await db
      .collection("pagos")
      .find({
        $or: [{ estado: "pendiente_validacion" }, { estadoValidacion: "pendiente" }],
      })
      .sort({ fechaPago: -1 })
      .toArray()

    console.log(`Found ${pagosPendientes.length} pending payments`)

    return NextResponse.json(pagosPendientes)
  } catch (error) {
    console.error("Error fetching pending payments:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  } finally {
    await client.close()
  }
}
