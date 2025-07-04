import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { pushNotificationService } from "@/lib/push-notifications"

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
export const revalidate = 0

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { paymentId, validadoPor, observaciones } = await request.json()

    if (!paymentId || !validadoPor || !observaciones) {
      return NextResponse.json({ error: "ID de pago, validador y razón del rechazo son requeridos" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("parking")

    // Start transaction
    const session = client.startSession()

    try {
      await session.withTransaction(async () => {
        // Update payment status
        const paymentResult = await db.collection("pagos").findOneAndUpdate(
          { _id: new ObjectId(paymentId) },
          {
            $set: {
              estadoValidacion: "rechazado",
              fechaValidacion: new Date(),
              validadoPor,
              observaciones,
            },
          },
          {
            returnDocument: "after",
            session,
          },
        )

        if (!paymentResult) {
          throw new Error("Pago no encontrado")
        }

        const payment = paymentResult

        // Update ticket status back to active
        await db.collection("tickets").updateOne(
          { codigoTicket: payment.codigoTicket },
          {
            $set: {
              estado: "activo",
              fechaRechazo: new Date(),
            },
            $unset: {
              ultimoPagoId: "",
            },
          },
          { session },
        )

        // Get ticket info for notifications
        const ticket = await db.collection("tickets").findOne({ codigoTicket: payment.codigoTicket }, { session })

        // Send notification to user who made the payment
        try {
          // Get subscriptions for this specific ticket
          const ticketSubscriptions = await db
            .collection("ticket_subscriptions")
            .find({
              ticketCode: payment.codigoTicket,
              isActive: true,
            })
            .toArray()

          if (ticketSubscriptions.length > 0) {
            const subscriptions = ticketSubscriptions.map((sub) => sub.subscription)

            const notification = pushNotificationService.createPaymentRejectedNotification(
              payment.codigoTicket,
              observaciones,
            )

            await pushNotificationService.sendToMultipleSubscriptions(subscriptions, notification)

            console.log(`❌ Notificación de pago rechazado enviada para ticket ${payment.codigoTicket}`)
          }
        } catch (notificationError) {
          console.error("Error enviando notificación de rechazo:", notificationError)
          // Don't fail the transaction for notification errors
        }

        // Add to car history
        if (ticket?.carInfo?.placa) {
          await db.collection("car_history").insertOne(
            {
              placa: ticket.carInfo.placa,
              ticketId: ticket._id,
              codigoTicket: payment.codigoTicket,
              evento: "pago_rechazado",
              fecha: new Date(),
              detalles: {
                usuario: validadoPor,
                monto: payment.montoPagado || payment.monto,
                metodoPago: payment.metodoPago || payment.tipoPago,
                numeroReferencia: payment.referenciaTransferencia,
                observaciones,
              },
            },
            { session },
          )
        }
      })

      const processingTime = Date.now() - startTime

      console.log(`🎉 Pago rechazado exitosamente en ${processingTime}ms`)

      return NextResponse.json({
        success: true,
        message: "Pago rechazado exitosamente",
      })
    } finally {
      await session.endSession()
    }
  } catch (error) {
    const processingTime = Date.now() - startTime

    console.error(`❌ Error rechazando pago después de ${processingTime}ms:`, error)
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace available")

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 },
    )
  }
}
