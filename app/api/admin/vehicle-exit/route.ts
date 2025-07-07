import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
export const revalidate = 0

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Iniciando proceso de salida de vehículo...")
    }

    const client = await clientPromise
    const db = client.db("parking")

    // Parse request body
    let body
    try {
      body = await request.json()
      if (process.env.NODE_ENV === "development") {
        console.log("📥 Datos recibidos para salida:", body)
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Error parsing JSON:", error)
      }
      return NextResponse.json({ message: "Formato JSON inválido" }, { status: 400 })
    }

    const { ticketCode } = body

    // Validate required fields
    if (!ticketCode) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Código de ticket requerido")
      }
      return NextResponse.json({ message: "Código de ticket requerido" }, { status: 400 })
    }

    if (process.env.NODE_ENV === "development") {
      console.log("🔍 Validando campos requeridos:")
      console.log("- ticketCode:", ticketCode)
    }

    // Find ticket
    if (process.env.NODE_ENV === "development") {
      console.log("🎫 Buscando ticket:", ticketCode)
    }

    const ticket = await db.collection("tickets").findOne({ codigoTicket: ticketCode })
    if (!ticket) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Ticket no encontrado:", ticketCode)
      }
      return NextResponse.json({ message: "Ticket no encontrado" }, { status: 404 })
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Ticket encontrado:", {
        codigo: ticket.codigoTicket,
        estado: ticket.estado,
        montoCalculado: ticket.montoCalculado,
      })
    }

    if (ticket.estado !== "pagado_validado") {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Estado de ticket inválido:", ticket.estado)
      }
      return NextResponse.json(
        { message: "El ticket debe estar pagado y validado para permitir la salida" },
        { status: 400 },
      )
    }

    // Find car
    if (process.env.NODE_ENV === "development") {
      console.log("🚗 Buscando vehículo asociado al ticket:", ticketCode)
    }

    const car = await db.collection("cars").findOne({ ticketAsociado: ticketCode })
    if (!car) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Vehículo no encontrado para ticket:", ticketCode)
      }
      return NextResponse.json({ message: "Vehículo no encontrado" }, { status: 404 })
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Vehículo encontrado:", {
        placa: car.placa,
        marca: car.marca,
        modelo: car.modelo,
        horaIngreso: car.horaIngreso,
      })
    }

    const now = new Date()
    const horaIngreso = new Date(car.horaIngreso)
    const duracionMinutos = Math.floor((now.getTime() - horaIngreso.getTime()) / (1000 * 60))

    if (process.env.NODE_ENV === "development") {
      console.log("⏱️ Cálculos de tiempo:")
      console.log("- Hora ingreso:", horaIngreso.toISOString())
      console.log("- Hora salida:", now.toISOString())
      console.log("- Duración (minutos):", duracionMinutos)
    }

    // Get payment info
    if (process.env.NODE_ENV === "development") {
      console.log("💰 Buscando información de pago para ticket:", ticketCode)
    }

    const pago = await db.collection("pagos").findOne({
      codigoTicket: ticketCode,
      estadoValidacion: "validado",
    })

    if (process.env.NODE_ENV === "development") {
      if (pago) {
        console.log("✅ Pago encontrado:", {
          id: pago._id,
          monto: pago.montoPagado,
          tipoPago: pago.tipoPago,
          fechaPago: pago.fechaPago,
        })
      } else {
        console.log("⚠️ No se encontró pago validado para el ticket")
      }
    }

    // Update ticket to completed
    if (process.env.NODE_ENV === "development") {
      console.log("🎫 Actualizando estado del ticket a 'salido'")
    }

    const ticketUpdateResult = await db.collection("tickets").updateOne(
      { codigoTicket: ticketCode },
      {
        $set: {
          estado: "salido",
          horaSalida: now,
          duracionMinutos: duracionMinutos,
        },
      },
    )

    if (process.env.NODE_ENV === "development") {
      console.log("💾 Ticket actualizado - Documentos modificados:", ticketUpdateResult.modifiedCount)
    }

    // Archive car data and remove from active cars
    const carId = car._id.toString()

    if (process.env.NODE_ENV === "development") {
      console.log("📚 Actualizando historial del carro:", carId)
    }

    // Final update to car_history with complete information
    const historyUpdateResult = await db.collection("car_history").updateOne(
      { carId },
      {
        $push: {
          eventos: {
            tipo: "salida_vehiculo",
            fecha: now,
            estado: "finalizado",
            datos: {
              duracionTotal: duracionMinutos,
              montoTotal: pago?.montoPagado || 0,
              horaSalida: now,
              autorizadoPor: "admin",
            },
          },
        },
        $set: {
          estadoActual: "finalizado",
          activo: false,
          completado: true,
          fechaSalida: now,
          fechaUltimaActualizacion: now,
          duracionTotalMinutos: duracionMinutos,

          // Preserve all final data
          datosFinales: {
            horaSalida: now,
            duracionMinutos: duracionMinutos,
            montoTotalPagado: pago?.montoPagado || 0,
            estadoFinal: "completado_exitosamente",
          },

          // Complete ticket data
          ticketDataFinal: {
            ...ticket,
            horaSalida: now,
            duracionMinutos: duracionMinutos,
            estadoFinal: "salido",
          },

          // Complete payment data if exists
          ...(pago && {
            pagoDataFinal: {
              ...pago,
              fechaSalida: now,
              duracionFacturada: duracionMinutos,
            },
          }),
        },
      },
    )

    if (process.env.NODE_ENV === "development") {
      console.log("📚 Historial actualizado - Documentos modificados:", historyUpdateResult.modifiedCount)
    }

    // Remove car from active collection (archive it)
    if (process.env.NODE_ENV === "development") {
      console.log("🗑️ Eliminando vehículo de la colección activa")
    }

    const carDeleteResult = await db.collection("cars").deleteOne({ _id: car._id })

    if (process.env.NODE_ENV === "development") {
      console.log("🗑️ Vehículo eliminado - Documentos eliminados:", carDeleteResult.deletedCount)
    }

    // Reset ticket for reuse
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Reseteando ticket para reutilización")
    }

    const ticketResetResult = await db.collection("tickets").updateOne(
      { codigoTicket: ticketCode },
      {
        $set: {
          estado: "disponible",
          horaOcupacion: null,
          horaSalida: null,
          ultimoPagoId: null,
        },
        $unset: {
          tipoPago: "",
          tiempoSalida: "",
          tiempoSalidaEstimado: "",
          montoPendiente: "",
        },
      },
    )

    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Ticket reseteado - Documentos modificados:", ticketResetResult.modifiedCount)
    }

    // Send final notifications to both user and admin about vehicle delivery
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("🔔 [VEHICLE-EXIT] Enviando notificaciones finales de entrega...")
      }

      // Notification to user
      const userNotificationResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/send-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "vehicle_delivered",
            ticketCode: ticketCode,
            userType: "user",
            data: {
              plate: car.placa || "N/A",
              duration: duracionMinutos,
              amount: pago?.montoPagado || 0,
            },
          }),
        },
      )

      // Notification to admin
      const adminNotificationResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/send-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "vehicle_delivered",
            ticketCode: ticketCode,
            userType: "admin",
            data: {
              plate: car.placa || "N/A",
              duration: duracionMinutos,
              amount: pago?.montoPagado || 0,
            },
          }),
        },
      )

      if (process.env.NODE_ENV === "development") {
        console.log("📡 [VEHICLE-EXIT] Respuestas de notificaciones:", {
          user: { status: userNotificationResponse.status, ok: userNotificationResponse.ok },
          admin: { status: adminNotificationResponse.status, ok: adminNotificationResponse.ok },
        })
      }

      if (userNotificationResponse.ok && adminNotificationResponse.ok) {
        console.log("✅ [VEHICLE-EXIT] Notificaciones finales enviadas exitosamente")
      }
    } catch (notificationError) {
      console.error("❌ [VEHICLE-EXIT] Error sending final notifications:", notificationError)
      // Don't fail the exit if notification fails
    }

    const processingTime = Date.now() - startTime

    if (process.env.NODE_ENV === "development") {
      console.log(`🎉 Salida de vehículo completada exitosamente en ${processingTime}ms`)
      console.log(`✅ Ticket ${ticketCode} liberado, duración: ${duracionMinutos} minutos`)
    }

    const response = NextResponse.json({
      message: "Salida registrada exitosamente",
      ticketCode,
      duracionMinutos,
      montoTotal: pago?.montoPagado || 0,
      carInfo: {
        placa: car.placa,
        marca: car.marca,
        modelo: car.modelo,
        propietario: car.nombreDueño,
      },
    })

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
    response.headers.set("Surrogate-Control", "no-store")

    return response
  } catch (error) {
    const processingTime = Date.now() - startTime

    if (process.env.NODE_ENV === "development") {
      console.error(`❌ Error procesando salida de vehículo después de ${processingTime}ms:`, error)
      console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace available")
    }

    return NextResponse.json(
      {
        message: "Error al procesar la salida del vehículo",
        ...(process.env.NODE_ENV === "development" && {
          error: error instanceof Error ? error.message : "Unknown error",
          processingTime,
        }),
      },
      { status: 500 },
    )
  }
}
