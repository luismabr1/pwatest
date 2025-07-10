const { MongoClient } = require("mongodb")
const webpush = require("web-push")
require("dotenv").config({ path: ".env" })

async function generateVapidKeys() {
  console.log("🔑 Generando claves VAPID para notificaciones push...")

  const vapidKeys = webpush.generateVAPIDKeys()

  console.log("✅ Claves VAPID generadas:")
  console.log("📋 Clave pública:", vapidKeys.publicKey.substring(0, 50) + "...")
  console.log("📋 Clave privada:", vapidKeys.privateKey.substring(0, 50) + "...")
  console.log("\n⚠️  IMPORTANTE: Agrega estas claves a tu archivo .env:")
  console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`)
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`)

  return vapidKeys
}

// Verificar variables de entorno requeridas
function checkEnvironmentVariables() {
  const required = ["MONGODB_URI"]
  const missing = required.filter((env) => !process.env[env])

  if (missing.length > 0) {
    console.error("❌ Variables de entorno faltantes:")
    missing.forEach((env) => console.error(`   - ${env}`))
    console.error("\n📝 Crea un archivo .env.local con:")
    console.error("MONGODB_URI=mongodb://localhost:27017/parking")
    console.error("# O tu string de conexión de MongoDB Atlas")
    process.exit(1)
  }
}

