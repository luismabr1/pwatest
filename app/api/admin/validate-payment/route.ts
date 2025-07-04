import { type NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { pagoId } = await request.json();

    if (process.env.NODE_ENV === "development") {
      console.log("💰 [VALIDATE-PAYMENT] Iniciando validación de pago:", pagoId);
    }

    if (!pagoId) {
      console.error("❌ [VALIDATE-PAYMENT] ID de pago faltante");
      return NextResponse.json({ error: "ID de pago requerido" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("parking");

    // Buscar el pago
    const pago = await db.collection("pagos").findOne({ _id: new ObjectId(pagoId) });

    if (!pago) {
      console.error("❌ [VALIDATE-PAYMENT] Pago no encontrado:", pagoId);
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ [VALIDATE-PAYMENT] Pago encontrado:", {
        codigo: pago.codigoTicket,
        monto: pago.montoPagado,
        estado: pago.estado,
      });
    }

    const now = new Date();

    // Actualizar el pago
    await db.collection("pagos").updateOne(
      { _id: new ObjectId(pagoId) },
      {
        $set: {
          estado: "validado",
          estadoValidacion: "validado",
          fechaValidacion: now,
          validadoPor: "admin",
        },
      },
    );

    // Actualizar el ticket
    await db.collection("tickets").updateOne(
      { codigoTicket: pago.codigoTicket },
      {
        $set: {
          estado: "pagado_validado",
          fechaValidacionPago: now,
        },
      },
    );

    // Get car info for notification
    const car = await db.collection("cars").findOne({ ticketAsociado: pago.codigoTicket });

    // Registrar en car_history
    const carHistoryUpdate = {
      $push: {
        eventos: {
          tipo: "pago_validado",
          fecha: now,
          estado: "pago_confirmado",
          datos: {
            pagoId: pagoId,
            tipoPago: pago.tipoPago,
            montoPagado: pago.montoPagado,
            montoPagadoUsd: pago.montoPagadoUsd,
            tasaCambio: pago.tasaCambioUsada,
            referenciaTransferencia: pago.referenciaTransferencia,
            banco: pago.banco,
            telefono: pago.telefono,
            numeroIdentidad: pago.numeroIdentidad,
            urlImagenComprobante: pago.urlImagenComprobante,
            validadoPor: "admin",
          },
        },
        pagos: {
          pagoId: pagoId,
          tipoPago: pago.tipoPago,
          montoPagado: pago.montoPagado,
          montoPagadoUsd: pago.montoPagadoUsd,
          tasaCambio: pago.tasaCambioUsada,
          fechaPago: pago.fechaPago,
          fechaValidacion: now,
          estado: "validado",
          referenciaTransferencia: pago.referenciaTransferencia,
          banco: pago.banco,
        },
      },
      $set: {
        estadoActual: "pago_confirmado",
        fechaUltimaActualizacion: now,
        fechaConfirmacionPago: now,
      },
    };

    await db.collection("car_history").updateOne({ ticketAsociado: pago.codigoTicket }, carHistoryUpdate);

    // Send notification to ticket subscriptions
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("🔔 [VALIDATE-PAYMENT] Buscando suscripciones para ticket:", pago.codigoTicket);
      }

      const ticketSubscriptions = await db
        .collection("ticket_subscriptions")
        .find({
          ticketCode: pago.codigoTicket,
          isActive: true,
        })
        .toArray();

      if (process.env.NODE_ENV === "development") {
        console.log("📊 [VALIDATE-PAYMENT] Suscripciones encontradas:", ticketSubscriptions.length);
        ticketSubscriptions.forEach((sub, index) => {
          console.log(`📱 [VALIDATE-PAYMENT] Suscripción ${index + 1}:`, {
            endpoint: sub.subscription?.endpoint?.substring(0, 50) + "...",
            deviceInfo: sub.deviceInfo?.userAgent?.substring(0, 50) + "...",
            timestamp: sub.deviceInfo?.timestamp,
          });
        });
      }

      if (ticketSubscriptions.length > 0) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "📤 [VALIDATE-PAYMENT] Enviando notificación a",
            ticketSubscriptions.length,
            "dispositivos",
          );
        }

        const notificationResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/send-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "payment_validated",
              ticketCode: pago.codigoTicket,
              userType: "user",
              data: {
                amount: pago.montoPagado,
                plate: car?.placa || "N/A",
                subscriptions: ticketSubscriptions.map((sub) => sub.subscription),
              },
            }),
          },
        );

        if (!notificationResponse.ok) {
          const errorText = await notificationResponse.text();
          console.error(
            "❌ [VALIDATE-PAYMENT] Error en notificación:",
            notificationResponse.status,
            errorText,
          );
          throw new Error(`Notification failed with status ${notificationResponse.status}: ${errorText}`);
        }

        if (process.env.NODE_ENV === "development") {
          const notificationResult = await notificationResponse.text();
          console.log("📬 [VALIDATE-PAYMENT] Respuesta de notificación:", {
            status: notificationResponse.status,
            ok: notificationResponse.ok,
            result: notificationResult,
          });
        }
      } else {
        if (process.env.NODE_ENV === "development") {
          console.log("⚠️ [VALIDATE-PAYMENT] No hay suscripciones activas para este ticket");
        }
      }
    } catch (notificationError) {
      console.error("❌ [VALIDATE-PAYMENT] Error sending notification:", notificationError);
      // Log the error but don't fail the payment validation
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ [VALIDATE-PAYMENT] Pago validado exitosamente:", pago.codigoTicket);
    }

    return NextResponse.json({
      success: true,
      message: "Pago validado correctamente",
    });
  } catch (error) {
    console.error("❌ [VALIDATE-PAYMENT] Error validating payment:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}