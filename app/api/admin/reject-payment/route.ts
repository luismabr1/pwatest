import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
export const revalidate = 0

export async function PUT(request: Request) {
  const startTime = Date.now()

  try {
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Iniciando rechazo de pago...")
    }

    const client = await clientPromise
    const db = client.db("parking")

    let requestBody
    try {
      requestBody = await request.json()
      if (process.env.NODE_ENV === "development") {
        console.log("📥 Datos recibidos para rechazo:", JSON.stringify(requestBody, null, 2))
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Error parsing JSON:", error)
      }
      return NextResponse.json({ message: "Datos JSON inválidos" }, { status: 400 })
    }

    const {
      paymentId,
      razonRechazo,
      montoAceptado,
      pagoMixto = false,
      efectivoRecibido = 0,
      electronicoRecibido = 0,
    } = requestBody

    if (process.env.NODE_ENV === "development") {
      console.log("🔍 Validando parámetros de rechazo...")
      console.log("- paymentId:", paymentId)
      console.log("- razonRechazo:", razonRechazo)
      console.log("- montoAceptado:", montoAceptado)
      console.log("- pagoMixto:", pagoMixto)
      console.log("- efectivoRecibido:", efectivoRecibido)
      console.log("- electronicoRecibido:", electronicoRecibido)
    }

    if (!paymentId) {
      const errorMsg = "ID de pago requerido"
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Validación fallida: paymentId faltante")
      }
      return NextResponse.json({ message: errorMsg }, { status: 400 })
    }

    // Buscar el pago
    if (process.env.NODE_ENV === "development") {
      console.log("💰 Buscando pago con ID:", paymentId)
    }

    const payment = await db.collection("pagos").findOne({ _id: new ObjectId(paymentId) })

    if (!payment) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Pago no encontrado:", paymentId)
      }
      return NextResponse.json({ message: "Pago no encontrado" }, { status: 404 })
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Pago encontrado:", {
        id: payment._id,
        codigoTicket: payment.codigoTicket,
        estado: payment.estado,
        tipoPago: payment.tipoPago,
        montoPagado: payment.montoPagado,
        montoCalculado: payment.montoCalculado,
      })
    }

    if (payment.estado === "rechazado" || payment.estadoValidacion === "rechazado") {
      const errorMsg = "Este pago ya ha sido rechazado"
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Pago ya rechazado:", payment.estadoValidacion)
      }
      return NextResponse.json({ message: errorMsg }, { status: 400 })
    }

    const now = new Date()
    const montoCalculado = payment.montoCalculado || 0
    const montoPagado = payment.montoPagado || 0

    // Calcular montos para pago mixto o normal
    let montoTotalAceptado = 0
    let diferenciaPendiente = 0
    let sobrepago = 0
    let esPagoMixto = false

    if (pagoMixto) {
      // Manejo de pago mixto (efectivo + electrónico)
      montoTotalAceptado = Number(efectivoRecibido) + Number(electronicoRecibido)
      esPagoMixto = true

      if (process.env.NODE_ENV === "development") {
        console.log("💰 Procesando pago mixto:")
        console.log("- Efectivo recibido:", efectivoRecibido)
        console.log("- Electrónico recibido:", electronicoRecibido)
        console.log("- Total aceptado:", montoTotalAceptado)
        console.log("- Monto calculado:", montoCalculado)
      }
    } else {
      // Manejo de pago normal
      montoTotalAceptado = Number(montoAceptado) || 0

      if (process.env.NODE_ENV === "development") {
        console.log("💰 Procesando rechazo normal:")
        console.log("- Monto aceptado:", montoTotalAceptado)
        console.log("- Monto original:", montoPagado)
        console.log("- Monto calculado:", montoCalculado)
      }
    }

    // Calcular diferencias
    diferenciaPendiente = Math.max(0, montoCalculado - montoTotalAceptado)
    sobrepago = Math.max(0, montoTotalAceptado - montoCalculado)

    if (process.env.NODE_ENV === "development") {
      console.log("📊 Cálculos finales:")
      console.log("- Diferencia pendiente:", diferenciaPendiente)
      console.log("- Sobrepago:", sobrepago)
      console.log("- Es pago exacto:", diferenciaPendiente === 0 && sobrepago === 0)
    }

    // Actualizar el pago como rechazado
    if (process.env.NODE_ENV === "development") {
      console.log("❌ Rechazando pago...")
    }

    const updateResult = await db.collection("pagos").updateOne(
      { _id: new ObjectId(paymentId) },
      {
        $set: {
          estado: "rechazado",
          estadoValidacion: "rechazado",
          fechaValidacion: now,
          razonRechazo: razonRechazo || "Pago rechazado por administrador",
          montoAceptado: montoTotalAceptado,
          diferenciaPendiente: diferenciaPendiente,
          sobrepago: sobrepago,
          pagoMixto: esPagoMixto,
          ...(esPagoMixto && {
            efectivoRecibido: Number(efectivoRecibido),
            electronicoRecibido: Number(electronicoRecibido),
          }),
        },
      },
    )

    if (process.env.NODE_ENV === "development") {
      console.log("💾 Pago rechazado - Documentos modificados:", updateResult.modifiedCount)
    }

    // Determinar nuevo estado del ticket
    let nuevoEstadoTicket = "estacionado_confirmado" // Por defecto, permite nuevo pago

    if (diferenciaPendiente === 0 && sobrepago === 0 && montoTotalAceptado > 0) {
      // Si el monto aceptado es exacto, marcar como pagado
      nuevoEstadoTicket = "pagado_validado"
    }

    // Actualizar el ticket
    if (process.env.NODE_ENV === "development") {
      console.log("🎫 Actualizando ticket a estado:", nuevoEstadoTicket)
    }

    await db.collection("tickets").updateOne(
      { codigoTicket: payment.codigoTicket },
      {
        $set: {
          estado: nuevoEstadoTicket,
          ...(diferenciaPendiente > 0 && { montoPendiente: diferenciaPendiente }),
        },
      },
    )

    // Buscar y actualizar el carro
    if (process.env.NODE_ENV === "development") {
      console.log("🚗 Buscando carro asociado al ticket...")
    }

    const car = await db.collection("cars").findOne({
      ticketAsociado: payment.codigoTicket,
      estado: {
        $in: ["estacionado_confirmado", "pago_pendiente", "pago_pendiente_taquilla", "pago_pendiente_validacion"],
      },
    })

    if (car) {
      const nuevoEstadoCarro = nuevoEstadoTicket === "pagado_validado" ? "pagado" : "estacionado_confirmado"

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Carro encontrado:", {
          id: car._id,
          placa: car.placa,
          estadoActual: car.estado,
          nuevoEstado: nuevoEstadoCarro,
        })
      }

      await db.collection("cars").updateOne({ _id: car._id }, { $set: { estado: nuevoEstadoCarro } })

      // Actualizar car_history con detalles del rechazo
      const carId = car._id.toString()

      if (process.env.NODE_ENV === "development") {
        console.log("📚 Actualizando historial del carro con rechazo...")
      }

      const historyUpdate: any = {
        $push: {
          eventos: {
            tipo: "pago_rechazado",
            fecha: now,
            estado: nuevoEstadoCarro,
            datos: {
              pagoId: paymentId,
              validadoPor: "admin",
              razonRechazo: razonRechazo || "Pago rechazado por administrador",
              montoPagado: montoPagado,
              montoAceptado: montoTotalAceptado,
              diferenciaPendiente: diferenciaPendiente,
              sobrepago: sobrepago,
              pagoMixto: esPagoMixto,
              ...(esPagoMixto && {
                efectivoRecibido: Number(efectivoRecibido),
                electronicoRecibido: Number(electronicoRecibido),
              }),
            },
          },
          pagosRechazados: {
            pagoId: paymentId,
            fecha: payment.fechaPago,
            fechaRechazo: now,
            monto: montoPagado,
            montoUsd: payment.montoPagadoUsd || 0,
            tipoPago: payment.tipoPago,
            estado: "rechazado",
            referencia: payment.referenciaTransferencia || "",
            banco: payment.banco || "",
            razonRechazo: razonRechazo || "Pago rechazado por administrador",
            montoAceptado: montoTotalAceptado,
            sobrepago: sobrepago,
            pagoMixto: esPagoMixto,
          },
        },
        $set: {
          estadoActual: nuevoEstadoCarro,
          fechaUltimaActualizacion: now,
        },
      }

      // Agregar monto pendiente si hay diferencia
      if (diferenciaPendiente > 0) {
        historyUpdate.$push.montosPendientes = {
          monto: diferenciaPendiente,
          fecha: now,
          razon: `Diferencia por pago rechazado - ${razonRechazo || "Monto insuficiente"}`,
          pagoRechazadoId: paymentId,
          pagoMixto: esPagoMixto,
        }
      }

      // Agregar monto aceptado al total si hay alguno
      if (montoTotalAceptado > 0) {
        historyUpdate.$inc = {
          montoTotalPagado: montoTotalAceptado,
        }
      }

      const historyUpdateResult = await db.collection("car_history").updateOne({ carId }, historyUpdate)

      if (process.env.NODE_ENV === "development") {
        console.log("📚 Historial actualizado - Documentos modificados:", historyUpdateResult.modifiedCount)
      }
    } else if (process.env.NODE_ENV === "development") {
      console.warn("⚠️ No se encontró carro asociado al ticket:", payment.codigoTicket)
    }

    // Send notification to user about rejection
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "payment_rejected",
          ticketCode: payment.codigoTicket,
          userType: "user",
          data: {
            reason: razonRechazo || "Pago rechazado por administrador",
            plate: car?.placa || "N/A",
          },
        }),
      })
    } catch (notificationError) {
      console.error("Error sending rejection notification:", notificationError)
      // Don't fail the rejection if notification fails
    }

    const processingTime = Date.now() - startTime

    // Preparar mensaje de respuesta
    let message = "Pago rechazado exitosamente."
    if (diferenciaPendiente > 0) {
      message += ` El cliente debe pagar ${diferenciaPendiente.toFixed(2)} Bs adicionales.`
    }
    if (sobrepago > 0) {
      message += ` Sobrepago de ${sobrepago.toFixed(2)} Bs registrado para consulta futura.`
    }
    if (esPagoMixto) {
      message += ` Pago mixto procesado: ${efectivoRecibido} Bs efectivo + ${electronicoRecibido} Bs electrónico.`
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`🎉 Pago rechazado exitosamente en ${processingTime}ms`)
      console.log("📊 Resumen de rechazo:", {
        pagoId: paymentId,
        codigoTicket: payment.codigoTicket,
        montoPagado: montoPagado,
        montoAceptado: montoTotalAceptado,
        diferenciaPendiente: diferenciaPendiente,
        sobrepago: sobrepago,
        pagoMixto: esPagoMixto,
        requiereNuevoPago: diferenciaPendiente > 0,
      })
    }

    const response = NextResponse.json({
      message,
      diferenciaPendiente: diferenciaPendiente,
      sobrepago: sobrepago,
      requiereNuevoPago: diferenciaPendiente > 0,
      pagoMixto: esPagoMixto,
      montoTotalAceptado: montoTotalAceptado,
    })

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
    response.headers.set("Surrogate-Control", "no-store")

    return response
  } catch (error) {
    const processingTime = Date.now() - startTime

    if (process.env.NODE_ENV === "development") {
      console.error(`❌ Error rechazando pago después de ${processingTime}ms:`, error)
      console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace available")
    }

    return NextResponse.json(
      {
        message: "Error al rechazar el pago",
        ...(process.env.NODE_ENV === "development" && {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 },
    )
  }
}
