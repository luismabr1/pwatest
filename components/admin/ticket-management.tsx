"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, RefreshCw, Ticket } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatDateTime } from "@/lib/utils"

interface TicketStats {
  total: number
  disponibles: number
  ocupados: number
  pagados: number
}

interface TicketData {
  _id: string
  codigoTicket: string
  estado: string
  fechaCreacion: string
  horaOcupacion?: string
}

export default function TicketManagement() {
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    disponibles: 0,
    ocupados: 0,
    pagados: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [cantidad, setCantidad] = useState(10)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/tickets")
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets)
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const createTickets = async () => {
    try {
      setIsCreating(true)
      setMessage("")

      const response = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✅ ${data.message}`)
        await fetchTickets()
        setCantidad(10)
      } else {
        setMessage(`❌ ${data.message}`)
      }

      setTimeout(() => setMessage(""), 5000)
    } catch (error) {
      setMessage("❌ Error al crear tickets")
      setTimeout(() => setMessage(""), 5000)
    } finally {
      setIsCreating(false)
    }
  }

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "disponible":
        return <Badge variant="secondary">Disponible</Badge>
      case "ocupado":
        return <Badge variant="destructive">Ocupado</Badge>
      case "pagado_pendiente":
        return <Badge variant="outline">Pago Pendiente</Badge>
      case "pagado_validado":
        return <Badge>Pagado</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Tickets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.disponibles}</div>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.ocupados}</div>
            <p className="text-xs text-muted-foreground">Ocupados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.pagados}</div>
            <p className="text-xs text-muted-foreground">Pagados</p>
          </CardContent>
        </Card>
      </div>

      {/* Crear Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Crear Nuevos Tickets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert variant={message.includes("❌") ? "destructive" : "default"}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="cantidad">Cantidad de Tickets a Crear</Label>
              <Input
                id="cantidad"
                type="number"
                min="1"
                max="100"
                value={cantidad}
                onChange={(e) => setCantidad(Number.parseInt(e.target.value) || 1)}
                placeholder="Cantidad (máx. 100)"
              />
              <p className="text-sm text-gray-500 mt-1">
                Actualmente hay {stats.total} tickets. Se crearán {cantidad} nuevos.
              </p>
            </div>
            <Button onClick={createTickets} disabled={isCreating || cantidad < 1 || cantidad > 100} className="h-10">
              <Plus className="h-4 w-4 mr-2" />
              {isCreating ? "Creando..." : "Crear Tickets"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lista de Tickets</CardTitle>
          <Button onClick={fetchTickets} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {tickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay tickets creados</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium">{ticket.codigoTicket}</p>
                      <p className="text-sm text-gray-500">Creado: {formatDateTime(ticket.fechaCreacion)}</p>
                      {ticket.horaOcupacion && (
                        <p className="text-sm text-gray-500">Ocupado: {formatDateTime(ticket.horaOcupacion)}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">{getStatusBadge(ticket.estado)}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
