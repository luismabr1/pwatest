import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("parking");
    const pendingParkings = await db
      .collection("tickets")
      .aggregate([
        {
          $match: { estado: "ocupado" }, // Matches newly registered cars
        },
        {
          $lookup: {
            from: "cars",
            localField: "codigoTicket",
            foreignField: "ticketAsociado",
            as: "carInfoFull",
          },
        },
        {
          $unwind: {
            path: "$carInfoFull",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: { "carInfoFull.estado": { $in: ["estacionado", "estacionado_confirmado"] } }, // Include both states
        },
        {
          $project: {
            _id: 1,
            codigoTicket: 1,
            estado: 1,
            horaOcupacion: 1,
            carInfo: {
              _id: "$carInfoFull._id",
              placa: { $ifNull: ["$carInfoFull.placa", "$carInfo.placa", "Dato no proporcionado"] },
              marca: { $ifNull: ["$carInfoFull.marca", "$carInfo.marca", "Por definir"] },
              modelo: { $ifNull: ["$carInfoFull.modelo", "$carInfo.modelo", "Por definir"] },
              color: { $ifNull: ["$carInfoFull.color", "$carInfo.color", "Por definir"] },
              nombreDueño: { $ifNull: ["$carInfoFull.nombreDueño", "$carInfo.nombreDueño", "Por definir"] },
              telefono: { $ifNull: ["$carInfoFull.telefono", "$carInfo.telefono", "Por definir"] },
              horaIngreso: { $ifNull: ["$carInfoFull.horaIngreso", "$carInfo.horaIngreso", new Date().toISOString()] },
              fechaRegistro: { $ifNull: ["$carInfoFull.fechaRegistro", "$carInfo.fechaRegistro", new Date().toISOString()] },
              imagenes: "$carInfoFull.imagenes",
            },
          },
        },
        {
          $sort: { horaOcupacion: -1 },
        },
      ])
      .toArray();

    const response = NextResponse.json(pendingParkings);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");

    return response;
  } catch (error) {
    console.error("Error fetching pending parkings:", error);
    return NextResponse.json({ message: "Error al obtener estacionamientos pendientes" }, { status: 500 });
  }
}