async function seedDatabase() {
  // Verificar variables de entorno antes de continuar
  checkEnvironmentVariables()

  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    await client.connect()
    console.log("🔗 Conectado a MongoDB")

    const db = client.db("parking")

    // Limpiar todas las colecciones
    console.log("🧹 Limpiando base de datos...")
    const collections = [
      "company_settings",
      "tickets",
      "cars",
      "pagos",
      "staff",
      "banks",
      "car_history",
      "ticket_subscriptions", // notificaciones
    ]

    for (const collection of collections) {
      try {
        await db.collection(collection).deleteMany({})
        console.log(`  ✅ ${collection} limpiada`)
      } catch (error) {
        console.log(`  ⚠️  ${collection} no existía (normal en primera ejecución)`)
      }
    }

    // Generar claves VAPID
    const vapidKeys = await generateVapidKeys()

    // 1. Configuración de la empresa
    console.log("🏢 Insertando configuración de empresa...")
    const companySettings = {
      pagoMovil: {
        banco: "Banco de Venezuela",
        cedula: "V-12345678",
        telefono: "0414-1234567",
      },
      transferencia: {
        banco: "Banco de Venezuela",
        cedula: "J-12345678-9",
        telefono: "0212-1234567",
        numeroCuenta: "0102-0123-45-6789012345",
      },
      tarifas: {
        precioHoraDiurno: 3.0,
        precioHoraNocturno: 4.0,
        tasaCambio: 36.0,
        horaInicioNocturno: "00:00",
        horaFinNocturno: "06:00",
      },
      vapidKeys: {
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey,
      },
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    }

    await db.collection("company_settings").insertOne(companySettings)
    console.log("✅ Configuración de empresa insertada con claves VAPID")
        // 2. Crear espacios de estacionamiento (tickets disponibles)
    console.log("🎫 Creando espacios de estacionamiento...")
    const tickets = []
    for (let i = 1; i <= 20; i++) {
      const ticketCode = `PARK${i.toString().padStart(3, "0")}`
      tickets.push({
        codigoTicket: ticketCode,
        estado: "disponible",
        fechaCreacion: new Date(),
        horaEntrada: null,
        horaSalida: null,
        montoCalculado: 0,
        carInfo: null,
        ultimoPagoId: null,
      })
    }
    await db.collection("tickets").insertMany(tickets)
    console.log(`✅ ${tickets.length} espacios de estacionamiento creados (PARK001-PARK020)`)

    // 2. Crear solo el ticket de prueba TEST-01
    console.log("🎫 Creando ticket de prueba...")
    const testTicket = {
      codigoTicket: "TEST-01",
      estado: "estacionado_confirmado", // Listo para pago
      fechaCreacion: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
      horaEntrada: new Date(Date.now() - 2 * 60 * 60 * 1000),
      horaSalida: null,
      montoCalculado: 6.0, // 2 horas * $3/hora
      carInfo: {
        placa: "ABC123",
        marca: "Toyota",
        modelo: "Corolla",
        color: "Blanco",
        nombreDueño: "Juan Pérez",
        telefono: "0414-1234567",
      },
      ultimoPagoId: null,
    }
    await db.collection("tickets").insertOne(testTicket)
    console.log("✅ Ticket TEST-01 creado")

    // 3. Crear carro asociado al ticket
    console.log("🚗 Creando vehículo de prueba...")
    const testCar = {
      placa: "ABC123",
      marca: "Toyota",
      modelo: "Corolla",
      color: "Blanco",
      nombreDueño: "Juan Pérez",
      telefono: "0414-1234567",
      ticketAsociado: "TEST-01",
      estado: "estacionado_confirmado",
      fechaRegistro: new Date(Date.now() - 2 * 60 * 60 * 1000),
      fechaConfirmacion: new Date(Date.now() - 2 * 60 * 60 * 1000),
    }
    await db.collection("cars").insertOne(testCar)
    console.log("✅ Vehículo ABC123 creado")

    // 4. Crear historial del carro
    console.log("📚 Creando historial del vehículo...")
    const carHistory = {
      carId: testCar._id?.toString() || "test-car-id",
      ticketAsociado: "TEST-01",
      placa: "ABC123",
      estadoActual: "estacionado_confirmado",
      fechaUltimaActualizacion: new Date(),
      eventos: [
        {
          tipo: "registro",
          fecha: new Date(Date.now() - 2 * 60 * 60 * 1000),
          estado: "registrado",
          datos: testCar,
        },
        {
          tipo: "confirmacion_estacionamiento",
          fecha: new Date(Date.now() - 2 * 60 * 60 * 1000),
          estado: "estacionado_confirmado",
          datos: { confirmadoPor: "admin" },
        },
      ],
      pagos: [],
    }
    await db.collection("car_history").insertOne(carHistory)
    console.log("✅ Historial creado")

    // 5. Usuario administrador
    console.log("👤 Creando usuario administrador...")
    const adminUser = {
      nombre: "Administrador",
      apellido: "Sistema",
      email: "admin",
      password: "admin123",
      rol: "administrador",
      fechaCreacion: new Date(),
      activo: true,
    }
    await db.collection("staff").insertOne(adminUser)
    console.log("✅ Usuario admin creado")

    // 6. Lista de bancos
    console.log("🏦 Insertando bancos...")
    const banks = [
      { code: "0102", name: "Banco de Venezuela" },
      { code: "0104", name: "Venezolano de Crédito" },
      { code: "0105", name: "Banco Mercantil" },
      { code: "0108", name: "Banco Provincial" },
      { code: "0114", name: "Bancaribe" },
      { code: "0115", name: "Banco Exterior" },
      { code: "0128", name: "Banco Caroní" },
      { code: "0134", name: "Banesco" },
      { code: "0137", name: "Banco Sofitasa" },
      { code: "0138", name: "Banco Plaza" },
      { code: "0151", name: "Banco Fondo Común (BFC)" },
      { code: "0156", name: "100% Banco" },
      { code: "0157", name: "DelSur Banco" },
      { code: "0163", name: "Banco del Tesoro" },
      { code: "0166", name: "Banco Agrícola de Venezuela" },
      { code: "0168", name: "Bancrecer" },
      { code: "0169", name: "Mi Banco" },
      { code: "0171", name: "Banco Activo" },
      { code: "0172", name: "Bancamiga" },
      { code: "0174", name: "Banplus" },
      { code: "0175", name: "Banco Bicentenario" },
      { code: "0177", name: "Banco de la Fuerza Armada Nacional Bolivariana" },
      { code: "0191", name: "Banco Nacional de Crédito (BNC)" },
    ]
    await db.collection("banks").insertMany(banks)
    console.log(`✅ ${banks.length} bancos insertados`)

    console.log("\n🎉 Base de datos inicializada para pruebas de notificaciones!")
    console.log("\n📋 Configuración de prueba:")
    console.log("- Ticket: TEST-01 (Toyota Corolla ABC123)")
    console.log("- Estado: Estacionado y confirmado (listo para pago)")
    console.log("- Monto: $6.00 USD (216.00 Bs)")
    console.log("- Usuario admin: admin/admin123")
    console.log("\n🔔 Para probar notificaciones:")
    console.log("1. Agrega las claves VAPID mostradas arriba a tu .env.local")
    console.log("2. Accede a /ticket/TEST-01 para probar notificaciones de usuario")
    console.log("3. Accede a /admin para probar notificaciones de admin")
    console.log("4. Realiza un pago en TEST-01 para probar el flujo completo")
    console.log("\n🚀 Sistema listo para pruebas!")
  } catch (error) {
    console.error("❌ Error al inicializar la base de datos:", error)
    process.exit(1)
  } finally {
    await client.close()
    console.log("🔌 Conexión cerrada")
  }
}

// Ejecutar el seed
if (require.main === module) {
  seedDatabase()
}

module.exports = { seedDatabase }
