import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { pushNotificationService } from "@/lib/push-notifications";

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log("🔔 [SEND-NOTIFICATION] Recibida solicitud POST");
      console.log("📡 [SEND-NOTIFICATION] Request method:", request.method);
      console.log("📡 [SEND-NOTIFICATION] Request headers:", Object.fromEntries(request.headers.entries()));
      console.log("📦 [SEND-NOTIFICATION] Request body:", await request.json());
    }

    const client = await clientPromise;
    const db = client.db("parking");

    const { type, ticketCode, userType = "user", data = {} } = await request.json();

    if (process.env.NODE_ENV === "development") {
      console.log("🔔 [SEND-NOTIFICATION] Procesando notificación:", {
        type,
        ticketCode,
        userType,
        hasData: !!data,
        subscriptionsProvided: !!data.subscriptions,
        subscriptionsCount: data.subscriptions?.length || 0,
      });
    }

    if (!type || !ticketCode) {
      console.error("❌ [SEND-NOTIFICATION] Parámetros faltantes:", { type: !!type, ticketCode: !!ticketCode });
      return NextResponse.json({ message: "Tipo y código de ticket requeridos" }, { status: 400 });
    }

    let subscriptions = [];

    // If subscriptions are provided in data, use them directly
    if (data.subscriptions && Array.isArray(data.subscriptions)) {
      subscriptions = data.subscriptions;
      if (process.env.NODE_ENV === "development") {
        console.log("📱 [SEND-NOTIFICATION] Usando suscripciones proporcionadas:", subscriptions.length);
      }
    } else {
      // Get subscriptions from database based on userType
      if (userType === "admin") {
        const adminSubs = await db
          .collection("push_subscriptions")
          .find({ active: true, userType: "admin" })
          .toArray();
        subscriptions = adminSubs.map((sub) => sub.subscription);
      } else if (userType === "user") {
        const ticketSubs = await db
          .collection("ticket_subscriptions")
          .find({ ticketCode: ticketCode, isActive: true })
          .toArray();
        subscriptions = ticketSubs.map((sub) => sub.subscription);
      }

      if (process.env.NODE_ENV === "development") {
        console.log("🔍 [SEND-NOTIFICATION] Suscripciones obtenidas de BD:", subscriptions.length);
      }
    }

    if (subscriptions.length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.log("⚠️ [SEND-NOTIFICATION] No hay suscripciones para enviar");
      }
      return NextResponse.json({
        success: true,
        message: "No hay suscripciones activas",
        sent: 0,
      });
    }

    let notification;

    // Create notification based on type
    switch (type) {
      case "payment_validated":
        notification = pushNotificationService.createPaymentValidatedNotification(ticketCode, data.amount || 0);
        break;
      case "payment_rejected":
        notification = pushNotificationService.createPaymentRejectedNotification(
          ticketCode,
          data.reason || "Pago rechazado",
        );
        break;
      case "vehicle_parked":
        notification = pushNotificationService.createVehicleParkedNotification(ticketCode, data.plate || "N/A");
        break;
      case "vehicle_exit":
        notification = pushNotificationService.createVehicleExitNotification(ticketCode, data.plate || "N/A");
        break;
      case "admin_payment":
        notification = pushNotificationService.createAdminPaymentNotification(
          ticketCode,
          data.amount || 0,
          data.plate || "N/A",
        );
        break;
      case "admin_exit_request":
        notification = pushNotificationService.createAdminExitRequestNotification(ticketCode, data.plate || "N/A");
        break;
      case "test":
        notification = {
          title: "🔔 Notificación de Prueba",
          body: "Las notificaciones están funcionando correctamente",
          icon: "/icon-192x192.png",
          badge: "/icon-192x192.png",
          data: {
            type: "test",
            timestamp: new Date().toISOString(),
          },
        };
        break;
      default:
        return NextResponse.json({ message: "Tipo de notificación no válido" }, { status: 400 });
    }

    if (process.env.NODE_ENV === "development") {
      console.log("📝 [SEND-NOTIFICATION] Notificación creada:", {
        title: notification.title,
        body: notification.body,
        subscriptionsToSend: subscriptions.length,
      });
    }

    // Send notifications
    const sentCount = await pushNotificationService.sendToMultipleSubscriptions(subscriptions, notification);

    if (process.env.NODE_ENV === "development") {
      console.log(`📊 [SEND-NOTIFICATION] Resultado: ${sentCount}/${subscriptions.length} enviadas exitosamente`);
    }

    return NextResponse.json({
      success: true,
      message: `Notificaciones enviadas: ${sentCount}/${subscriptions.length}`,
      sent: sentCount,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error("❌ [SEND-NOTIFICATION] Error enviando notificaciones:", error);
    return NextResponse.json({ message: "Error enviando notificaciones", error: error.message }, { status: 500 });
  }
}