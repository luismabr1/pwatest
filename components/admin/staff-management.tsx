"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Save, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { StaffMember } from "@/lib/types"

interface StaffManagementProps {
  onStatsUpdate: () => void
}

export default function StaffManagement({ onStatsUpdate }: StaffManagementProps) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    rol: "operador",
  })

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/staff")
      if (response.ok) {
        const data = await response.json()
        setStaff(data)
      }
    } catch (err) {
      setError("Error al cargar el personal")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError("")
      const url = editingId ? `/api/admin/staff/${editingId}` : "/api/admin/staff"
      const method = editingId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al guardar")
      }

      await fetchStaff()
      onStatsUpdate()
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este miembro del personal?")) return

    try {
      const response = await fetch(`/api/admin/staff/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Error al eliminar")
      }

      await fetchStaff()
      onStatsUpdate()
    } catch (err) {
      setError("Error al eliminar el miembro del personal")
    }
  }

  const startEdit = (member: StaffMember) => {
    setEditingId(member._id)
    setFormData({
      nombre: member.nombre,
      apellido: member.apellido,
      email: member.email,
      rol: member.rol,
    })
    setShowAddForm(true)
  }

  const resetForm = () => {
    setFormData({ nombre: "", apellido: "", email: "", rol: "operador" })
    setEditingId(null)
    setShowAddForm(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestión de Personal</CardTitle>
          <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Personal
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {showAddForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">{editingId ? "Editar Personal" : "Agregar Nuevo Personal"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellido">Apellido</Label>
                      <Input
                        id="apellido"
                        value={formData.apellido}
                        onChange={(e) => setFormData((prev) => ({ ...prev, apellido: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rol">Rol</Label>
                    <select
                      id="rol"
                      value={formData.rol}
                      onChange={(e) => setFormData((prev) => ({ ...prev, rol: e.target.value }))}
                      className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md"
                    >
                      <option value="operador">Operador</option>
                      <option value="administrador">Administrador</option>
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      {editingId ? "Actualizar" : "Guardar"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {staff.map((member) => (
              <div key={member._id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold text-lg">
                        {member.nombre} {member.apellido}
                      </h3>
                      <Badge variant={member.rol === "administrador" ? "default" : "secondary"}>{member.rol}</Badge>
                    </div>
                    <p className="text-gray-600">{member.email}</p>
                    <p className="text-sm text-gray-500">
                      Creado: {new Date(member.fechaCreacion).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => startEdit(member)} variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleDelete(member._id)} variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {staff.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg font-medium">No hay personal registrado</p>
                <p className="text-sm">Agregue el primer miembro del personal</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
