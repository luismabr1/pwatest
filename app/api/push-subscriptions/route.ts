import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const { subscription, userType, ticketCode } = await request.json();
    const client = await clientPromise;
    const db = client.db("parking");

    if (!subscription?.endpoint || !userType || !ticketCode) {
      return NextResponse.json({ message: "Endpoint, userType y ticketCode son requeridos" }, { status: 400 });
    }

    await db.collection("ticket_subscriptions").updateOne(
      { endpoint: subscription.endpoint },
      {
        $set: {
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
          deviceInfo: {
            userAgent: request.headers.get("user-agent") || "Unknown",
            timestamp: new Date(),
          },
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ message: "Suscripción guardada exitosamente", success: true }, { status: 201 });
  } catch (error) {
    console.error("❌ [PUSH-SUBSCRIPTIONS] Error saving subscription:", error);
    return NextResponse.json({ message: "Error guardando suscripción", error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json();
    const client = await clientPromise;
    const db = client.db("parking");

    if (!endpoint) {
      return NextResponse.json({ message: "Endpoint es requerido" }, { status: 400 });
    }

    const result = await db.collection("ticket_subscriptions").deleteOne({ endpoint });
    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Suscripción no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ message: "Suscripción eliminada exitosamente", success: true }, { status: 200 });
  } catch (error) {
    console.error("❌ [PUSH-SUBSCRIPTIONS] Error deleting subscription:", error);
    return NextResponse.json({ message: "Error eliminando suscripción", error: error.message }, { status: 500 });
  }
}