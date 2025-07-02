import { type NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const uri = process.env.MONGODB_URI!
const client = new MongoClient(uri)

export async function POST(request: NextRequest) {
  try {
    const { pagoId } = await request.json()

    if (!pagoId) {
      return NextResponse.json({ error: "ID de pago requerido" }, { status: 400 })
    }

    await client.connect()
    const db = client.db("parking")

    // Buscar el pago
    const pago = await db.collection("pagos").findOne({ _id: new ObjectId(pagoId) })

    if (!pago) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
    }

    const now = new Date()

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
    )

    // Actualizar el ticket
    await db.collection("tickets").updateOne(
      { codigoTicket: pago.codigoTicket },
      {
        $set: {
          estado: "pagado_validado",
          fechaValidacionPago: now,
        },
      },
    )

    // Get car info for notification
    const car = await db.collection("cars").findOne({ ticketAsociado: pago.codigoTicket })

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
    }

    await db.collection("car_history").updateOne({ ticketAsociado: pago.codigoTicket }, carHistoryUpdate)

    // Send notification to user
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/send-notification`, {
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
          },
        }),
      })
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError)
      // Don't fail the payment validation if notification fails
    }

    return NextResponse.json({
      success: true,
      message: "Pago validado correctamente",
    })
  } catch (error) {
    console.error("Error validating payment:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  } finally {
    await client.close()
  }
}
