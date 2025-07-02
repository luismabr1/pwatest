import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { nombre, apellido, email, rol } = await request.json()
    const { id } = params

    if (!nombre || !apellido || !email || !rol) {
      return NextResponse.json({ message: "Todos los campos son requeridos" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("parking")

    // Check if email already exists for other staff members
    const existingStaff = await db.collection("staff").findOne({
      email,
      _id: { $ne: new ObjectId(id) },
    })
    if (existingStaff) {
      return NextResponse.json({ message: "El email ya está registrado" }, { status: 400 })
    }

    const result = await db
      .collection("staff")
      .updateOne({ _id: new ObjectId(id) }, { $set: { nombre, apellido, email, rol } })

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Personal no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating staff:", error)
    return NextResponse.json({ message: "Error al actualizar el personal" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const client = await clientPromise
    const db = client.db("parking")

    const result = await db.collection("staff").deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Personal no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting staff:", error)
    return NextResponse.json({ message: "Error al eliminar el personal" }, { status: 500 })
  }
}
