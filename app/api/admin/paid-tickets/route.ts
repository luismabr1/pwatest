// Opt out of caching for this route
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("parking");

    // Buscar tickets que están pagados y validados con información completa
    const paidTickets = await db
      .collection("tickets")
      .aggregate([
        {
          $match: { estado: "pagado_validado" },
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
          $lookup: {
            from: "pagos",
            localField: "codigoTicket",
            foreignField: "codigoTicket",
            as: "paymentInfo",
          },
        },
        {
          $unwind: {
            path: "$paymentInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: "$_id", // Group by ticket _id to deduplicate
            codigoTicket: { $first: "$codigoTicket" },
            estado: { $first: "$estado" },
            horaOcupacion: { $first: "$horaOcupacion" },
            montoCalculado: { $first: "$montoCalculado" },
            carInfoFull: { $first: "$carInfoFull" },
            paymentInfo: {
              $push: "$paymentInfo", // Collect all payments, then filter for the latest
            },
          },
        },
        {
          $project: {
            _id: 1,
            codigoTicket: 1,
            estado: 1,
            horaOcupacion: 1,
            montoCalculado: 1,
            // Merge carInfo with full data from cars
            carInfo: {
              $mergeObjects: [
                {
                  placa: { $ifNull: ["$carInfoFull.placa", "Dato no proporcionado"] },
                  marca: { $ifNull: ["$carInfoFull.marca", "Por definir"] },
                  modelo: { $ifNull: ["$carInfoFull.modelo", "Por definir"] },
                  color: { $ifNull: ["$carInfoFull.color", "Por definir"] },
                  nombreDueño: { $ifNull: ["$carInfoFull.nombreDueño", "Por definir"] },
                  telefono: { $ifNull: ["$carInfoFull.telefono", "Por definir"] },
                  imagenes: "$carInfoFull.imagenes", // Include imagenes from cars
                },
              ],
            },
            // Use the latest payment data
            fechaPago: {
              $ifNull: [
                { $max: "$paymentInfo.fechaPago" }, // Take the most recent payment date
                "$fechaCreacion",
              ],
            },
            tiempoSalida: {
              $ifNull: [
                { $arrayElemAt: ["$paymentInfo.tiempoSalida", -1] }, // Take the last tiempoSalida
                "$tiempoSalida",
              ],
            },
            tiempoSalidaEstimado: {
              $ifNull: [
                { $arrayElemAt: ["$paymentInfo.tiempoSalidaEstimado", -1] }, // Take the last tiempoSalidaEstimado
                "$tiempoSalidaEstimado",
              ],
            },
          },
        },
        {
          $sort: { horaOcupacion: -1 },
        },
      ])
      .toArray();

    // Debugging log
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 DEBUG: Paid Tickets Response", paidTickets);
      console.log("🔍 DEBUG: Number of unique tickets by codigoTicket:", new Set(paidTickets.map(t => t.codigoTicket)).size);
    }

    // Agregar headers anti-cache
    const response = NextResponse.json(paidTickets);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");

    return response;
  } catch (error) {
    console.error("Error fetching paid tickets:", error);
    return NextResponse.json({ message: "Error al obtener tickets pagados" }, { status: 500 });
  }
}
