import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
export const revalidate = 0

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("parking");

    // Obtener estadísticas de pagos pendientes
    const pendingPayments = await db.collection("pagos").countDocuments({
      estado: "pendiente_validacion",
    })

    
    // Obtener confirmaciones pendientes (tickets ocupados)
    const pendingConfirmations = await db.collection("tickets").countDocuments({
      estado: "ocupado",
    })

        // Obtener total de personal
    const totalStaff = await db.collection("staff").countDocuments()

    // Obtener pagos de hoy
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayPayments = await db.collection("pagos").countDocuments({
      fechaPago: {
        $gte: today,
        $lt: tomorrow,
      },
    })

        // Obtener estadísticas de tickets
    const totalTickets = await db.collection("tickets").countDocuments()
    const availableTickets = await db.collection("tickets").countDocuments({
      estado: "disponible",
    })

        // Obtener carros estacionados actualmente
    const carsParked = await db.collection("cars").countDocuments({
      estado: { $in: ["estacionado_confirmado"] },
    })
    console.log("🔍 DEBUG: Cars parked count:", carsParked)

        // Obtener tickets pagados listos para salir
    const paidTickets = await db.collection("tickets").countDocuments({
      estado: "pagado_validado",
    })

    // Otras estadísticas...
    const ticketsCollection = db.collection("tickets");
    const carsCollection = db.collection("cars");

    const stats = {
      pendingPayments,
      pendingConfirmations,
      totalStaff,
      todayPayments,
      totalTickets,
      availableTickets,
      carsParked,
      paidTickets,
    };

    const response = NextResponse.json(stats);
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}