const { MongoClient } = require("mongodb")

async function seedDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    await client.connect()
    console.log("🔗 Conectado a MongoDB")

    const db = client.db("parking")

    // Limpiar colecciones existentes
    console.log("🧹 Limpiando base de datos...")
    await db.collection("company_settings").deleteMany({})
    await db.collection("tickets").deleteMany({})
    await db.collection("cars").deleteMany({})
    await db.collection("pagos").deleteMany({})
    await db.collection("payments").deleteMany({}) // Limpiar colección antigua
    await db.collection("staff").deleteMany({})
    await db.collection("banks").deleteMany({})
    await db.collection("car_history").deleteMany({})

    // 1. Configuración de la empresa con tarifas diurnas/nocturnas
    console.log("🏢 Insertando configuración de empresa...")
    const companySettings = {
      // Configuración de pago móvil
      pagoMovil: {
        banco: "Banco de Venezuela",
        cedula: "V-12345678",
        telefono: "0414-1234567",
      },

      // Configuración de transferencia
      transferencia: {
        banco: "Banco de Venezuela",
        cedula: "J-12345678-9",
        telefono: "0212-1234567",
        numeroCuenta: "0102-0123-45-6789012345",
      },

      // Configuración de tarifas con horarios diurnos y nocturnos
      tarifas: {
        precioHoraDiurno: 3.0, // Tarifa diurna
        precioHoraNocturno: 4.0, // Tarifa nocturna (33% más cara)
        tasaCambio: 36.0,
        horaInicioNocturno: "00:00", // Medianoche
        horaFinNocturno: "06:00", // 6 AM
      },

      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    }

    await db.collection("company_settings").insertOne(companySettings)
    console.log("✅ Configuración de empresa insertada:", {
      pagoMovil: companySettings.pagoMovil.banco,
      transferencia: companySettings.transferencia.banco,
      tarifaDiurna: `$${companySettings.tarifas.precioHoraDiurno}/h`,
      tarifaNocturna: `$${companySettings.tarifas.precioHoraNocturno}/h`,
      horarioNocturno: `${companySettings.tarifas.horaInicioNocturno} - ${companySettings.tarifas.horaFinNocturno}`,
      tasaCambio: `${companySettings.tarifas.tasaCambio} Bs/USD`,
    })

    // 2. Crear espacios de estacionamiento (tickets disponibles)
    console.log("🎫 Creando espacios de estacionamiento...")
    const tickets = []
    for (let i = 1; i <= 50; i++) {
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
    console.log(`✅ ${tickets.length} espacios de estacionamiento creados (PARK001-PARK050)`)

    // 3. Usuario administrador por defecto
    console.log("👤 Creando usuario administrador...")
    const adminUser = {
      nombre: "Administrador",
      apellido: "Sistema",
      email: "admin",
      password: "admin123", // En producción, esto debería estar hasheado
      rol: "administrador",
      fechaCreacion: new Date(),
      activo: true,
    }
    await db.collection("staff").insertOne(adminUser)
    console.log("✅ Usuario administrador creado:", adminUser.email)

    // 4. Lista de bancos venezolanos
    console.log("🏦 Insertando lista de bancos...")
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

    console.log("\n🎉 Base de datos inicializada correctamente!")
    console.log("\n📋 Resumen:")
    console.log(`- Espacios disponibles: ${tickets.length}`)
    console.log(`- Usuario administrador: ${adminUser.email}`)
    console.log(`- Bancos disponibles: ${banks.length}`)
    console.log(`- Tarifa diurna: $${companySettings.tarifas.precioHoraDiurno}/hora`)
    console.log(`- Tarifa nocturna: $${companySettings.tarifas.precioHoraNocturno}/hora`)
    console.log(
      `- Horario nocturno: ${companySettings.tarifas.horaInicioNocturno} - ${companySettings.tarifas.horaFinNocturno}`,
    )
    console.log(`- Tasa de cambio: ${companySettings.tarifas.tasaCambio} Bs/USD`)
    console.log("\n🚀 Sistema listo para usar!")
    console.log("\n🔑 Credenciales de acceso:")
    console.log("- Usuario: 'admin', Contraseña: 'admin123'")
    console.log("\n📱 Base de datos limpia y lista para producción")
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
