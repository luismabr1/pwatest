import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { placa, marca, modelo, color, nombreDueño, telefono, plateImageUrl, vehicleImageUrl } = body

    console.log("🔄 Actualizando carro:", params.id, body)

    const client = await clientPromise
    const db = client.db("parking")

    // Preparar datos de actualización
    const updateData: any = {
      lastModified: new Date(),
    }

    // Actualizar campos básicos si se proporcionan
    if (placa !== undefined) updateData.placa = placa.toUpperCase()
    if (marca !== undefined) updateData.marca = marca
    if (modelo !== undefined) updateData.modelo = modelo
    if (color !== undefined) updateData.color = color
    if (nombreDueño !== undefined) updateData.nombreDueño = nombreDueño
    if (telefono !== undefined) updateData.telefono = telefono

    // Actualizar imágenes si se proporcionan
    if (plateImageUrl || vehicleImageUrl) {
      const currentCar = await db.collection("cars").findOne({ _id: new ObjectId(params.id) })

      const imagenesActualizadas = {
        ...currentCar?.imagenes,
        fechaCaptura: new Date(),
      }

      if (plateImageUrl) {
        imagenesActualizadas.plateImageUrl = plateImageUrl
      }

      if (vehicleImageUrl) {
        imagenesActualizadas.vehicleImageUrl = vehicleImageUrl
      }

      updateData.imagenes = imagenesActualizadas
    }

    console.log("📝 Datos a actualizar:", updateData)

    const result = await db.collection("cars").updateOne({ _id: new ObjectId(params.id) }, { $set: updateData })

    console.log("✅ Resultado actualización:", result)

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 })
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json({ message: "No se realizaron cambios" }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      message: "Vehículo actualizado correctamente",
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    console.error("❌ Error updating car:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
