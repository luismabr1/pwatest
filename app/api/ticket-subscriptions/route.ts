import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    const { ticketCode, subscription, userType } = await request.json()
    const client = await clientPromise
    const db = client.db("parking")

    if (process.env.NODE_ENV === "development") {
      console.log("🔔 [PUSH-SUBSCRIPTIONS] Received subscription request:", {
        ticketCode,
        userType,
        endpoint: subscription?.endpoint?.substring(0, 50) + "...",
      })
    }

    if (!ticketCode || !subscription?.endpoint) {
      console.error("❌ [PUSH-SUBSCRIPTIONS] Missing required fields:", {
        ticketCode: !!ticketCode,
        endpoint: !!subscription?.endpoint,
      })
      return NextResponse.json({ message: "Ticket code and endpoint are required" }, { status: 400 })
    }

    // Check if subscription already exists for this endpoint and ticket
    const existing = await db.collection("ticket_subscriptions").findOne({
      endpoint: subscription.endpoint,
      ticketCode: ticketCode,
      userType: userType || "user",
    })

    if (existing) {
      // Update existing subscription
      await db.collection("ticket_subscriptions").updateOne(
        { _id: existing._id },
        {
          $set: {
            isActive: true,
            updatedAt: new Date(),
            "lifecycle.updatedAt": new Date(),
            "lifecycle.stage": "active",
          },
        },
      )

      if (process.env.NODE_ENV === "development") {
        console.log("✅ [PUSH-SUBSCRIPTIONS] Existing subscription updated")
      }
    } else {
      // Create new subscription
      await db.collection("ticket_subscriptions").insertOne({
        ticketCode,
        subscription: {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
        userType: userType || "user",
        isActive: true,
        createdAt: new Date(),
        lifecycle: {
          stage: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        autoExpire: true, // Will be cleaned up when vehicle exits
        expiresAt: null, // Set when vehicle exits
        deviceInfo: {
          userAgent: request.headers.get("user-agent") || "unknown",
          timestamp: new Date(),
          ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        },
      })

      if (process.env.NODE_ENV === "development") {
        console.log("✅ [PUSH-SUBSCRIPTIONS] New subscription created")
      }
    }

    return NextResponse.json({ message: "Subscription saved successfully", success: true }, { status: 201 })
  } catch (error) {
    console.error("❌ [PUSH-SUBSCRIPTIONS] Error saving subscription:", error)
    return NextResponse.json({ message: "Error saving subscription", error: error.message }, { status: 500 })
  }
}

// DELETE endpoint to remove subscriptions
export async function DELETE(request: Request) {
  try {
    const { endpoint, ticketCode } = await request.json()
    const client = await clientPromise
    const db = client.db("parking")

    if (process.env.NODE_ENV === "development") {
      console.log("🗑️ [PUSH-SUBSCRIPTIONS] Removing subscription:", {
        ticketCode,
        endpoint: endpoint?.substring(0, 50) + "...",
      })
    }

    let query = {}
    if (endpoint && ticketCode) {
      query = { endpoint, ticketCode }
    } else if (endpoint) {
      query = { endpoint }
    } else if (ticketCode) {
      query = { ticketCode }
    } else {
      return NextResponse.json({ message: "Endpoint or ticketCode required" }, { status: 400 })
    }

    const result = await db.collection("ticket_subscriptions").deleteMany(query)

    if (process.env.NODE_ENV === "development") {
      console.log("✅ [PUSH-SUBSCRIPTIONS] Subscriptions removed:", result.deletedCount)
    }

    return NextResponse.json({
      message: "Subscriptions removed successfully",
      deletedCount: result.deletedCount,
    })
  } catch (error) {
    console.error("❌ [PUSH-SUBSCRIPTIONS] Error removing subscription:", error)
    return NextResponse.json({ message: "Error removing subscription", error: error.message }, { status: 500 })
  }
}
