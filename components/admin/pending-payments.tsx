"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  CreditCard,
  Calculator,
  TrendingUp,
  Calendar,
  Phone,
  User,
  Building,
  Hash,
  X,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PagoPendiente {
  _id: string
  ticketId: string
  codigoTicket: string
  tipoPago: string
  referenciaTransferencia?: string
  banco?: string
  telefono?: string
  numeroIdentidad?: string
  montoPagado: number
  montoPagadoUsd?: number
  montoCalculado: number
  tasaCambioUsada?: number
  fechaPago: string
  estado: string
  estadoValidacion: string
  tiempoSalida?: string
  tiempoSalidaEstimado?: string
  carInfo?: {
    placa: string
    marca?: string
    modelo?: string
    color?: string
    nombreDueño?: string
    telefono?: string
  }
  urlImagenComprobante?: string
}

export default function PendingPayments() {
  const [pagos, setPagos] = useState<PagoPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [processingPayment, setProcessingPayment] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const fetchPagos = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/pending-payments")
      if (!response.ok) {
        throw new Error("Error al cargar pagos pendientes")
      }
      const data = await response.json()
      setPagos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPagos()
  }, [])

  const handleValidatePayment = async (pagoId: string) => {
    try {
      setProcessingPayment(pagoId)
      const response = await fetch("/api/admin/validate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pagoId }),
      })

      if (!response.ok) {
        throw new Error("Error al validar el pago")
      }

      // Recargar la lista
      await fetchPagos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al validar pago")
    } finally {
      setProcessingPayment(null)
    }
  }

  const handleRejectPayment = async (pagoId: string) => {
    try {
      setProcessingPayment(pagoId)
      const response = await fetch("/api/admin/reject-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pagoId }),
      })

      if (!response.ok) {
        throw new Error("Error al rechazar el pago")
      }

      // Recargar la lista
      await fetchPagos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rechazar pago")
    } finally {
      setProcessingPayment(null)
    }
  }

  const getPaymentTypeLabel = (tipo: string) => {
    switch (tipo) {
      case "pago_movil":
        return "Pago Móvil"
      case "transferencia":
        return "Transferencia"
      case "efectivo_bs":
        return "Efectivo Bs"
      case "efectivo_usd":
        return "Efectivo USD"
      default:
        return tipo
    }
  }

  const getPaymentTypeBadgeColor = (tipo: string) => {
    switch (tipo) {
      case "pago_movil":
        return "bg-green-100 text-green-800"
      case "transferencia":
        return "bg-blue-100 text-blue-800"
      case "efectivo_bs":
        return "bg-yellow-100 text-yellow-800"
      case "efectivo_usd":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const isElectronicPayment = (tipo: string) => {
    return tipo === "pago_movil" || tipo === "transferencia"
  }

  const formatPaymentAmount = (pago: PagoPendiente) => {
    if (isElectronicPayment(pago.tipoPago)) {
      // Para pagos electrónicos, mostrar Bs como principal y USD como referencia
      return {
        principal: formatCurrency(pago.montoPagado, "VES"),
        referencia: pago.montoPagadoUsd ? formatCurrency(pago.montoPagadoUsd, "USD") : null,
      }
    } else {
      // Para efectivo, mostrar según el tipo
      if (pago.tipoPago === "efectivo_bs") {
        return {
          principal: formatCurrency(pago.montoPagado, "VES"),
          referencia: pago.montoPagadoUsd ? formatCurrency(pago.montoPagadoUsd, "USD") : null,
        }
      } else {
        return {
          principal: formatCurrency(pago.montoPagado, "USD"),
          referencia: null,
        }
      }
    }
  }

  const getCalculationFormula = (pago: PagoPendiente) => {
    // Asumiendo una tarifa base de $2/hora (esto debería venir de la configuración)
    const tarifaPorHora = 2.0
    const horas = Math.max(1, Math.ceil(pago.montoCalculado / tarifaPorHora))
    const tasaCambio = pago.tasaCambioUsada || 36

    if (isElectronicPayment(pago.tipoPago)) {
      return {
        formula: `$${tarifaPorHora}/hora × ${horas} hora${horas > 1 ? "s" : ""} × ${tasaCambio} Bs/$`,
        calculo: `$${tarifaPorHora.toFixed(2)} × ${horas} × ${tasaCambio} = ${formatCurrency(pago.montoPagado, "VES")}`,
        montoFinal: formatCurrency(pago.montoPagado, "VES"),
        referencia: formatCurrency(pago.montoCalculado, "USD"),
      }
    } else {
      return {
        formula: `$${tarifaPorHora}/hora × ${horas} hora${horas > 1 ? "s" : ""}`,
        calculo: `$${tarifaPorHora.toFixed(2)} × ${horas} = ${formatCurrency(pago.montoCalculado, "USD")}`,
        montoFinal: formatCurrency(pago.montoCalculado, "USD"),
        referencia: null,
      }
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pagos Pendientes de Validación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pagos Pendientes de Validación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchPagos} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pagos Pendientes de Validación
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{pagos.length} pagos esperando validación</Badge>
            <Button onClick={fetchPagos} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {pagos.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">¡Todo al día!</h3>
              <p className="text-gray-500">No hay pagos pendientes de validación en este momento.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pagos.map((pago) => {
            const paymentAmount = formatPaymentAmount(pago)
            const calculation = getCalculationFormula(pago)

            return (
              <Card key={pago._id} className="w-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">Ticket: {pago.codigoTicket}</h3>
                      <Badge className={getPaymentTypeBadgeColor(pago.tipoPago)}>
                        {getPaymentTypeLabel(pago.tipoPago)}
                      </Badge>
                    </div>
                    {pago.tiempoSalida && pago.tiempoSalida !== "now" && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        <Clock className="h-3 w-3 mr-1" />
                        Cliente programó salida
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Información del vehículo */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Información del Vehículo
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Placa:</span>
                        <span className="ml-2 font-medium">{pago.carInfo?.placa || "No disponible"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Marca:</span>
                        <span className="ml-2 font-medium">{pago.carInfo?.marca || "Por definir"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Modelo:</span>
                        <span className="ml-2 font-medium">{pago.carInfo?.modelo || "Por definir"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Color:</span>
                        <span className="ml-2 font-medium">{pago.carInfo?.color || "Por definir"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cálculo del monto */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Cálculo del Monto
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Fórmula:</span>
                        <span className="ml-2 font-mono bg-white px-2 py-1 rounded text-xs">{calculation.formula}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Cálculo:</span>
                        <span className="ml-2 font-medium">{calculation.calculo}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <span className="text-gray-600">Monto Final:</span>
                        <span className="ml-2 text-lg font-bold text-blue-600">{calculation.montoFinal}</span>
                        {calculation.referencia && (
                          <span className="ml-2 text-sm text-gray-500">({calculation.referencia})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Información del pago */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Monto Pagado:</span>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">{paymentAmount.principal}</div>
                        {paymentAmount.referencia && (
                          <div className="text-sm text-gray-500">{paymentAmount.referencia}</div>
                        )}
                      </div>
                    </div>

                    {/* Información de tasa de cambio para pagos electrónicos */}
                    {isElectronicPayment(pago.tipoPago) && pago.tasaCambioUsada && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <h5 className="font-medium mb-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Información del Cambio
                        </h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Tasa usada:</span>
                            <span className="ml-2 font-medium">{pago.tasaCambioUsada.toFixed(2)} Bs/$</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Fecha:</span>
                            <span className="ml-2 font-medium">
                              {new Date(pago.fechaPago).toLocaleDateString("es-VE")}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Detalles de la transferencia */}
                    {(pago.referenciaTransferencia || pago.banco) && (
                      <div className="space-y-2">
                        {pago.referenciaTransferencia && (
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">Ref:</span>
                            <span className="text-sm font-medium">{pago.referenciaTransferencia}</span>
                          </div>
                        )}
                        {pago.banco && (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">Banco:</span>
                            <span className="text-sm font-medium">{pago.banco}</span>
                          </div>
                        )}
                        {pago.telefono && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">Teléfono:</span>
                            <span className="text-sm font-medium">{pago.telefono}</span>
                          </div>
                        )}
                        {pago.numeroIdentidad && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">Cédula:</span>
                            <span className="text-sm font-medium">{pago.numeroIdentidad}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Comprobante */}
                    {pago.urlImagenComprobante && (
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">Comprobante:</span>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-blue-600"
                          onClick={() => setSelectedImage(pago.urlImagenComprobante!)}
                        >
                          Ver comprobante ↗
                        </Button>
                      </div>
                    )}

                    {/* Fecha del pago */}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>Pago realizado:</span>
                      <span>{new Date(pago.fechaPago).toLocaleString("es-VE")}</span>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => handleValidatePayment(pago._id)}
                      disabled={processingPayment === pago._id}
                      className="flex-1"
                    >
                      {processingPayment === pago._id ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Validar Pago
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleRejectPayment(pago._id)}
                      disabled={processingPayment === pago._id}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rechazar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal para mostrar comprobante */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Comprobante de Pago</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedImage(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <img
                src={selectedImage || "/placeholder.svg"}
                alt="Comprobante de pago"
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
