import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { v2 as cloudinary } from "cloudinary";
import { createHash } from "crypto";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("parking");

    const cars = await db
      .collection("cars")
      .find({ estado: { $in: ["estacionado", "estacionado_confirmado"] } })
      .sort({ horaIngreso: -1 })
      .toArray();

    return NextResponse.json(cars);
  } catch (error) {
    console.error("Error fetching cars:", error);
    return NextResponse.json({ message: "Error al obtener carros" }, { status: 500 });
  }
}

export async function POST(request) {
  return handleCarRequest(request, "POST");
}

export async function PUT(request) {
  return handleCarRequest(request, "PUT");
}

async function handleCarRequest(request, method) {
  try {
    const client = await clientPromise;
    const db = client.db("parking");

    const contentType = request.headers.get("content-type") || "";
    let carData;
    let carId;
    let isUpdate = false;

    // Manejar FormData o JSON
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      carId = formData.get("carId")?.toString();
      isUpdate = method === "PUT" && carId;

      carData = {
        placa: formData.get("placa")?.toString().toUpperCase() || "",
        marca: formData.get("marca")?.toString() || "",
        modelo: formData.get("modelo")?.toString() || "",
        color: formData.get("color")?.toString() || "",
        nombreDueño: formData.get("nombreDueño")?.toString() || "",
        telefono: formData.get("telefono")?.toString() || "",
        ticketAsociado: formData.get("ticketAsociado")?.toString() || "",
      };

      // Manejar imágenes
      const plateImage = formData.get("plateImage") as File | null;
      const vehicleImage = formData.get("vehicleImage") as File | null;
      const plateImageUrl = formData.get("plateImageUrl")?.toString();
      const vehicleImageUrl = formData.get("vehicleImageUrl")?.toString();

      if (plateImage || vehicleImage || plateImageUrl || vehicleImageUrl) {
        carData.imagenes = {
          fechaCaptura: new Date(),
          capturaMetodo: "manual",
        };

        if (plateImage) {
          const plateUploadResponse = await cloudinary.uploader.upload(
            `data:image/jpeg;base64,${await plateImage.arrayBuffer().then(Buffer.from).toString("base64")}`,
            { folder: "parking-plates" }
          );
          carData.imagenes.plateImageUrl = plateUploadResponse.secure_url;
        } else if (plateImageUrl) {
          carData.imagenes.plateImageUrl = plateImageUrl;
        }

        if (vehicleImage) {
          const vehicleUploadResponse = await cloudinary.uploader.upload(
            `data:image/jpeg;base64,${await vehicleImage.arrayBuffer().then(Buffer.from).toString("base64")}`,
            { folder: "parking-vehicles" }
          );
          carData.imagenes.vehicleImageUrl = vehicleUploadResponse.secure_url;
        } else if (vehicleImageUrl) {
          carData.imagenes.vehicleImageUrl = vehicleImageUrl;
        }
      }
    } else {
      const jsonData = await request.json();
      carId = jsonData.carId;
      isUpdate = method === "PUT" && carId;

      carData = {
        placa: (jsonData.placa || "").toString().toUpperCase(),
        marca: jsonData.marca || "",
        modelo: jsonData.modelo || "",
        color: jsonData.color || "",
        nombreDueño: jsonData.nombreDueño || "",
        telefono: jsonData.telefono || "",
        ticketAsociado: jsonData.ticketAsociado || "",
      };

      if (jsonData.imagenes) {
        carData.imagenes = {
          ...jsonData.imagenes,
          fechaCaptura: new Date(),
        };
      }
    }

    console.log(`${method} request received`, { carId, ...carData });

    // Validar campos requeridos
    if (!carData.placa || !carData.ticketAsociado) {
      return NextResponse.json(
        { error: "Placa y ticket son campos obligatorios" },
        { status: 400 }
      );
    }

    let existingCar;
    if (isUpdate) {
      existingCar = await db.collection("cars").findOne({ _id: new ObjectId(carId) });
      if (!existingCar) {
        return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
      }
    }

    const now = new Date();
    const finalCarData = {
      ...carData,
      horaIngreso: isUpdate ? existingCar.horaIngreso : now,
      estado: isUpdate ? existingCar.estado : "estacionado",
      fechaRegistro: isUpdate ? existingCar.fechaRegistro : now,
      lastModified: now,
    };

    if (!finalCarData.imagenes) {
      finalCarData.imagenes = {
        fechaCaptura: now,
        capturaMetodo: "manual",
      };
    }

    let result;
    if (isUpdate) {
      result = await db.collection("cars").updateOne({ _id: new ObjectId(carId) }, { $set: finalCarData });
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
      }
    } else {
      result = await db.collection("cars").insertOne(finalCarData);
      finalCarData._id = result.insertedId;

      // Actualizar ticket asociado con token temporal
      if (carData.ticketAsociado) {
        const secretKey = process.env.SECRET_KEY;
        if (!secretKey) {
          throw new Error("Clave secreta no configurada en .env");
        }

        const accessToken = createHash("sha256")
          .update(`${carData.ticketAsociado}${secretKey}`)
          .digest("hex")
          .substring(0, 16);
        const accessTokenExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

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
              accessToken,
              accessTokenExpiration,
            },
          },
          { upsert: true }
        );
        console.log("🔍 DEBUG - Updated ticket with token:", carData.ticketAsociado, updateResult);
      }

      // Crear suscripción placeholder para el usuario
      console.log("🔔 [CARS-API] ===== INICIANDO CREACIÓN DE SUSCRIPCIÓN USER =====");
      const existingUserSub = await db.collection("ticket_subscriptions").findOne({
        ticketCode: carData.ticketAsociado,
        userType: "user",
      });

      if (!existingUserSub) {
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
          isActive: false,
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
          isPlaceholder: true,
          vehicleInfo: {
            placa: carData.placa,
            marca: carData.marca,
            modelo: carData.modelo,
            color: carData.color,
          },
        };

        console.log("🔔 [CARS-API] Inserting user subscription:", JSON.stringify(userSubscription));
        await db.collection("ticket_subscriptions").insertOne(userSubscription);
        console.log("✅ [CARS-API] User placeholder subscription created");
      } else {
        console.log("ℹ️ [CARS-API] User subscription already exists for ticket:", carData.ticketAsociado);
      }
      console.log("🔔 [CARS-API] ===== CREACIÓN DE SUSCRIPCIÓN USER COMPLETADA =====");

      // Enviar notificación a admin
      console.log("🔔 [CARS-API] Sending vehicle registered notification to admin...");
      const notificationResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/send-notification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "vehicle_registered",
            ticketCode: carData.ticketAsociado,
            userType: "admin",
            data: {
              plate: carData.placa || "N/A",
              marca: carData.marca || "",
              modelo: carData.modelo || "",
              color: carData.color || "",
              nombreDueño: carData.nombreDueño || "",
              telefono: carData.telefono || "",
              timestamp: now.toISOString(),
            },
          }),
        }
      );

      if (notificationResponse.ok) {
        const notificationResult = await notificationResponse.json();
        console.log("✅ [CARS-API] Vehicle registered notification sent to admin:", notificationResult);
      } else {
        console.error("❌ [CARS-API] Failed to send vehicle registered notification:", await notificationResponse.text());
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
            },
          },
        ],
        pagos: [],
        pagosRechazados: [],
        montosPendientes: [],
        montoTotalPagado: 0,
      };
      await db.collection("car_history").insertOne(historyEntry);
    }

    const updatedCar = await db.collection("cars").findOne({
      _id: isUpdate ? new ObjectId(carId) : result.insertedId,
    });

    return NextResponse.json({
      success: true,
      message: isUpdate ? "Vehículo actualizado correctamente" : "Vehículo registrado correctamente",
      car: updatedCar,
    });
  } catch (error) {
    console.error("Error handling car request:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}