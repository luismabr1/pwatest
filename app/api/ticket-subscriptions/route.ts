import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    const { ticketCode, subscription } = await request.json()
    const client = await clientPromise
    const db = client.db("parking")

    if (process.env.NODE_ENV === "development") {
      console.log("🔔 [PUSH-SUBSCRIPTIONS] Received subscription request:", {
        ticketCode,
        endpoint: subscription?.endpoint?.substring(0, 50) + "...",
      })
    }

    if (!ticketCode || !subscription?.endpoint) {
      console.error("❌ [PUSH-SUBSCRIPTIONS] Missing required fields:", { ticketCode: !!ticketCode, endpoint: !!subscription?.endpoint })
      return NextResponse.json({ message: "Ticket code and endpoint are required" }, { status: 400 })
    }

    const existing = await db.collection("ticket_subscriptions").findOne({ endpoint: subscription.endpoint })
    if (existing) {
      await db.collection("ticket_subscriptions").updateOne(
        { endpoint: subscription.endpoint },
        { $set: { ticketCode, isActive: true, updatedAt: new Date() } },
      )
    } else {
      await db.collection("ticket_subscriptions").insertOne({
        ticketCode,
        subscription: {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
        isActive: true,
        createdAt: new Date(),
        userType: "user", // Default to user for now
      })
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ [PUSH-SUBSCRIPTIONS] Subscription saved successfully")
    }

    return NextResponse.json({ message: "Subscription saved successfully", success: true }, { status: 201 })
  } catch (error) {
    console.error("❌ [PUSH-SUBSCRIPTIONS] Error saving subscription:", error)
    return NextResponse.json({ message: "Error saving subscription", error: error.message }, { status: 500 })
  }
}