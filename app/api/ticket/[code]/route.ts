import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { calculateParkingFee } from "@/lib/utils";
import { createHash } from "crypto";

export async function GET(request: Request, { params }: { params: { code: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db("parking");
    const ticketCode = params.code.trim().toUpperCase();

    console.log(`🔍 API ticket/[code]: Buscando ticket: ${ticketCode}`);

    // Validar el formato del ticketCode
    if (!ticketCode.match(/^[A-Z]{4}\d{3}$/)) {
      console.log(`❌ Ticket inválido: ${ticketCode}`);
      return NextResponse.json({ message: "Código de ticket inválido" }, { status: 400 });
    }

    // Buscar el ticket y verificar el token temporal
    const ticket = await db.collection("tickets").findOne({ codigoTicket: ticketCode });

    if (!ticket) {
      console.log(`❌ Ticket no encontrado: ${ticketCode}`);
      return NextResponse.json({ message: "Ticket no encontrado" }, { status: 404 });
    }

    // Generar el token esperado basado en el ticketCode y una clave secreta
    const secretKey = process.env.SECRET_KEY;
    if (!secretKey) {
      console.error("❌ Clave secreta no configurada en .env");
      return NextResponse.json({ message: "Error de configuración del servidor" }, { status: 500 });
    }

    const expectedToken = createHash("sha256")
      .update(`${ticketCode}${secretKey}`)
      .digest("hex")
      .substring(0, 16);

    const requestToken = new URL(request.url).searchParams.get("token");

    if (!requestToken || requestToken !== expectedToken) {
      console.log(`❌ Token inválido o ausente para ${ticketCode}`);
      return NextResponse.json({ message: "Acceso no autorizado" }, { status: 401 });
    }

    // Verificar si el token ha expirado (opcional, requiere campo expiration en la BD)
    if (ticket.accessTokenExpiration && new Date(ticket.accessTokenExpiration) < new Date()) {
      console.log(`❌ Token expirado para ${ticketCode}`);
      return NextResponse.json({ message: "Token expirado" }, { status: 401 });
    }

    console.log(`✅ Token válido para ${ticketCode}, estado: ${ticket.estado}`);

    // Verificar si el ticket ya fue pagado y validado
    if (ticket.estado === "pagado_validado" || ticket.estado === "salido") {
      console.log(`⚠️ Ticket ya procesado: ${ticketCode}`);
      return NextResponse.json({ message: "Este ticket ya ha sido pagado y procesado" }, { status: 404 });
    }

    let montoCalculado = 0;
    let horaEntrada = null;
    let canProceed = false;

    // Buscar información del carro asociado
    console.log(`🚗 Buscando carro asociado a ticket: ${ticketCode}`);
    const car = await db.collection("cars").findOne({
      ticketAsociado: ticketCode,
      estado: { $in: ["estacionado", "estacionado_confirmado", "pago_pendiente", "ocupado"] },
    });

    if (car) {
      console.log(`✅ Carro encontrado: ${car.placa} - ${car.marca} ${car.modelo}`);
    } else {
      console.log(`❌ No se encontró carro asociado a ticket: ${ticketCode}`);
    }

    // Obtener la configuración de tarifas
    const settings = await db.collection("company_settings").findOne({});
    const precioHora = settings?.tarifas?.precioHora || 3.0;
    const tasaCambio = settings?.tarifas?.tasaCambio || 35.0;

    // Determinar la hora de entrada y calcular el monto
    if (ticket.estado === "estacionado_confirmado" && ticket.horaOcupacion) {
      horaEntrada = new Date(ticket.horaOcupacion);
      const now = new Date();
      const diffInMs = now.getTime() - horaEntrada.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);

      montoCalculado = Math.max(diffInHours * precioHora, precioHora / 2);
      montoCalculado = Number.parseFloat(montoCalculado.toFixed(2));
      canProceed = true;
      console.log(`💰 Ticket estacionado confirmado - Calculado: $${montoCalculado}`);
    } else if (ticket.estado === "ocupado") {
      console.log(`⚠️ Ticket ocupado pero no confirmado: ${ticketCode}`);
      return NextResponse.json(
        { message: "Este vehículo aún no ha sido confirmado como estacionado" },
        { status: 404 }
      );
    } else if (ticket.estado === "activo" && ticket.horaEntrada) {
      horaEntrada = new Date(ticket.horaEntrada);
      const now = new Date();
      const diffInMs = now.getTime() - horaEntrada.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);

      montoCalculado = Math.max(diffInHours * precioHora, precioHora / 2);
      montoCalculado = Number.parseFloat(montoCalculado.toFixed(2));
      canProceed = true;
      console.log(`💰 Ticket activo legacy - Calculado: $${montoCalculado}`);
    } else if (ticket.estado === "disponible") {
      if (car) {
        console.log(`⚠️ Ticket disponible pero con carro asignado - requiere confirmación`);
        return NextResponse.json(
          { message: "Este vehículo aún no ha sido confirmado como estacionado" },
          { status: 404 }
        );
      }
      console.log(`⚠️ Ticket disponible sin carro: ${ticketCode}`);
      return NextResponse.json(
        { message: "Este ticket no tiene un vehículo asignado" },
        { status: 404 }
      );
    } else if (ticket.estado === "pago_rechazado" && (ticket.horaOcupacion || ticket.horaEntrada)) {
      horaEntrada = new Date(ticket.horaOcupacion || ticket.horaEntrada);
      montoCalculado = calculateParkingFee(horaEntrada);
      canProceed = true;
      console.log(`🔄 Ticket con pago rechazado - Calculado: $${montoCalculado}`);
    } else if (ticket.estado === "pagado_pendiente") {
      console.log(`⏳ Ticket con pago pendiente: ${ticketCode}`);
      return NextResponse.json(
        { message: "Este ticket tiene un pago pendiente de validación" },
        { status: 404 }
      );
    }

    if (!canProceed) {
      console.log(`❌ No se puede proceder con ticket: ${ticketCode}, estado: ${ticket.estado}`);
      return NextResponse.json(
        { message: `Estado no válido para pago: ${ticket.estado}` },
        { status: 404 }
      );
    }

    let carInfo = car
      ? {
          placa: car.placa,
          marca: car.marca,
          modelo: car.modelo,
          color: car.color,
          nombreDueño: car.nombreDueño,
          telefono: car.telefono,
        }
      : null;
    console.log(`🚗 Información del carro ${carInfo ? "incluida" : "no encontrada"} en respuesta`);

    await db.collection("tickets").updateOne({ codigoTicket: ticketCode }, { $set: { montoCalculado } });

    const montoBs = Number.parseFloat((montoCalculado * tasaCambio).toFixed(2));

    const response = {
      codigoTicket: ticket.codigoTicket,
      horaEntrada: horaEntrada?.toISOString() || ticket.horaEntrada,
      horaSalida: ticket.horaSalida,
      estado: ticket.estado,
      montoCalculado,
      montoBs,
      tasaCambio,
      carInfo,
    };

    console.log(`✅ API ticket/[code] - Respuesta enviada para ${ticketCode}:`, JSON.stringify(response));
    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" },
    });
  } catch (error) {
    console.error("❌ Error en API ticket/[code]:", error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}