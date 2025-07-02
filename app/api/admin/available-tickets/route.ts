import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const fetchCache = "force-no-store"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    const availableTickets = await db
      .collection("tickets")
      .find({ estado: "disponible" })
      .sort({ codigoTicket: 1 })
      .toArray()

    const response = NextResponse.json(availableTickets)
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    return response
  } catch (error) {
    console.error("Error fetching available tickets:", error)
    return NextResponse.json({ message: "Error al obtener tickets disponibles" }, { status: 500 })
  }
}
