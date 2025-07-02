import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("parking")

    const staff = await db.collection("staff").find({}).sort({ fechaCreacion: -1 }).toArray()

    return NextResponse.json(staff)
  } catch (error) {
    console.error("Error fetching staff:", error)
    return NextResponse.json({ message: "Error al obtener el personal" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nombre, apellido, email, rol } = await request.json()

    if (!nombre || !apellido || !email || !rol) {
      return NextResponse.json({ message: "Todos los campos son requeridos" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("parking")

    // Check if email already exists
    const existingStaff = await db.collection("staff").findOne({ email })
    if (existingStaff) {
      return NextResponse.json({ message: "El email ya está registrado" }, { status: 400 })
    }

    const newStaff = {
      nombre,
      apellido,
      email,
      rol,
      fechaCreacion: new Date(),
    }

    const result = await db.collection("staff").insertOne(newStaff)

    return NextResponse.json({ success: true, id: result.insertedId })
  } catch (error) {
    console.error("Error creating staff:", error)
    return NextResponse.json({ message: "Error al crear el personal" }, { status: 500 })
  }
}
