import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get("access_token")

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { codigoTicket, montoPagado, carInfo } = body

    if (!codigoTicket || !montoPagado) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Find the ticket
    const ticket = await prisma.ticket.findUnique({
      where: {
        codigo: codigoTicket,
      },
    })

    if (!ticket) {
      return NextResponse.json({ message: "Ticket not found" }, { status: 404 })
    }

    // Check if the ticket is already paid
    if (ticket.pagado) {
      return NextResponse.json({ message: "Ticket already paid" }, { status: 400 })
    }

    // Update the ticket to mark it as paid
    await prisma.ticket.update({
      where: {
        codigo: codigoTicket,
      },
      data: {
        pagado: true,
        montoPagado,
      },
    })

    // Send notification to admin about new payment
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "admin_payment",
          ticketCode: codigoTicket,
          userType: "admin",
          data: {
            amount: montoPagado,
            plate: carInfo?.placa || "N/A",
          },
        }),
      })
    } catch (notificationError) {
      console.error("Error sending admin payment notification:", notificationError)
      // Don't fail the payment if notification fails
    }

    return NextResponse.json({ message: "Payment processed successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error processing payment:", error)
    return NextResponse.json({ message: "Error processing payment" }, { status: 500 })
  }
}
