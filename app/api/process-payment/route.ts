import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { v2 as cloudinary } from "cloudinary"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Opt out of caching for this route
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
export const revalidate = 0

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

async function uploadImageToCloudinary(base64Image: string, ticketCode: string): Promise<string> {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log("📤 Subiendo imagen a Cloudinary para ticket:", ticketCode)
    }

    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      folder: "parking/comprobantes",
      public_id: `comprobante_${ticketCode}_${Date.now()}`,
      resource_type: "image",
      format: "jpg",
      quality: "auto:good",
      transformation: [{ width: 800, height: 600, crop: "limit" }, { quality: "auto:good" }, { fetch_format: "auto" }],
    })

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Imagen subida exitosamente:", uploadResponse.secure_url)
    }

    return uploadResponse.secure_url
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("❌ Error subiendo imagen a Cloudinary:", error)
    }
    throw new Error("Error al subir la imagen del comprobante")
  }
}

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Iniciando proceso de pago...")
    }

    const client = await clientPromise
    const db = client.db("parking")

    let requestBody
    try {
      requestBody = await request.json()
      if (process.env.NODE_ENV === "development") {
        console.log("📥 Datos recibidos:", {
          codigoTicket: requestBody.codigoTicket,
          tipoPago: requestBody.tipoPago,
          montoPagado: requestBody.montoPagado,
          tiempoSalida: requestBody.tiempoSalida,
          tieneImagen: !!requestBody.imagenComprobante,
        })
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Error parsing JSON:", error)
      }
      return NextResponse.json({ message: "Datos JSON inválidos" }, { status: 400 })
    }

    const {
      codigoTicket,
      tipoPago,
      referenciaTransferencia,
      banco,
      telefono,
      numeroIdentidad,
      montoPagado,
      tiempoSalida,
      imagenComprobante,
    } = requestBody

    // Validación detallada de campos requeridos
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 Validando campos requeridos...")
      console.log("- codigoTicket:", codigoTicket)
      console.log("- tipoPago:", tipoPago)
      console.log("- montoPagado:", montoPagado)
      console.log("- tiempoSalida:", tiempoSalida)
      console.log("- imagenComprobante:", imagenComprobante ? "Sí" : "No")
    }

    if (!codigoTicket || !tipoPago || montoPagado === undefined || montoPagado <= 0) {
      const errorMsg = "Código de ticket, tipo de pago y monto válido son requeridos"
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Validación fallida:", {
          codigoTicket: !!codigoTicket,
          tipoPago: !!tipoPago,
          montoPagado: montoPagado,
          montoPagadoValid: montoPagado > 0,
        })
      }
      return NextResponse.json({ message: errorMsg }, { status: 400 })
    }

    // Validación específica para pagos electrónicos
    if (tipoPago === "pago_movil" || tipoPago === "transferencia") {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 Validando campos para pago electrónico...")
        console.log("- referenciaTransferencia:", referenciaTransferencia?.trim())
        console.log("- banco:", banco?.trim())
        console.log("- telefono:", telefono?.trim())
        console.log("- numeroIdentidad:", numeroIdentidad?.trim())
      }

      if (!referenciaTransferencia?.trim() || !banco?.trim() || !telefono?.trim() || !numeroIdentidad?.trim()) {
        const errorMsg = "Todos los campos son requeridos y no pueden estar vacíos para pagos electrónicos"
        if (process.env.NODE_ENV === "development") {
          console.error("❌ Validación de pago electrónico fallida:", {
            referenciaTransferencia: !!referenciaTransferencia?.trim(),
            banco: !!banco?.trim(),
            telefono: !!telefono?.trim(),
            numeroIdentidad: !!numeroIdentidad?.trim(),
          })
        }
        return NextResponse.json({ message: errorMsg }, { status: 400 })
      }
    }

    // Buscar ticket
    if (process.env.NODE_ENV === "development") {
      console.log("🎫 Buscando ticket:", codigoTicket)
    }

    const ticket = await db.collection("tickets").findOne({ codigoTicket })

    if (!ticket) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Ticket no encontrado:", codigoTicket)
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

    // Validar estado del ticket - Estados válidos para pago
    const estadosValidosParaPago = ["activo", "ocupado", "estacionado", "estacionado_confirmado"]

    if (!estadosValidosParaPago.includes(ticket.estado)) {
      let errorMsg = "Este ticket no está disponible para pago"

      if (ticket.estado === "pagado_pendiente_validacion" || ticket.estado === "pagado_pendiente_taquilla") {
        errorMsg = "Este ticket ya tiene un pago pendiente de validación"
      } else if (ticket.estado === "pagado_validado") {
        errorMsg = "Este ticket ya ha sido pagado y validado"
      } else if (ticket.estado === "salido") {
        errorMsg = "Este ticket ya ha sido utilizado para salir del estacionamiento"
      } else if (ticket.estado === "disponible") {
        errorMsg = "Este ticket no tiene un vehículo asignado"
      }

      if (process.env.NODE_ENV === "development") {
        console.error("❌ Estado de ticket inválido:", {
          estado: ticket.estado,
          estadosValidos: estadosValidosParaPago,
          mensaje: errorMsg,
        })
      }
      return NextResponse.json({ message: errorMsg }, { status: 400 })
    }

    const now = new Date()

    // Calcular tiempo de salida estimado
    let tiempoSalidaEstimado = now
    if (tiempoSalida && tiempoSalida !== "now") {
      const minutesToAdd =
        {
          "5min": 5,
          "10min": 10,
          "15min": 15,
          "20min": 20,
          "30min": 30,
          "45min": 45,
          "60min": 60,
        }[tiempoSalida] || 0

      if (minutesToAdd > 0) {
        tiempoSalidaEstimado = new Date(Date.now() + minutesToAdd * 60000)
        if (process.env.NODE_ENV === "development") {
          console.log("⏰ Tiempo de salida estimado:", tiempoSalidaEstimado)
        }
      }
    }

    // Obtener configuración de la empresa
    if (process.env.NODE_ENV === "development") {
      console.log("⚙️ Obteniendo configuración de empresa...")
    }

    const companySettings = await db.collection("company_settings").findOne({})
    const precioHora = companySettings?.tarifas?.precioHora || 3
    const tasaCambio = companySettings?.tarifas?.tasaCambio || 35

    if (process.env.NODE_ENV === "development") {
      console.log("💱 Configuración encontrada:", {
        precioHora,
        tasaCambio,
      })
    }

    let montoEnBs = 0
    let montoEnUsd = 0

    // Calcular montos según tipo de pago
    if (tipoPago === "efectivo_usd") {
      montoEnUsd = Number(montoPagado)
      montoEnBs = Number((montoEnUsd * tasaCambio).toFixed(2))
    } else if (tipoPago === "efectivo_bs") {
      montoEnBs = Number(montoPagado)
      montoEnUsd = Number((montoEnBs / tasaCambio).toFixed(6))
    } else if (tipoPago === "pago_movil" || tipoPago === "transferencia") {
      montoEnBs = Number(montoPagado)
      montoEnUsd = Number((montoEnBs / tasaCambio).toFixed(6))
    } else {
      const errorMsg = "Tipo de pago no válido"
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Tipo de pago inválido:", tipoPago)
      }
      return NextResponse.json({ message: errorMsg }, { status: 400 })
    }

    if (process.env.NODE_ENV === "development") {
      console.log("💰 Montos calculados:", {
        tipoPago,
        montoPagado,
        montoEnBs,
        montoEnUsd,
        tasaCambio,
      })
    }

    // Validar monto contra el calculado
    const montoCalculadoBs = (ticket.montoCalculado || 0) * tasaCambio
    const tolerance = 0.1

    if (process.env.NODE_ENV === "development") {
      console.log("🔍 Validando montos:", {
        montoEnBs,
        montoCalculadoBs,
        diferencia: Math.abs(montoEnBs - montoCalculadoBs),
        tolerance,
        esEfectivo: tipoPago.startsWith("efectivo"),
      })
    }

    if (
      Math.abs(montoEnBs - montoCalculadoBs) > tolerance &&
      !(tipoPago.startsWith("efectivo") && montoEnBs >= montoCalculadoBs - tolerance)
    ) {
      const errorMsg = `El monto pagado (${formatCurrency(montoEnBs, "VES")} Bs) no coincide con el monto calculado (${formatCurrency(montoCalculadoBs, "VES")} Bs). Por favor, verifique el monto e intente de nuevo.`
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Monto no coincide:", errorMsg)
      }
      return NextResponse.json({ message: errorMsg }, { status: 400 })
    }

    // Buscar carro asociado
    if (process.env.NODE_ENV === "development") {
      console.log("🚗 Buscando carro asociado al ticket...")
    }

    const car = await db.collection("cars").findOne({
      ticketAsociado: codigoTicket,
      estado: {
        $in: [
          "estacionado",
          "estacionado_confirmado",
          "pago_pendiente",
          "pago_pendiente_taquilla",
          "pago_pendiente_validacion",
        ],
      },
    })

    if (process.env.NODE_ENV === "development") {
      if (car) {
        console.log("✅ Carro encontrado:", {
          placa: car.placa,
          estado: car.estado,
          propietario: car.nombreDueño,
        })
      } else {
        console.log("⚠️ No se encontró carro asociado al ticket")
      }
    }

    // Subir imagen a Cloudinary si existe
    let urlImagenComprobante = null
    if (imagenComprobante) {
      try {
        urlImagenComprobante = await uploadImageToCloudinary(imagenComprobante, codigoTicket)
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("❌ Error subiendo imagen:", error)
        }
        return NextResponse.json(
          {
            message: "Error al subir la imagen del comprobante. Intente nuevamente.",
          },
          { status: 500 },
        )
      }
    }

    const pagoData = {
      ticketId: ticket._id.toString(),
      codigoTicket,
      tipoPago,
      referenciaTransferencia: referenciaTransferencia || null,
      banco: banco || null,
      telefono: telefono || null,
      numeroIdentidad: numeroIdentidad || null,
      montoPagado: montoEnBs,
      montoPagadoUsd: montoEnUsd,
      montoCalculado: ticket.montoCalculado || 0,
      tasaCambioUsada: tasaCambio,
      fechaPago: now,
      estado: "pendiente_validacion",
      estadoValidacion: "pendiente",
      tiempoSalida: tiempoSalida || "now",
      tiempoSalidaEstimado,
      carInfo: car
        ? {
            placa: car.placa,
            marca: car.marca,
            modelo: car.modelo,
            color: car.color,
            nombreDueño: car.nombreDueño,
            telefono: car.telefono,
          }
        : null,
      urlImagenComprobante: urlImagenComprobante,
    }

    if (process.env.NODE_ENV === "development") {
      console.log("💾 Guardando pago en base de datos...")
      console.log("📸 URL imagen comprobante:", urlImagenComprobante || "Sin imagen")
    }

    const pagoResult = await db.collection("pagos").insertOne(pagoData)

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Pago guardado con ID:", pagoResult.insertedId)
    }

    const nuevoEstadoTicket = tipoPago.startsWith("efectivo")
      ? "pagado_pendiente_taquilla"
      : "pagado_pendiente_validacion"

    // Actualizar ticket
    if (process.env.NODE_ENV === "development") {
      console.log("🎫 Actualizando estado del ticket a:", nuevoEstadoTicket)
    }

    await db.collection("tickets").updateOne(
      { codigoTicket },
      {
        $set: {
          estado: nuevoEstadoTicket,
          ultimoPagoId: pagoResult.insertedId.toString(),
          tipoPago,
          tiempoSalida: tiempoSalida || "now",
          tiempoSalidaEstimado,
          horaSalida: tiempoSalida === "now" ? now : undefined,
        },
      },
    )

    // Actualizar carro si existe
    if (car) {
      const nuevoEstadoCarro = tipoPago.startsWith("efectivo") ? "pago_pendiente_taquilla" : "pago_pendiente_validacion"

      if (process.env.NODE_ENV === "development") {
        console.log("🚗 Actualizando estado del carro a:", nuevoEstadoCarro)
      }

      await db.collection("cars").updateOne({ _id: car._id }, { $set: { estado: nuevoEstadoCarro } })
    }

    // Actualizar car_history
    const carId = car?._id.toString()
    if (carId) {
      if (process.env.NODE_ENV === "development") {
        console.log("📚 Actualizando historial del carro...")
      }

      const updateResult = await db.collection("car_history").updateOne(
        { carId },
        {
          $push: {
            eventos: {
              tipo: "pago_registrado",
              fecha: now,
              estado: tipoPago.startsWith("efectivo") ? "pago_pendiente_taquilla" : "pago_pendiente_validacion",
              datos: {
                tipoPago,
                montoPagado: montoEnBs,
                montoPagadoUsd: montoEnUsd,
                tasaCambio,
                tiempoSalida,
                tiempoSalidaEstimado,
                pagoId: pagoResult.insertedId.toString(),
                referenciaTransferencia,
                banco,
                telefono,
                numeroIdentidad,
                urlImagenComprobante: urlImagenComprobante,
              },
            },
          },
          $set: {
            estadoActual: tipoPago.startsWith("efectivo") ? "pago_pendiente_taquilla" : "pago_pendiente_validacion",
            fechaUltimaActualizacion: now,
            fechaPago: now,
            pagoData: pagoData,
            horaSalida: tiempoSalida === "now" ? now : undefined,
          },
        },
      )

      if (process.env.NODE_ENV === "development") {
        console.log(`✅ Historial actualizado - Documentos modificados: ${updateResult.modifiedCount}`)
      }
    } else if (process.env.NODE_ENV === "development") {
      console.warn(`⚠️ No se encontró carro para el ticket ${codigoTicket}, omitiendo actualización de historial`)
    }

    // Enviar notificación push a administradores
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("📱 Enviando notificación push a administradores...")
      }

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
            amount: montoEnBs,
            amountUsd: montoEnUsd,
            paymentType: tipoPago,
            plate: car?.placa || "N/A",
            requiresValidation: !tipoPago.startsWith("efectivo"),
            hasReceipt: !!urlImagenComprobante,
            exitTime: tiempoSalida || "now",
            reference: referenciaTransferencia || null,
            bank: banco || null,
          },
        }),
      })

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Notificación push enviada exitosamente")
      }
    } catch (notificationError) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Error enviando notificación push:", notificationError)
      }
      // No fallar el pago si la notificación falla
    }

    const processingTime = Date.now() - startTime

    if (process.env.NODE_ENV === "development") {
      console.log(`🎉 Pago procesado exitosamente en ${processingTime}ms`)
      console.log("📊 Resumen del pago:", {
        pagoId: pagoResult.insertedId,
        tipoPago,
        montoEnBs,
        montoEnUsd,
        requiresValidation: !tipoPago.startsWith("efectivo"),
        tiempoSalida: tiempoSalida || "now",
        tieneComprobante: !!urlImagenComprobante,
      })
    }

    const response = NextResponse.json({
      message: "Pago registrado exitosamente",
      pagoId: pagoResult.insertedId,
      tipoPago,
      montoEnBs,
      montoEnUsd,
      requiresValidation: !tipoPago.startsWith("efectivo"),
      tiempoSalida: tiempoSalida || "now",
      processingTime,
      urlImagenComprobante: urlImagenComprobante,
    })

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
    response.headers.set("Surrogate-Control", "no-store")

    return response
  } catch (error) {
    const processingTime = Date.now() - startTime

    if (process.env.NODE_ENV === "development") {
      console.error(`❌ Error procesando pago después de ${processingTime}ms:`, error)
      console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace available")
    }

    return NextResponse.json(
      {
        message: "Error al procesar el pago",
        ...(process.env.NODE_ENV === "development" && {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 },
    )
  }
}
