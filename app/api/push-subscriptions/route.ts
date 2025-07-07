import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    console.log("🔔 [PUSH-SUBSCRIPTIONS] ===== NUEVA SUSCRIPCIÓN =====")

    const { subscription, userType, ticketCode } = await request.json()

    console.log("📦 [PUSH-SUBSCRIPTIONS] Datos recibidos:")
    console.log("   Endpoint:", subscription?.endpoint?.substring(0, 50) + "..." || "NO ENDPOINT")
    console.log("   UserType:", userType || "NO USER TYPE")
    console.log("   TicketCode:", ticketCode || "NO TICKET CODE")
    console.log("   Keys P256DH:", subscription?.keys?.p256dh ? "✅ Presente" : "❌ Faltante")
    console.log("   Keys Auth:", subscription?.keys?.auth ? "✅ Presente" : "❌ Faltante")

    if (!subscription || !userType || !ticketCode) {
      console.error("❌ [PUSH-SUBSCRIPTIONS] ERROR: Datos incompletos")
      console.error("   Subscription:", !!subscription)
      console.error("   UserType:", !!userType)
      console.error("   TicketCode:", !!ticketCode)
      return NextResponse.json({ message: "Datos incompletos" }, { status: 400 })
    }

    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      console.error("❌ [PUSH-SUBSCRIPTIONS] ERROR: Suscripción inválida")
      console.error("   Endpoint:", !!subscription.endpoint)
      console.error("   P256DH:", !!subscription.keys?.p256dh)
      console.error("   Auth:", !!subscription.keys?.auth)
      return NextResponse.json({ message: "Suscripción inválida" }, { status: 400 })
    }

    // Check for existing subscriptions
    console.log("🔍 [PUSH-SUBSCRIPTIONS] Verificando suscripciones existentes...")

    const existingSubscriptions = await db
      .collection("ticket_subscriptions")
      .find({
        "subscription.endpoint": subscription.endpoint,
        ticketCode,
        userType,
      })
      .toArray()

    console.log("📊 [PUSH-SUBSCRIPTIONS] Suscripciones existentes encontradas:", existingSubscriptions.length)

    if (existingSubscriptions.length > 0) {
      console.log("🔄 [PUSH-SUBSCRIPTIONS] Eliminando suscripciones duplicadas...")
      existingSubscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. ID: ${sub._id}, IsActive: ${sub.isActive}, CreatedAt: ${sub.createdAt}`)
      })
    }

    // Remove any existing subscription for this endpoint and ticket/userType combination
    const deleteResult = await db.collection("ticket_subscriptions").deleteMany({
      "subscription.endpoint": subscription.endpoint,
      ticketCode,
      userType,
    })

    console.log("🗑️ [PUSH-SUBSCRIPTIONS] Suscripciones eliminadas:", deleteResult.deletedCount)

    // Create new subscription with extended lifecycle
    const subscriptionData = {
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      userType,
      ticketCode,
      isActive: true,
      createdAt: new Date(),
      lastUsed: new Date(),
      // Lifecycle tracking
      lifecycle: {
        stage: "active", // active, payment_pending, payment_validated, vehicle_exit, completed
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Don't auto-expire until vehicle exit is complete
      autoExpire: false,
      expiresAt: null, // Will be set when vehicle exits
      // Device info for debugging
      deviceInfo: {
        userAgent: request.headers.get("user-agent") || "Unknown",
        timestamp: new Date(),
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown",
      },
    }

    console.log("💾 [PUSH-SUBSCRIPTIONS] Guardando nueva suscripción...")
    console.log("   Lifecycle Stage:", subscriptionData.lifecycle.stage)
    console.log("   Auto Expire:", subscriptionData.autoExpire)
    console.log("   User Agent:", subscriptionData.deviceInfo.userAgent.substring(0, 50) + "...")

    const result = await db.collection("ticket_subscriptions").insertOne(subscriptionData)

    console.log("✅ [PUSH-SUBSCRIPTIONS] Suscripción guardada exitosamente")
    console.log("   ID:", result.insertedId)
    console.log("   Endpoint:", subscription.endpoint.substring(0, 50) + "...")
    console.log("   Para:", `${userType} - ${ticketCode}`)

    // Verify the subscription was saved correctly
    const savedSubscription = await db.collection("ticket_subscriptions").findOne({ _id: result.insertedId })
    console.log("🔍 [PUSH-SUBSCRIPTIONS] Verificación de guardado:")
    console.log("   Encontrada:", !!savedSubscription)
    console.log("   IsActive:", savedSubscription?.isActive)
    console.log("   UserType:", savedSubscription?.userType)
    console.log("   TicketCode:", savedSubscription?.ticketCode)

    console.log("✅ [PUSH-SUBSCRIPTIONS] ===== SUSCRIPCIÓN COMPLETADA =====")

    return NextResponse.json(
      {
        message: "Suscripción guardada exitosamente",
        success: true,
        subscriptionId: result.insertedId,
        debug: {
          userType,
          ticketCode,
          endpoint: subscription.endpoint.substring(0, 50) + "...",
          lifecycle: subscriptionData.lifecycle.stage,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("❌ [PUSH-SUBSCRIPTIONS] ERROR CRÍTICO:", error)
    console.error("❌ [PUSH-SUBSCRIPTIONS] Stack trace:", error.stack)
    return NextResponse.json({ message: "Error interno del servidor", error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    console.log("🗑️ [PUSH-SUBSCRIPTIONS] ===== ELIMINANDO SUSCRIPCIÓN =====")

    const { subscription } = await request.json()

    console.log("📦 [PUSH-SUBSCRIPTIONS] Datos para eliminar:")
    console.log("   Endpoint:", subscription?.endpoint?.substring(0, 50) + "..." || "NO ENDPOINT")

    if (!subscription?.endpoint) {
      console.error("❌ [PUSH-SUBSCRIPTIONS] ERROR: Endpoint de suscripción requerido")
      return NextResponse.json({ message: "Endpoint de suscripción requerido" }, { status: 400 })
    }

    // Find existing subscriptions before deletion
    const existingSubscriptions = await db
      .collection("ticket_subscriptions")
      .find({
        "subscription.endpoint": subscription.endpoint,
      })
      .toArray()

    console.log("🔍 [PUSH-SUBSCRIPTIONS] Suscripciones encontradas para eliminar:", existingSubscriptions.length)

    if (existingSubscriptions.length > 0) {
      console.log("📋 [PUSH-SUBSCRIPTIONS] Detalles de suscripciones a eliminar:")
      existingSubscriptions.forEach((sub, index) => {
        console.log(
          `   ${index + 1}. UserType: ${sub.userType}, TicketCode: ${sub.ticketCode}, IsActive: ${sub.isActive}`,
        )
      })
    }

    // Only mark as inactive, don't delete (for debugging and lifecycle management)
    const result = await db.collection("ticket_subscriptions").updateMany(
      { "subscription.endpoint": subscription.endpoint },
      {
        $set: {
          isActive: false,
          unsubscribedAt: new Date(),
          "lifecycle.stage": "unsubscribed",
          "lifecycle.updatedAt": new Date(),
        },
      },
    )

    console.log("🔄 [PUSH-SUBSCRIPTIONS] Suscripciones marcadas como inactivas:", result.modifiedCount)

    if (result.modifiedCount === 0) {
      console.log("⚠️ [PUSH-SUBSCRIPTIONS] No se encontraron suscripciones para desactivar")
      return NextResponse.json({ message: "Suscripción no encontrada" }, { status: 404 })
    }

    console.log("✅ [PUSH-SUBSCRIPTIONS] ===== ELIMINACIÓN COMPLETADA =====")

    return NextResponse.json({
      message: "Suscripción desactivada exitosamente",
      deactivated: result.modifiedCount,
    })
  } catch (error) {
    console.error("❌ [PUSH-SUBSCRIPTIONS] ERROR CRÍTICO:", error)
    console.error("❌ [PUSH-SUBSCRIPTIONS] Stack trace:", error.stack)
    return NextResponse.json({ message: "Error interno del servidor", error: error.message }, { status: 500 })
  }
}
