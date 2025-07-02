import clientPromise from "./mongodb"
import { calculateParkingFee } from "./utils"
import type { Ticket } from "./types"

export async function getTicketDetails(code: string): Promise<Ticket | null> {
  const client = await clientPromise
  const db = client.db("parking")

  const ticket = await db.collection("tickets").findOne({
    codigoTicket: code,
    estado: "activo",
  })

  if (!ticket) {
    return null
  }

  // Calculate the fee based on entry time
  const entryTime = new Date(ticket.horaEntrada)
  const fee = calculateParkingFee(entryTime)

  return {
    _id: ticket._id.toString(),
    codigoTicket: ticket.codigoTicket,
    horaEntrada: ticket.horaEntrada,
    horaSalida: ticket.horaSalida,
    estado: ticket.estado,
    montoCalculado: fee,
    ultimoPagoId: ticket.ultimoPagoId ? ticket.ultimoPagoId.toString() : null,
  }
}

export async function createPayment(paymentData: any) {
  const client = await clientPromise
  const db = client.db("parking")

  // Start a session for the transaction
  const session = client.startSession()

  try {
    session.startTransaction()

    // Find the ticket
    const ticket = await db.collection("tickets").findOne(
      {
        codigoTicket: paymentData.codigoTicket,
        estado: "activo",
      },
      { session },
    )

    if (!ticket) {
      throw new Error("Ticket no encontrado o ya ha sido pagado")
    }

    // Create payment record
    const payment = {
      ticketId: ticket._id,
      codigoTicket: paymentData.codigoTicket,
      referenciaTransferencia: paymentData.referenciaTransferencia,
      banco: paymentData.banco,
      telefono: paymentData.telefono,
      numeroIdentidad: paymentData.numeroIdentidad,
      montoPagado: paymentData.montoPagado,
      fechaPago: new Date(),
      estadoValidacion: "pendiente",
    }

    const paymentResult = await db.collection("pagos").insertOne(payment, { session })

    // Update ticket status
    await db.collection("tickets").updateOne(
      { _id: ticket._id },
      {
        $set: {
          estado: "pagado_pendiente",
          ultimoPagoId: paymentResult.insertedId,
          montoCalculado: paymentData.montoPagado,
        },
      },
      { session },
    )

    // Commit the transaction
    await session.commitTransaction()

    return { success: true, paymentId: paymentResult.insertedId }
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction()
    throw error
  } finally {
    await session.endSession()
  }
}
