import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    const { subscription, userType = "user" } = await request.json()

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ message: "Suscripción inválida" }, { status: 400 })
    }

    const now = new Date()

    // Save or update subscription
    await db.collection("push_subscriptions").updateOne(
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

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Suscripción push guardada:", { endpoint: subscription.endpoint, userType })
    }

    return NextResponse.json({
      success: true,
      message: "Suscripción guardada exitosamente",
    })
  } catch (error) {
    console.error("Error saving push subscription:", error)
    return NextResponse.json({ message: "Error guardando suscripción" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    const { subscription } = await request.json()

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ message: "Suscripción inválida" }, { status: 400 })
    }

    // Mark subscription as inactive
    await db.collection("push_subscriptions").updateOne(
      { endpoint: subscription.endpoint },
      {
        $set: {
          active: false,
          lastUpdated: new Date(),
        },
      },
    )

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Suscripción push desactivada:", subscription.endpoint)
    }

    return NextResponse.json({
      success: true,
      message: "Suscripción eliminada exitosamente",
    })
  } catch (error) {
    console.error("Error removing push subscription:", error)
    return NextResponse.json({ message: "Error eliminando suscripción" }, { status: 500 })
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
