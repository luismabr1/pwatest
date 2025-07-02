import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""

    // Build search query
    let query: any = {}
    if (search) {
      query = {
        $or: [
          { placa: { $regex: search, $options: "i" } },
          { nombreDueño: { $regex: search, $options: "i" } },
          { marca: { $regex: search, $options: "i" } },
          { modelo: { $regex: search, $options: "i" } },
          { ticketAsociado: { $regex: search, $options: "i" } },
        ],
      }
    }

    // Get total count
    const total = await db.collection("car_history").countDocuments(query)

    // Get paginated results with optimized projection
    const history = await db
      .collection("car_history")
      .find(query, {
        projection: {
          // Core info
          carId: 1,
          placa: 1,
          marca: 1,
          modelo: 1,
          color: 1,
          nombreDueño: 1,
          telefono: 1,
          ticketAsociado: 1,

          // Status and dates
          estadoActual: 1,
          fechaRegistro: 1,
          fechaSalida: 1,
          fechaUltimaActualizacion: 1,
          activo: 1,
          completado: 1,

          // Summary data
          duracionTotalMinutos: 1,
          montoTotalPagado: 1,

          // Latest event for quick status
          eventos: { $slice: -1 }, // Only last event for list view
        },
      })
      .sort({ fechaUltimaActualizacion: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    // Transform data for frontend compatibility
    const transformedHistory = history.map((item) => ({
      _id: item._id,
      placa: item.placa,
      marca: item.marca,
      modelo: item.modelo,
      color: item.color,
      nombreDueño: item.nombreDueño,
      telefono: item.telefono,
      ticketAsociado: item.ticketAsociado,
      horaIngreso: item.fechaRegistro,
      horaSalida: item.fechaSalida,
      montoTotal: item.montoTotalPagado || 0,
      estado: item.completado ? "finalizado" : item.activo ? "activo" : "inactivo",
      fechaRegistro: item.fechaRegistro,
      duracionMinutos: item.duracionTotalMinutos,
      ultimoEvento: item.eventos?.[0] || null,
    }))

    const pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    }

    const response = NextResponse.json({
      history: transformedHistory,
      pagination,
    })

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
    response.headers.set("Surrogate-Control", "no-store")

    return response
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching car history:", error)
    }
    return NextResponse.json({ message: "Error al obtener el historial" }, { status: 500 })
  }
}

// New endpoint to get detailed history for a specific car
export async function POST(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    const { carId } = await request.json()

    if (!carId) {
      return NextResponse.json({ message: "Car ID requerido" }, { status: 400 })
    }

    // Try to find by carId first, then by _id if it's a valid ObjectId
    let query: any = { carId: carId }

    // If carId looks like a MongoDB ObjectId, also search by _id
    if (ObjectId.isValid(carId)) {
      query = {
        $or: [{ carId: carId }, { _id: new ObjectId(carId) }],
      }
    }

    // Get full detailed history for specific car
    const carHistory = await db.collection("car_history").findOne(query)

    if (!carHistory) {
      return NextResponse.json({ message: "Historial no encontrado" }, { status: 404 })
    }

    const response = NextResponse.json(carHistory)

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
    response.headers.set("Surrogate-Control", "no-store")

    return response
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching detailed car history:", error)
    }
    return NextResponse.json({ message: "Error al obtener el historial detallado" }, { status: 500 })
  }
}
