import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    console.log("POST /api/push-subscriptions - Starting...")

    const client = await clientPromise
    const db = client.db("parking")

    const body = await request.json()
    console.log("Request body received:", { hasSubscription: !!body.subscription, userType: body.userType })

    const { subscription, userType = "user" } = body

    if (!subscription || !subscription.endpoint) {
      console.error("Invalid subscription:", subscription)
      return NextResponse.json({ message: "Suscripción inválida" }, { status: 400 })
    }

    const now = new Date()

    console.log("Saving subscription to database...")

    // Save or update subscription
    const result = await db.collection("push_subscriptions").updateOne(
      { endpoint: subscription.endpoint },
      {
        $set: {
          subscription,
          userType,
          active: true,
          lastUpdated: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    )

    console.log("Database operation result:", {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
    })

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Suscripción push guardada:", { endpoint: subscription.endpoint, userType })
    }

    return NextResponse.json({
      success: true,
      message: "Suscripción guardada exitosamente",
    })
  } catch (error) {
    console.error("Error saving push subscription:", error)
    return NextResponse.json(
      {
        message: "Error guardando suscripción",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    console.log("DELETE /api/push-subscriptions - Starting...")

    const client = await clientPromise
    const db = client.db("parking")

    const { endpoint } = await request.json()

    if (!endpoint) {
      return NextResponse.json({ message: "Endpoint requerido" }, { status: 400 })
    }

    console.log("Deactivating subscription for endpoint:", endpoint)

    // Mark subscription as inactive
    const result = await db.collection("push_subscriptions").updateOne(
      { endpoint },
      {
        $set: {
          active: false,
          lastUpdated: new Date(),
        },
      },
    )

    console.log("Deactivation result:", { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount })

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Suscripción push desactivada:", endpoint)
    }

    return NextResponse.json({
      success: true,
      message: "Suscripción eliminada exitosamente",
    })
  } catch (error) {
    console.error("Error removing push subscription:", error)
    return NextResponse.json(
      {
        message: "Error eliminando suscripción",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    const subscriptions = await db.collection("push_subscriptions").find({ active: true }).toArray()

    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error("Error fetching push subscriptions:", error)
    return NextResponse.json({ message: "Error obteniendo suscripciones" }, { status: 500 })
  }
}
