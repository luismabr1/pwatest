"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Clock, Car, DollarSign, Calendar, Bell, BellOff } from "lucide-react"
import { PaymentForm } from "./payment-form"
import { useTicketNotifications } from "@/hooks/use-ticket-notifications"
import { toast } from "sonner"

interface TicketInfo {
  _id: string
  codigoTicket: string
  horaEntrada: string
  estado: string
  montoCalculado: number
  montoBs: number
  tasaCambio: number
  ultimoPagoId?: string | null
  carInfo?: {
    placa: string
    marca: string
    modelo: string
    color: string
    nombreDueño: string
    telefono: string
  }
}

interface TicketDetailsProps {
  ticketCode: string
}

export function TicketDetails({ ticketCode }: TicketDetailsProps) {
  const [ticket, setTicket] = useState<TicketInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const { isSupported, isRegistered, isLoading, requestPermission, registerForTicket } =
    useTicketNotifications(ticketCode)

  const fetchTicketDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ticket/${ticketCode}`)

      if (!response.ok) {
        throw new Error("Ticket no encontrado")
      }

      const data = await response.json()
      setTicket(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ticketCode) {
      fetchTicketDetails()
    }
  }, [ticketCode])

  const handleEnableNotifications = async () => {
    try {
      const permission = await requestPermission()
      if (permission === "granted") {
        const registered = await registerForTicket()
        if (registered) {
          toast.success("¡Notificaciones activadas! Te avisaremos cuando tu pago sea validado.")
        } else {
          toast.error("Error al registrar las notificaciones")
        }
      } else {
        toast.error("Permisos de notificación denegados")
      }
    } catch (error) {
      console.error("Error enabling notifications:", error)
      toast.error("Error al activar las notificaciones")
    }
  }

  const getStatusBadge = (estado: string) => {
    const statusMap = {
      activo: { label: "Activo", variant: "default" as const },
      ocupado: { label: "Ocupado", variant: "secondary" as const },
      estacionado_pendiente: { label: "Pendiente Confirmación", variant: "outline" as const },
      estacionado_confirmado: { label: "Estacionado", variant: "default" as const },
      pagado_pendiente_taquilla: { label: "Pago Pendiente", variant: "outline" as const },
      pagado_validado: { label: "Pagado", variant: "default" as const },
      salida_autorizada: { label: "Salida Autorizada", variant: "default" as const },
      completado: { label: "Completado", variant: "outline" as const },
    }

    const status = statusMap[estado as keyof typeof statusMap] || {
      label: estado,
      variant: "secondary" as const,
    }

    return <Badge variant={status.variant}>{status.label}</Badge>
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const calculateDuration = (entrada: string) => {
    const now = new Date()
    const entryTime = new Date(entrada)
    const diffMs = now.getTime() - entryTime.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`
    }
    return `${diffMinutes}m`
  }

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !ticket) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p className="text-lg font-semibold">Error</p>
            <p>{error || "Ticket no encontrado"}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const canPay = ["estacionado_confirmado", "estacionado_pendiente"].includes(ticket.estado)
  const isPaid = ["pagado_validado", "salida_autorizada", "completado"].includes(ticket.estado)

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Ticket {ticket.codigoTicket}</CardTitle>
              <CardDescription>Detalles del estacionamiento</CardDescription>
            </div>
            {getStatusBadge(ticket.estado)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Settings */}
          {isSupported && !isPaid && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {isRegistered ? (
                    <Bell className="h-5 w-5 text-blue-600" />
                  ) : (
                    <BellOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium text-blue-900">
                      {isRegistered ? "Notificaciones Activadas" : "Activar Notificaciones"}
                    </p>
                    <p className="text-sm text-blue-700">
                      {isRegistered
                        ? "Te notificaremos cuando tu pago sea validado"
                        : "Recibe notificaciones sobre el estado de tu pago"}
                    </p>
                  </div>
                </div>
                {!isRegistered && (
                  <Button onClick={handleEnableNotifications} disabled={isLoading} size="sm" variant="outline">
                    {isLoading ? "Activando..." : "Activar"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Vehicle Information */}
          {ticket.carInfo && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center">
                <Car className="mr-2 h-5 w-5" />
                Información del Vehículo
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Placa:</span>
                  <p className="text-lg font-mono">{ticket.carInfo.placa}</p>
                </div>
                {ticket.carInfo.marca && (
                  <div>
                    <span className="font-medium">Marca:</span>
                    <p>{ticket.carInfo.marca}</p>
                  </div>
                )}
                {ticket.carInfo.modelo && (
                  <div>
                    <span className="font-medium">Modelo:</span>
                    <p>{ticket.carInfo.modelo}</p>
                  </div>
                )}
                {ticket.carInfo.color && (
                  <div>
                    <span className="font-medium">Color:</span>
                    <p>{ticket.carInfo.color}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Time Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Información de Tiempo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  Hora de Entrada:
                </span>
                <p className="text-lg">{formatDateTime(ticket.horaEntrada)}</p>
              </div>
              <div>
                <span className="font-medium flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  Tiempo Transcurrido:
                </span>
                <p className="text-lg font-mono">{calculateDuration(ticket.horaEntrada)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Información de Pago
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Monto (USD):</span>
                <p className="text-xl font-bold text-green-600">${ticket.montoCalculado.toFixed(2)}</p>
              </div>
              <div>
                <span className="font-medium">Monto (Bs):</span>
                <p className="text-xl font-bold text-green-600">Bs. {ticket.montoBs.toFixed(2)}</p>
              </div>
              <div>
                <span className="font-medium">Tasa de Cambio:</span>
                <p className="text-lg">Bs. {ticket.tasaCambio.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {canPay && !showPaymentForm && (
              <Button onClick={() => setShowPaymentForm(true)} className="flex-1" size="lg">
                <DollarSign className="mr-2 h-5 w-5" />
                Procesar Pago
              </Button>
            )}

            {showPaymentForm && (
              <Button onClick={() => setShowPaymentForm(false)} variant="outline" className="flex-1" size="lg">
                Cancelar Pago
              </Button>
            )}

            <Button onClick={fetchTicketDetails} variant="outline" size="lg">
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      {showPaymentForm && canPay && (
        <PaymentForm
          ticketCode={ticket.codigoTicket}
          amount={ticket.montoCalculado}
          amountBs={ticket.montoBs}
          exchangeRate={ticket.tasaCambio}
          onPaymentSuccess={() => {
            setShowPaymentForm(false)
            fetchTicketDetails()
          }}
        />
      )}
    </div>
  )
}
