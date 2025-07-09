import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db("parking")
    const body = await request.json()

    console.log("🔍 [CONFIRM-PARKING] POST request received", body)

    // Check if this is a confirmation request (only ticketCode) or registration request (full data)
    const isConfirmationRequest = body.ticketCode && !body.placa && !body.ticketAsociado
    const isRegistrationRequest = body.ticketAsociado && (body.placa !== undefined || body.placa === "")

    console.log("🔍 [CONFIRM-PARKING] Request type analysis:")
    console.log("   isConfirmationRequest:", isConfirmationRequest)
    console.log("   isRegistrationRequest:", isRegistrationRequest)
    console.log("   Has ticketCode:", !!body.ticketCode)
    console.log("   Has placa:", body.placa !== undefined, "Value:", body.placa)
    console.log("   Has ticketAsociado:", !!body.ticketAsociado)

    if (isRegistrationRequest) {
      console.log("🔄 [CONFIRM-PARKING] ===== PROCESANDO REGISTRO =====")
      // REGISTRATION FLOW - creating/updating car record
      const { carId, placa, marca, modelo, color, nombreDueño, telefono, ticketAsociado } = body

      if (!ticketAsociado) {
        return NextResponse.json({ message: "Ticket asociado es requerido" }, { status: 400 })
      }

      const now = new Date()

      // Update or create car record
      let carRecord
      if (carId) {
        console.log("🔄 [CONFIRM-PARKING] Actualizando vehículo existente:", carId)
        // Update existing car
        const updateResult = await db.collection("cars").updateOne(
          { _id: new ObjectId(carId) },
          {
            $set: {
              placa,
              marca,
              modelo,
              color,
              nombreDueño,
              telefono,
              ticketAsociado,
              estado: "estacionado", // Changed from "ocupado" to "estacionado"
              fechaActualizacion: now,
            },
          },
        )
        console.log("🔍 DEBUG - Updated car:", updateResult)
        carRecord = { _id: carId, placa, marca, modelo, color, nombreDueño, telefono }
      } else {
        console.log("🔄 [CONFIRM-PARKING] Creando nuevo vehículo")
        // Create new car
        const newCar = {
          placa,
          marca,
          modelo,
          color,
          nombreDueño,
          telefono,
          ticketAsociado,
          horaIngreso: now,
          fechaRegistro: now,
          estado: "estacionado", // Changed from "ocupado" to "estacionado"
        }
        const insertResult = await db.collection("cars").insertOne(newCar)
        carRecord = { _id: insertResult.insertedId.toString(), ...newCar }
        console.log("🔍 DEBUG - Created new car:", insertResult.insertedId)
      }

      // Update ticket status
      const ticketUpdate = await db.collection("tickets").updateOne(
        { codigoTicket: ticketAsociado },
        {
          $set: {
            estado: "ocupado",
            horaOcupacion: now,
            carInfo: {
              placa,
              marca,
              modelo,
              color,
              nombreDueño,
              telefono,
            },
          },
        },
      )

      console.log("🔍 DEBUG - Updated tickets for ticket:", ticketAsociado, ticketUpdate)

      // 🔔 CREATE USER PLACEHOLDER SUBSCRIPTION FOR THIS TICKET
      console.log("🔔 [CONFIRM-PARKING] ===== INICIANDO CREACIÓN DE SUSCRIPCIÓN USER =====")
      try {
        console.log("🔔 [CONFIRM-PARKING] Creating user placeholder subscription for ticket:", ticketAsociado)

        // Check if user subscription already exists
        const existingUserSub = await db.collection("ticket_subscriptions").findOne({
          ticketCode: ticketAsociado,
          userType: "user",
        })

        console.log("🔍 [CONFIRM-PARKING] Existing user subscription:", existingUserSub ? "FOUND" : "NOT FOUND")

        if (!existingUserSub) {
          // Create a placeholder user subscription that will be activated when user accesses the ticket
          const userSubscription = {
            ticketCode: ticketAsociado,
            subscription: {
              endpoint: `user-placeholder-${ticketAsociado}-${Date.now()}`,
              keys: {
                p256dh: "user-placeholder-key",
                auth: "user-placeholder-auth",
              },
            },
            userType: "user",
            isActive: false, // Will be activated when user accesses ticket
            createdAt: now,
            lifecycle: {
              stage: "placeholder",
              createdAt: now,
              updatedAt: now,
            },
            autoExpire: true,
            expiresAt: null,
            deviceInfo: {
              userAgent: "system-placeholder",
              timestamp: now,
              ip: "system",
            },
            isPlaceholder: true, // Mark as placeholder until user accesses
            vehicleInfo: {
              placa,
              marca,
              modelo,
              color,
            },
          }

          console.log("🔔 [CONFIRM-PARKING] Inserting user subscription:", JSON.stringify(userSubscription, null, 2))
          const userSubscriptionResult = await db.collection("ticket_subscriptions").insertOne(userSubscription)
          console.log("✅ [CONFIRM-PARKING] User placeholder subscription created:", userSubscriptionResult.insertedId)
        } else {
          console.log("ℹ️ [CONFIRM-PARKING] User subscription already exists for ticket:", ticketAsociado)
        }

        console.log("🔔 [CONFIRM-PARKING] ===== CREACIÓN DE SUSCRIPCIÓN USER COMPLETADA =====")
      } catch (subscriptionError) {
        console.error("❌ [CONFIRM-PARKING] Error creating user subscription:", subscriptionError)
        console.error("   Stack:", subscriptionError.stack)
        // Don't fail the parking registration if subscription fails
      }

      // 📢 SEND VEHICLE REGISTERED NOTIFICATION TO ADMIN (using real admin subscriptions)
      try {
        console.log("🔔 [CONFIRM-PARKING] Sending vehicle registered notification to admin...")
        const notificationResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/send-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "vehicle_registered",
              ticketCode: ticketAsociado,
              userType: "admin",
              data: {
                plate: placa || "N/A",
                marca: marca || "",
                modelo: modelo || "",
                color: color || "",
                nombreDueño: nombreDueño || "",
                telefono: telefono || "",
                timestamp: now.toISOString(),
              },
            }),
          },
        )

        if (notificationResponse.ok) {
          const notificationResult = await notificationResponse.json()
          console.log("✅ [CONFIRM-PARKING] Vehicle registered notification sent to admin:", notificationResult)
        } else {
          const errorText = await notificationResponse.text()
          console.error("❌ [CONFIRM-PARKING] Failed to send vehicle registered notification:", errorText)
        }
      } catch (notificationError) {
        console.error("❌ [CONFIRM-PARKING] Error sending vehicle registered notification:", notificationError)
        // Don't fail the registration if notification fails
      }

      console.log(`✅ Vehículo registrado para ticket: ${ticketAsociado} carId: ${carRecord._id}`)

      return NextResponse.json({
        message: "Vehículo registrado exitosamente",
        ticketCode: ticketAsociado,
        carId: carRecord._id,
        carInfo: {
          placa,
          marca,
          modelo,
          color,
          nombreDueño,
          telefono,
        },
      })
    } else if (isConfirmationRequest) {
      console.log("🔄 [CONFIRM-PARKING] ===== PROCESANDO CONFIRMACIÓN =====")
      // CONFIRMATION FLOW - confirming an existing parking
      const { ticketCode } = body

      if (!ticketCode) {
        return NextResponse.json({ error: "Ticket code is required" }, { status: 400 })
      }

      const now = new Date()

      // Find the ticket first
      const ticket = await db.collection("tickets").findOne({
        codigoTicket: ticketCode,
        estado: "ocupado",
      })

      if (!ticket) {
        return NextResponse.json({ message: "Ticket no encontrado o no está ocupado" }, { status: 404 })
      }

      // Find the associated car using the ticket code - look for "estacionado" state
      const car = await db.collection("cars").findOne({
        ticketAsociado: ticketCode,
        estado: "estacionado", // Only look for "estacionado" state
      })

      if (!car) {
        return NextResponse.json({ message: "No se encontró el vehículo asociado a este ticket" }, { status: 404 })
      }

      const carId = car._id.toString()

      // Update car status to confirmed
      const carResult = await db.collection("cars").updateOne(
        { _id: new ObjectId(carId) },
        {
          $set: {
            estado: "estacionado_confirmado", // Changed to "estacionado_confirmado"
            fechaEstacionamiento: now,
            updatedAt: now,
          },
        },
      )

      if (carResult.matchedCount === 0) {
        return NextResponse.json({ message: "Error actualizando el vehículo" }, { status: 404 })
      }

      // Update ticket status to confirmed
      await db.collection("tickets").updateOne(
        { codigoTicket: ticketCode },
        {
          $set: {
            estado: "estacionado_confirmado", // Changed to "estacionado_confirmado"
            fechaConfirmacion: now,
            updatedAt: now,
            carInfo: {
              _id: car._id,
              placa: car.placa,
              marca: car.marca,
              modelo: car.modelo,
              color: car.color,
              nombreDueño: car.nombreDueño,
              telefono: car.telefono,
              horaIngreso: car.horaIngreso,
              fechaRegistro: car.fechaRegistro,
              imagenes: car.imagenes || {},
            },
          },
        },
      )

      // Update or create car_history entry
      await db.collection("car_history").updateOne(
        { carId: carId },
        {
          $set: {
            estadoActual: "estacionado_confirmado", // Changed to "estacionado_confirmado"
            fechaUltimaActualizacion: now,
          },
          $push: {
            eventos: {
              tipo: "confirmacion_estacionamiento",
              fecha: now,
              estado: "estacionado_confirmado", // Changed to "estacionado_confirmado"
              datos: {
                ticketCodigo: ticketCode,
                confirmadoPor: "admin",
              },
            },
          },
        },
        { upsert: true },
      )

      // Send notification to admin about parking confirmation (using real admin subscriptions)
      try {
        console.log("🔔 [CONFIRM-PARKING] Sending vehicle parked notification to admin...")
        const notificationResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/send-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "vehicle_parked",
              ticketCode: ticketCode,
              userType: "admin",
              data: {
                plate: car.placa || "N/A",
                marca: car.marca || "",
                modelo: car.modelo || "",
                color: car.color || "",
                timestamp: now.toISOString(),
              },
            }),
          },
        )

        if (notificationResponse.ok) {
          const notificationResult = await notificationResponse.json()
          console.log("✅ [CONFIRM-PARKING] Vehicle parked notification sent to admin:", notificationResult)
        } else {
          const errorText = await notificationResponse.text()
          console.error("❌ [CONFIRM-PARKING] Failed to send vehicle parked notification:", errorText)
        }
      } catch (notificationError) {
        console.error("❌ [CONFIRM-PARKING] Error sending parking confirmation notification:", notificationError)
        // Don't fail the confirmation if notification fails
      }

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Estacionamiento confirmado para ticket:", ticketCode, "carId:", carId)
      }

      return NextResponse.json({
        success: true,
        message: "Parking confirmed successfully",
        ticketCode,
        carId: car._id,
        plate: car.placa,
      })
    } else {
      console.log("❌ [CONFIRM-PARKING] Request type not recognized")
      console.log("   Body keys:", Object.keys(body))
      console.log("   Body values:", Object.values(body))
      return NextResponse.json({ message: "Datos de request inválidos" }, { status: 400 })
    }
  } catch (error) {
    console.error("❌ [CONFIRM-PARKING] Error in confirm-parking:", error)
    console.error("   Stack:", error.stack)
    return NextResponse.json(
      {
        message: "Error en el proceso",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
