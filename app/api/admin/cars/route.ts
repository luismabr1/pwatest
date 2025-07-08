import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    const cars = await db
      .collection("cars")
      .find({ estado: { $in: ["estacionado", "estacionado_confirmado"] } })
      .sort({ horaIngreso: -1 })
      .toArray()

    return NextResponse.json(cars)
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching cars:", error)
    }
    return NextResponse.json({ message: "Error al obtener carros" }, { status: 500 })
  }
}

export async function POST(request) {
  return handleCarRequest(request, "POST")
}

export async function PUT(request) {
  return handleCarRequest(request, "PUT")
}

async function handleCarRequest(request, method) {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    const contentType = request.headers.get("content-type") || ""
    let carData
    let carId
    let isUpdate = false

    // Manejar tanto FormData como JSON
    if (contentType.includes("multipart/form-data")) {
      // Manejo de FormData (para uploads de imágenes)
      const formData = await request.formData()
      carId = formData.get("carId")?.toString()
      isUpdate = method === "PUT" && carId

      carData = {
        placa: formData.get("placa")?.toString().toUpperCase() || "",
        marca: formData.get("marca")?.toString() || "",
        modelo: formData.get("modelo")?.toString() || "",
        color: formData.get("color")?.toString() || "",
        nombreDueño: formData.get("nombreDueño")?.toString() || "",
        telefono: formData.get("telefono")?.toString() || "",
        ticketAsociado: formData.get("ticketAsociado")?.toString() || "",
      }

      // Manejar imágenes si existen
      const plateImage = formData.get("plateImage") as File | null
      const vehicleImage = formData.get("vehicleImage") as File | null
      const plateImageUrl = formData.get("plateImageUrl")?.toString()
      const vehicleImageUrl = formData.get("vehicleImageUrl")?.toString()

      if (plateImage || vehicleImage || plateImageUrl || vehicleImageUrl) {
        carData.imagenes = {
          fechaCaptura: new Date(),
          capturaMetodo: "manual",
        }

        if (plateImage) {
          const plateUploadResponse = await cloudinary.uploader.upload(
            `data:image/jpeg;base64,${await plateImage.arrayBuffer().then(Buffer.from).toString("base64")}`,
            { folder: "parking-plates" },
          )
          carData.imagenes.plateImageUrl = plateUploadResponse.secure_url
        } else if (plateImageUrl) {
          carData.imagenes.plateImageUrl = plateImageUrl
        }

        if (vehicleImage) {
          const vehicleUploadResponse = await cloudinary.uploader.upload(
            `data:image/jpeg;base64,${await vehicleImage.arrayBuffer().then(Buffer.from).toString("base64")}`,
            { folder: "parking-vehicles" },
          )
          carData.imagenes.vehicleImageUrl = vehicleUploadResponse.secure_url
        } else if (vehicleImageUrl) {
          carData.imagenes.vehicleImageUrl = vehicleImageUrl
        }
      }
    } else {
      // Manejo de JSON (para formulario manual)
      const jsonData = await request.json()
      carId = jsonData.carId
      isUpdate = method === "PUT" && carId

      carData = {
        placa: (jsonData.placa || "").toString().toUpperCase(),
        marca: jsonData.marca || "",
        modelo: jsonData.modelo || "",
        color: jsonData.color || "",
        nombreDueño: jsonData.nombreDueño || "",
        telefono: jsonData.telefono || "",
        ticketAsociado: jsonData.ticketAsociado || "",
      }

      // Si hay imágenes en el JSON (desde captura de vehículo)
      if (jsonData.imagenes) {
        carData.imagenes = {
          ...jsonData.imagenes,
          fechaCaptura: new Date(),
        }
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`${method} request received`, { carId, ...carData })
    }

    // Validar campos requeridos para formulario manual
    if (!carData.placa || !carData.ticketAsociado) {
      return NextResponse.json(
        {
          error: "Placa y ticket son campos obligatorios",
        },
        { status: 400 },
      )
    }

    let existingCar
    if (isUpdate) {
      existingCar = await db.collection("cars").findOne({ _id: new ObjectId(carId) })
      if (!existingCar) {
        return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 })
      }
    }

    const now = new Date()
    const finalCarData = {
      ...carData,
      horaIngreso: isUpdate ? existingCar.horaIngreso : now,
      estado: isUpdate ? existingCar.estado : "estacionado",
      fechaRegistro: isUpdate ? existingCar.fechaRegistro : now,
      lastModified: now,
    }

    // Si no hay imágenes, agregar estructura básica
    if (!finalCarData.imagenes) {
      finalCarData.imagenes = {
        fechaCaptura: now,
        capturaMetodo: "manual",
      }
    }

    let result
    if (isUpdate) {
      result = await db.collection("cars").updateOne({ _id: new ObjectId(carId) }, { $set: finalCarData })
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 })
      }
    } else {
      result = await db.collection("cars").insertOne(finalCarData)
      finalCarData._id = result.insertedId

      // Actualizar ticket asociado
      if (carData.ticketAsociado) {
        const updateResult = await db.collection("tickets").updateOne(
          { codigoTicket: carData.ticketAsociado },
          {
            $set: {
              estado: "ocupado",
              carInfo: {
                _id: result.insertedId,
                placa: carData.placa,
                marca: carData.marca,
                modelo: carData.modelo,
                color: carData.color,
                nombreDueño: carData.nombreDueño,
                telefono: carData.telefono,
                horaIngreso: now.toISOString(),
                fechaRegistro: now.toISOString(),
                imagenes: finalCarData.imagenes,
              },
              horaOcupacion: now.toISOString(),
            },
          },
          { upsert: true },
        )
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 DEBUG - Updated tickets for ticket:", carData.ticketAsociado, updateResult)
        }
      }

      // 🔔 CREAR SUSCRIPCIONES AUTOMÁTICAS
      console.log("🔔 [CARS-API] ===== INICIANDO CREACIÓN DE SUSCRIPCIONES =====")
      try {
        console.log("🔔 [CARS-API] Creating automatic admin subscription for ticket:", carData.ticketAsociado)

        // Check if admin subscription already exists
        const existingAdminSub = await db.collection("ticket_subscriptions").findOne({
          ticketCode: carData.ticketAsociado,
          userType: "admin",
          isActive: true,
        })

        console.log("🔍 [CARS-API] Existing admin subscription:", existingAdminSub ? "FOUND" : "NOT FOUND")

        if (!existingAdminSub) {
          // Create admin subscription for this ticket
          const adminSubscription = {
            ticketCode: carData.ticketAsociado,
            subscription: {
              endpoint: `admin-virtual-${carData.ticketAsociado}-${Date.now()}`,
              keys: {
                p256dh: "admin-virtual-key",
                auth: "admin-virtual-auth",
              },
            },
            userType: "admin",
            isActive: true,
            createdAt: now,
            lifecycle: {
              stage: "active",
              createdAt: now,
              updatedAt: now,
            },
            autoExpire: true,
            expiresAt: null,
            deviceInfo: {
              userAgent: "admin-system",
              timestamp: now,
              ip: "system",
            },
            isVirtual: true, // Mark as virtual subscription for admin system
            vehicleInfo: {
              placa: carData.placa,
              marca: carData.marca,
              modelo: carData.modelo,
              color: carData.color,
            },
          }

          console.log("🔔 [CARS-API] Inserting admin subscription:", JSON.stringify(adminSubscription, null, 2))
          const subscriptionResult = await db.collection("ticket_subscriptions").insertOne(adminSubscription)
          console.log("✅ [CARS-API] Admin subscription created:", subscriptionResult.insertedId)
        } else {
          console.log("ℹ️ [CARS-API] Admin subscription already exists for ticket:", carData.ticketAsociado)
        }

        // Check if user placeholder subscription already exists
        const existingUserSub = await db.collection("ticket_subscriptions").findOne({
          ticketCode: carData.ticketAsociado,
          userType: "user",
        })

        console.log("🔍 [CARS-API] Existing user subscription:", existingUserSub ? "FOUND" : "NOT FOUND")

        if (!existingUserSub) {
          // Create a placeholder user subscription that will be activated when user accesses the ticket
          const userSubscription = {
            ticketCode: carData.ticketAsociado,
            subscription: {
              endpoint: `user-placeholder-${carData.ticketAsociado}-${Date.now()}`,
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
              placa: carData.placa,
              marca: carData.marca,
              modelo: carData.modelo,
              color: carData.color,
            },
          }

          console.log("🔔 [CARS-API] Inserting user subscription:", JSON.stringify(userSubscription, null, 2))
          const userSubscriptionResult = await db.collection("ticket_subscriptions").insertOne(userSubscription)
          console.log("✅ [CARS-API] User placeholder subscription created:", userSubscriptionResult.insertedId)
        } else {
          console.log("ℹ️ [CARS-API] User subscription already exists for ticket:", carData.ticketAsociado)
        }

        // Verify subscriptions were created
        const allSubscriptions = await db
          .collection("ticket_subscriptions")
          .find({ ticketCode: carData.ticketAsociado })
          .toArray()
        console.log(
          "🔍 [CARS-API] Total subscriptions for ticket",
          carData.ticketAsociado + ":",
          allSubscriptions.length,
        )
        allSubscriptions.forEach((sub, index) => {
          console.log(
            `   ${index + 1}. UserType: ${sub.userType}, Active: ${sub.isActive}, Virtual: ${sub.isVirtual}, Placeholder: ${sub.isPlaceholder}`,
          )
        })

        console.log("🔔 [CARS-API] ===== CREACIÓN DE SUSCRIPCIONES COMPLETADA =====")
      } catch (subscriptionError) {
        console.error("❌ [CARS-API] Error creating subscriptions:", subscriptionError)
        console.error("   Stack:", subscriptionError.stack)
        // Don't fail the car registration if subscription fails
      }

      // Crear entrada en historial
      const historyEntry = {
        carId: result.insertedId.toString(),
        placa: finalCarData.placa || "PENDIENTE",
        marca: finalCarData.marca || "Por definir",
        modelo: finalCarData.modelo || "Por definir",
        color: finalCarData.color || "Por definir",
        nombreDueño: finalCarData.nombreDueño || "Por definir",
        telefono: finalCarData.telefono || "Por definir",
        ticketAsociado: finalCarData.ticketAsociado || "",
        estadoActual: "estacionado",
        activo: true,
        completado: false,
        fechaRegistro: now,
        fechaUltimaActualizacion: now,
        datosVehiculo: { ...finalCarData, fechaCreacion: now },
        eventos: [
          {
            tipo: "registro_inicial",
            fecha: now,
            estado: "estacionado",
            datos: {
              metodoRegistro: finalCarData.imagenes?.capturaMetodo || "manual",
              imagenes: finalCarData.imagenes || null,
              confianzaPlaca: finalCarData.imagenes?.confianzaPlaca || 0,
              confianzaVehiculo: finalCarData.imagenes?.confianzaVehiculo || 0,
            },
          },
        ],
        pagos: [],
        pagosRechazados: [],
        montosPendientes: [],
        montoTotalPagado: 0,
      }
      await db.collection("car_history").insertOne(historyEntry)
    }

    const updatedCar = await db.collection("cars").findOne({
      _id: isUpdate ? new ObjectId(carId) : result.insertedId,
    })

    return NextResponse.json({
      success: true,
      message: isUpdate ? "Vehículo actualizado correctamente" : "Vehículo registrado correctamente",
      car: updatedCar,
    })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error handling car request:", error)
    }
    return NextResponse.json(
      {
        error: error.message || "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}
