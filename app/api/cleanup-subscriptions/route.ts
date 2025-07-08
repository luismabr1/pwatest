import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    console.log("🧹 [CLEANUP-SUBSCRIPTIONS] ===== INICIANDO LIMPIEZA =====")

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago

    // Find expired subscriptions
    const expiredSubscriptions = await db
      .collection("ticket_subscriptions")
      .find({
        $or: [
          { isActive: false },
          { expiresAt: { $lt: now } },
          {
            createdAt: { $lt: oneDayAgo },
            lastUsed: { $exists: false },
          },
          {
            // Clean up TEST-001 subscriptions older than 1 hour
            ticketCode: "TEST-001",
            createdAt: { $lt: new Date(now.getTime() - 60 * 60 * 1000) },
          },
        ],
      })
      .toArray()

    console.log("🔍 [CLEANUP-SUBSCRIPTIONS] Suscripciones expiradas encontradas:", expiredSubscriptions.length)

    if (expiredSubscriptions.length > 0) {
      // Delete expired subscriptions
      const deleteResult = await db.collection("ticket_subscriptions").deleteMany({
        _id: { $in: expiredSubscriptions.map((sub) => sub._id) },
      })

      console.log("🗑️ [CLEANUP-SUBSCRIPTIONS] Suscripciones eliminadas:", deleteResult.deletedCount)

      // Log details of cleaned subscriptions
      expiredSubscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. Ticket: ${sub.ticketCode}, UserType: ${sub.userType}, Created: ${sub.createdAt}`)
      })
    }

    // Get current active subscriptions count
    const activeCount = await db.collection("ticket_subscriptions").countDocuments({ isActive: true })

    console.log("📊 [CLEANUP-SUBSCRIPTIONS] Suscripciones activas restantes:", activeCount)
    console.log("✅ [CLEANUP-SUBSCRIPTIONS] ===== LIMPIEZA COMPLETADA =====")

    return NextResponse.json({
      message: "Limpieza completada",
      expiredRemoved: expiredSubscriptions.length,
      activeRemaining: activeCount,
    })
  } catch (error) {
    console.error("❌ [CLEANUP-SUBSCRIPTIONS] Error:", error)
    return NextResponse.json(
      {
        message: "Error en limpieza",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
