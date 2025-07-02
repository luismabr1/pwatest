import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("parking");

    let settings = await db.collection("company_settings").findOne({})

    // Si no existe configuración, crear una por defecto
    if (!settings) {
      const defaultSettings = {
        pagoMovil: {
          banco: "",
          cedula: "",
          telefono: "",
        },
        transferencia: {
          banco: "",
          cedula: "",
          telefono: "",
          numeroCuenta: "",
        },
        tarifas: {
          precioHoraDiurno: 3.0,
          precioHoraNocturno: 4.0,
          tasaCambio: 36.0,
          horaInicioNocturno: "00:00",
          horaFinNocturno: "06:00",
        },
        fechaCreacion: new Date(),
        fechaActualizacion: new Date(),
      }

      await db.collection("company_settings").insertOne(defaultSettings)
      settings = defaultSettings
    }

    // Migrar configuración antigua si es necesario
    if (settings.tarifaPorHora && !settings.tarifas) {
      settings.tarifas = {
        precioHoraDiurno: settings.tarifaPorHora || 3.0,
        precioHoraNocturno: (settings.tarifaPorHora || 3.0) * 1.33, // 33% más cara
        tasaCambio: settings.tasaCambio || 36.0,
        horaInicioNocturno: "00:00",
        horaFinNocturno: "06:00",
      }

      await db.collection("company_settings").updateOne(
        { _id: settings._id },
        {
          $set: { tarifas: settings.tarifas },
          $unset: { tarifaPorHora: "" },
        },
      )
    }

    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json()
    const { db } = await connectToDatabase()

    const updatedSettings = {
      ...data,
      fechaActualizacion: new Date(),
    }

    const result = await db
      .collection("company_settings")
      .findOneAndUpdate({}, { $set: updatedSettings }, { upsert: true, returnDocument: "after" })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar configuración" }, { status: 500 })
  }
}
