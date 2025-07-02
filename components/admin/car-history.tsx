"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Calendar,
  Car,
  CreditCard,
  FileText,
  Download,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { formatDateTime } from "@/lib/utils"

interface CarHistoryItem {
  _id: string
  placa: string
  marca: string
  modelo: string
  color: string
  nombreDueño: string
  telefono: string
  ticketAsociado: string
  horaIngreso: string
  horaSalida?: string
  montoTotal: number
  estado: string
  fechaRegistro: string
  duracionMinutos?: number
  ultimoEvento?: {
    tipo: string
    fecha: string
    estado: string
  }
}

interface DetailedHistory {
  carId: string
  placa: string
  marca: string
  modelo: string
  color: string
  nombreDueño: string
  telefono: string
  ticketAsociado: string
  eventos: Array<{
    tipo: string
    fecha: string
    estado: string
    datos?: any
  }>
  pagos: Array<{
    pagoId: string
    fecha: string
    fechaValidacion?: string
    monto: number
    montoUsd: number
    tipoPago: string
    estado: string
    referencia?: string
    banco?: string
  }>
  pagosRechazados: Array<{
    pagoId: string
    fecha: string
    fechaRechazo: string
    monto: number
    tipoPago: string
    razonRechazo: string
    montoAceptado: number
    sobrepago: number
  }>
  montosPendientes: Array<{
    monto: number
    fecha: string
    razon: string
    pagoRechazadoId?: string
  }>
  datosVehiculo: any
  ticketData: any
  datosFinales?: any
  estadoActual: string
  fechaRegistro: string
  fechaSalida?: string
  duracionTotalMinutos?: number
  montoTotalPagado?: number
  activo: boolean
  completado: boolean
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export default function CarHistory() {
  const [history, setHistory] = useState<CarHistoryItem[]>([])
  const [detailedHistory, setDetailedHistory] = useState<DetailedHistory | null>(null)
  const [showDetailed, setShowDetailed] = useState(false)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetailed, setIsLoadingDetailed] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchInput, setSearchInput] = useState("")

  useEffect(() => {
    fetchHistory()
  }, [pagination.page, searchTerm])

  const fetchHistory = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm,
      })

      const response = await fetch(`/api/admin/car-history?${params}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setHistory(data.history)
        setPagination(data.pagination)
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching car history:", error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDetailedHistory = async (carId: string) => {
    try {
      setIsLoadingDetailed(true)
      const response = await fetch("/api/admin/car-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        body: JSON.stringify({ carId }),
      })

      if (response.ok) {
        const data = await response.json()
        setDetailedHistory(data)
        setShowDetailed(true)
      } else {
        console.error("Error fetching detailed history:", response.status, response.statusText)
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching detailed history:", error)
      }
    } finally {
      setIsLoadingDetailed(false)
    }
  }

  const handleSearch = () => {
    setSearchTerm(searchInput)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  const exportToCSV = (data: DetailedHistory) => {
    const csvContent = [
      // Header
      "Fecha,Tipo,Estado,Detalles",
      // Events
      ...data.eventos.map(
        (evento) =>
          `"${formatDateTime(evento.fecha)}","${evento.tipo}","${evento.estado}","${JSON.stringify(evento.datos || {})}"`,
      ),
      // Payments
      ...data.pagos.map(
        (pago) =>
          `"${formatDateTime(pago.fecha)}","Pago Validado","${pago.estado}","Monto: ${pago.monto} Bs, Tipo: ${pago.tipoPago}"`,
      ),
      // Rejected payments
      ...data.pagosRechazados.map(
        (pago) =>
          `"${formatDateTime(pago.fecha)}","Pago Rechazado","rechazado","Monto: ${pago.monto} Bs, Razón: ${pago.razonRechazo}"`,
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `historial_${data.placa}_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "activo":
        return <Badge variant="destructive">Estacionado</Badge>
      case "pagado":
        return <Badge>Pagado</Badge>
      case "finalizado":
        return <Badge variant="secondary">Finalizado</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  const getEventTypeBadge = (tipo: string) => {
    const eventTypes: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }
    > = {
      registro_inicial: { label: "Registro", variant: "outline", icon: Car },
      confirmacion_estacionamiento: { label: "Confirmado", variant: "default", icon: CheckCircle },
      pago_registrado: { label: "Pago", variant: "secondary", icon: CreditCard },
      pago_validado: { label: "Validado", variant: "default", icon: CheckCircle },
      pago_rechazado: { label: "Rechazado", variant: "destructive", icon: XCircle },
      salida_vehiculo: { label: "Salida", variant: "secondary", icon: Car },
    }

    const eventType = eventTypes[tipo] || { label: tipo, variant: "outline" as const, icon: FileText }
    const IconComponent = eventType.icon

    return (
      <Badge variant={eventType.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {eventType.label}
      </Badge>
    )
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "N/A"
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "VES",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  if (showDetailed && detailedHistory) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Historial Detallado - {detailedHistory.placa}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {detailedHistory.marca} {detailedHistory.modelo} - {detailedHistory.color}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => exportToCSV(detailedHistory)} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
            <Button onClick={() => setShowDetailed(false)} variant="outline">
              Volver a Lista
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Vehicle Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Propietario</p>
              <p className="font-medium">{detailedHistory.nombreDueño}</p>
              <p className="text-xs text-gray-400">{detailedHistory.telefono}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ticket</p>
              <p className="font-medium">{detailedHistory.ticketAsociado}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estado Actual</p>
              <p className="font-medium">{detailedHistory.estadoActual}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Duración Total</p>
              <p className="font-medium">{formatDuration(detailedHistory.duracionTotalMinutos)}</p>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Pagos Validados</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(detailedHistory.montoTotalPagado || 0)}
                </p>
                <p className="text-xs text-gray-500">{detailedHistory.pagos?.length || 0} pagos</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Pagos Rechazados</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{detailedHistory.pagosRechazados?.length || 0}</p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(detailedHistory.pagosRechazados?.reduce((sum, p) => sum + p.monto, 0) || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Montos Pendientes</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(detailedHistory.montosPendientes?.reduce((sum, p) => sum + p.monto, 0) || 0)}
                </p>
                <p className="text-xs text-gray-500">{detailedHistory.montosPendientes?.length || 0} pendientes</p>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Timeline de Eventos
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {detailedHistory.eventos?.map((evento, index) => (
                <div key={index} className="flex items-start space-x-4 p-3 border rounded-lg">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      {getEventTypeBadge(evento.tipo)}
                      <span className="text-sm text-gray-500">{formatDateTime(evento.fecha)}</span>
                    </div>
                    <p className="text-sm text-gray-600">Estado: {evento.estado}</p>
                    {evento.datos && (
                      <div className="text-xs text-gray-500 mt-1 p-2 bg-gray-50 rounded">
                        {Object.entries(evento.datos).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="font-medium">{key}:</span>
                            <span>{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payments Details */}
          {(detailedHistory.pagos?.length > 0 || detailedHistory.pagosRechazados?.length > 0) && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                Detalles de Pagos
              </h3>

              {/* Validated Payments */}
              {detailedHistory.pagos?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-600 mb-2">Pagos Validados</h4>
                  <div className="space-y-2">
                    {detailedHistory.pagos.map((pago, index) => (
                      <div key={index} className="p-3 border border-green-200 rounded-lg bg-green-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{formatCurrency(pago.monto)}</p>
                            <p className="text-sm text-gray-600">
                              {pago.tipoPago} - {formatDateTime(pago.fecha)}
                            </p>
                            {pago.referencia && <p className="text-xs text-gray-500">Ref: {pago.referencia}</p>}
                          </div>
                          <Badge variant="default">Validado</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejected Payments */}
              {detailedHistory.pagosRechazados?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-600 mb-2">Pagos Rechazados</h4>
                  <div className="space-y-2">
                    {detailedHistory.pagosRechazados.map((pago, index) => (
                      <div key={index} className="p-3 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{formatCurrency(pago.monto)}</p>
                            <p className="text-sm text-gray-600">
                              {pago.tipoPago} - {formatDateTime(pago.fecha)}
                            </p>
                            <p className="text-xs text-red-600">Razón: {pago.razonRechazo}</p>
                            {pago.montoAceptado > 0 && (
                              <p className="text-xs text-green-600">Aceptado: {formatCurrency(pago.montoAceptado)}</p>
                            )}
                            {pago.sobrepago > 0 && (
                              <p className="text-xs text-yellow-600">Sobrepago: {formatCurrency(pago.sobrepago)}</p>
                            )}
                          </div>
                          <Badge variant="destructive">Rechazado</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pending Amounts */}
          {detailedHistory.montosPendientes?.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Montos Pendientes
              </h3>
              <div className="space-y-2">
                {detailedHistory.montosPendientes.map((pendiente, index) => (
                  <div key={index} className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{formatCurrency(pendiente.monto)}</p>
                        <p className="text-sm text-gray-600">{pendiente.razon}</p>
                        <p className="text-xs text-gray-500">{formatDateTime(pendiente.fecha)}</p>
                      </div>
                      <Badge variant="outline">Pendiente</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Carros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Buscar por placa, nombre, marca o ticket..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} variant="outline">
            <Search className="h-4 w-4" />
          </Button>
          <Button onClick={fetchHistory} variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="text-sm text-gray-600">
          Mostrando {history.length} de {pagination.total} registros
        </div>

        {/* History List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No se encontraron registros</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium text-lg">{item.placa}</p>
                      <p className="text-sm text-gray-600">
                        {item.marca} {item.modelo} - {item.color}
                      </p>
                      <p className="text-sm text-gray-600">
                        Dueño: {item.nombreDueño} | Tel: {item.telefono}
                      </p>
                      <p className="text-sm text-gray-500">Ticket: {item.ticketAsociado}</p>
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-1 flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(item.estado)}
                    <Button
                      onClick={() => fetchDetailedHistory(item._id)}
                      variant="outline"
                      size="sm"
                      disabled={isLoadingDetailed}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalle
                    </Button>
                  </div>

                  <p className="text-sm text-gray-500">
                    Ingreso: {item.horaIngreso ? formatDateTime(item.horaIngreso) : "Sin fecha"}
                  </p>

                  {item.horaSalida && (
                    <p className="text-sm text-gray-500">Salida: {formatDateTime(item.horaSalida)}</p>
                  )}

                  {item.duracionMinutos && (
                    <p className="text-sm text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDuration(item.duracionMinutos)}
                    </p>
                  )}

                  {item.montoTotal > 0 && (
                    <p className="text-sm font-medium">Total: {formatCurrency(item.montoTotal)}</p>
                  )}

                  {item.ultimoEvento && <p className="text-xs text-gray-400">Último: {item.ultimoEvento.tipo}</p>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between">
            <Button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>
            <span className="text-sm text-gray-600">
              Página {pagination.page} de {pagination.pages}
            </span>
            <Button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              variant="outline"
              size="sm"
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
