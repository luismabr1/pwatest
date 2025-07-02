import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Simple authentication for demo purposes
    // In production, use proper authentication with hashed passwords
    if (username === "admin" && password === "admin123") {
      return NextResponse.json({ success: true, message: "Autenticación exitosa" })
    }

    return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 })
  } catch (error) {
    console.error("Error in admin login:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}
