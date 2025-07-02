"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { LogOut, Car, RefreshCw, ImageIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatDateTime } from "@/lib/utils"
import ExitTimeDisplay from "./exit-time-display"
import ImageWithFallback from "../image-with-fallback"
import React from "react"

interface PaidTicket {
  _id: string
  codigoTicket: string
  estado: string
  horaOcupacion?: string
  montoCalculado: number | string
  tiempoSalida?: string
  tiempoSalidaEstimado?: string
  fechaPago?: string
  carInfo?: {
    placa: string
    marca: string
    modelo: string
    color: string
    nombreDueño: string
    telefono: string
    horaIngreso?: string
    fechaRegistro?: string
    imagenes?: {
      plateImageUrl?: string
      vehicleImageUrl?: string
      fechaCaptura?: string
      capturaMetodo?: string
    }
  }
}

const areArraysEqual = <T extends { _id: string }>(arr1: T[], arr2: T[]) => {
  if (arr1.length !== arr2.length) return false
  return arr1.every((item1, i) => item1._id === arr2[i]._id)
}

const VehicleExit = React.memo(() => {
  const [paidTickets, setPaidTickets] = useState<PaidTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const isFetchingRef = useRef(false)
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null)
  const fetchCounterRef = useRef(0)
  const prevPaidTicketsRef = useRef<PaidTicket[]>([])

  // Helper function to safely format monetary values
  const formatMoney = useCallback((value: number | string | undefined): string => {
    if (value === undefined || value === null) return "0.00"
    const numValue = typeof value === "string" ? Number.parseFloat(value) : value
    return isNaN(numValue) ? "0.00" : numValue.toFixed(2)
  }, [])

  // Memoized urgency sorting function
  const getUrgencyScore = useCallback((ticket: PaidTicket) => {
    if (!ticket.fechaPago || !ticket.tiempoSalida) return 0
    const paymentTime = new Date(ticket.fechaPago)
    const currentTime = new Date()
    const minutesToAdd =
      {
        now: 0,
        "5min": 5,
        "10min": 10,
        "15min": 15,
        "20min": 20,
        "30min": 30,
        "45min": 45,
        "60min": 60,
      }[ticket.tiempoSalida] || 0
    const targetTime = new Date(paymentTime.getTime() + minutesToAdd * 60000)
    const timeRemaining = Math.ceil((targetTime.getTime() - currentTime.getTime()) / 60000)
    return timeRemaining <= 0 ? 4 : timeRemaining <= 2 ? 3 : timeRemaining <= 5 ? 2 : 1
  }, [])

  const fetchPaidTickets = useCallback(
    async (showLoading = true, source = "unknown") => {
      fetchCounterRef.current += 1
      const fetchId = fetchCounterRef.current
      if (isFetchingRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log(`🔍 DEBUG: Fetch #${fetchId} in progress (source: ${source}), skipping`)
        }
        return
      }

      try {
        if (process.env.NODE_ENV === "development") {
          console.log(`🔍 DEBUG: Starting fetch #${fetchId} (source: ${source})`)
        }
        if (showLoading) setIsLoading(true)
        isFetchingRef.current = true

        const timestamp = new Date().getTime()
        const response = await fetch(`/api/admin/paid-tickets?t=${timestamp}`, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })
        if (response.ok) {
          const data = await response.json()
          if (process.env.NODE_ENV === "development") {
            console.log(`🔍 DEBUG: Raw paid tickets API response #${fetchId}:`, data)
          }

          const sortedData = [...data].sort((a, b) => getUrgencyScore(b) - getUrgencyScore(a))
          if (!areArraysEqual(sortedData, prevPaidTicketsRef.current)) {
            if (process.env.NODE_ENV === "development") {
              console.log(`🔍 DEBUG: Updated paidTickets #${fetchId} (source: ${source}):`, sortedData)
            }
            setPaidTickets(sortedData)
            prevPaidTicketsRef.current = sortedData
          } else if (process.env.NODE_ENV === "development") {
            console.log(`🔍 DEBUG: Skipping update, data unchanged (source: ${source})`)
          }
        }
      } catch (error) {
        console.error(`🔍 DEBUG: Error fetching paid tickets #${fetchId}:`, error)
      } finally {
        if (showLoading) setIsLoading(false)
        isFetchingRef.current = false
      }
    },
    [getUrgencyScore],
  )

  const handleVehicleExit = useCallback(
    async (ticketCode: string) => {
      try {
        setIsProcessing(ticketCode)
        setMessage("")

        const timestamp = new Date().getTime()
        const response = await fetch(`/api/admin/vehicle-exit?t=${timestamp}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
          body: JSON.stringify({ ticketCode }),
        })

        const data = await response.json()
        if (response.ok) {
          setMessage(`✅ ${data.message}`)
          await fetchPaidTickets(false, "exit-process")
        } else {
          setMessage(`❌ ${data.message}`)
        }
        setTimeout(() => setMessage(""), 5000)
      } catch (error) {
        setMessage("❌ Error al procesar la salida del vehículo")
        setTimeout(() => setMessage(""), 5000)
      } finally {
        setIsProcessing(null)
      }
    },
    [fetchPaidTickets],
  )

  const formatDataWithFallback = useCallback((value: string | undefined) => {
    if (!value || value === "Por definir" || value === "PENDIENTE") return "Dato no proporcionado"
    return value
  }, [])

  const filteredTickets = useMemo(
    () =>
      paidTickets.filter(
        (ticket) =>
          ticket.codigoTicket.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.carInfo?.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.carInfo?.nombreDueño.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [paidTickets, searchTerm],
  )

  // Log the filteredTickets after memoization
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log(`🔍 DEBUG: Filtered tickets after memoization:`, filteredTickets)
      console.log(`🔍 DEBUG: Search term: "${searchTerm}"`)
      console.log(
        `🔍 DEBUG: Number of unique tickets by codigoTicket:`,
        new Set(filteredTickets.map((t) => t.codigoTicket)).size,
      )
    }
  }, [filteredTickets, searchTerm])

  useEffect(() => {
    fetchPaidTickets(true, "initial-mount")

    intervalIdRef.current = setInterval(() => {
      fetchPaidTickets(false, "interval")
    }, 10000)

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current)
        intervalIdRef.current = null
      }
    }
  }, [fetchPaidTickets])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Salida de Vehículos</CardTitle>
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Salida de Vehículos - Liberar Espacios</CardTitle>
        <Button onClick={() => fetchPaidTickets(true, "manual-refresh")} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert variant={message.includes("❌") ? "destructive" : "default"} className="mb-4">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {process.env.NODE_ENV === "development" && (
          <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
            <p className="font-bold">🔧 DEBUG INFO:</p>
            <p>Total tickets: {paidTickets.length}</p>
            <p>
              With tiempoSalida: {paidTickets.filter((t) => t.tiempoSalida).length} | Without:{" "}
              {paidTickets.filter((t) => !t.tiempoSalida).length}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="search">Buscar por ticket, placa o propietario</Label>
            <Input
              id="search"
              placeholder="Ej. PARK001, ABC123, Juan Pérez..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p>
            <strong>Vehículos pagados listos para salir:</strong> {filteredTickets.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Al procesar la salida, el espacio de estacionamiento quedará disponible para nuevos vehículos.
          </p>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay vehículos pagados pendientes de salida</p>
              {searchTerm && <p className="text-sm">No se encontraron resultados para "{searchTerm}"</p>}
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <div key={ticket._id} className="border rounded-lg p-4 space-y-4 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-lg">Espacio: {ticket.codigoTicket}</h3>
                    <Badge variant="outline">Pagado</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Monto Pagado</p>
                    <p className="font-medium">${formatMoney(ticket.montoCalculado)}</p>
                  </div>
                </div>

                {ticket.fechaPago && (
                  <ExitTimeDisplay
                    tiempoSalida={ticket.tiempoSalida}
                    tiempoSalidaEstimado={ticket.tiempoSalidaEstimado}
                    fechaPago={ticket.fechaPago}
                    codigoTicket={ticket.codigoTicket}
                    variant="compact"
                  />
                )}

                {ticket.carInfo && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <Car className="h-4 w-4 text-green-600" />
                      <h4 className="font-medium text-green-800">Vehículo a Retirar</h4>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <div>
                            <span className="text-gray-600 text-sm">Placa:</span>
                            <span className="font-medium ml-2 text-lg">
                              {formatDataWithFallback(ticket.carInfo.placa)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 text-sm">Vehículo:</span>
                            <span className="font-medium ml-2">
                              {formatDataWithFallback(ticket.carInfo.marca)}{" "}
                              {formatDataWithFallback(ticket.carInfo.modelo)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 text-sm">Color:</span>
                            <span className="font-medium ml-2">{formatDataWithFallback(ticket.carInfo.color)}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <span className="text-gray-600 text-sm">Propietario:</span>
                            <span className="font-medium ml-2">
                              {formatDataWithFallback(ticket.carInfo.nombreDueño)}
                            </span>
                          </div>
                          {ticket.carInfo.telefono &&
                            ticket.carInfo.telefono !== "Por definir" &&
                            ticket.carInfo.telefono !== "Dato no proporcionado" && (
                              <div>
                                <span className="text-gray-600 text-sm">Teléfono:</span>
                                <span className="font-medium ml-2">{ticket.carInfo.telefono}</span>
                              </div>
                            )}
                          {(ticket.carInfo.horaIngreso || ticket.carInfo.fechaRegistro || ticket.horaOcupacion) && (
                            <div>
                              <span className="text-gray-600 text-sm">Ingreso:</span>
                              <span className="font-medium ml-2 text-sm">
                                {formatDateTime(
                                  ticket.carInfo.fechaRegistro || ticket.carInfo.horaIngreso || ticket.horaOcupacion,
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {(ticket.carInfo.imagenes?.plateImageUrl || ticket.carInfo.imagenes?.vehicleImageUrl) && (
                        <div className="lg:col-span-3 mt-4">
                          <h5 className="text-sm font-medium text-gray-700 flex items-center mb-2">
                            <ImageIcon className="h-4 w-4 mr-1" />
                            Imágenes de Referencia
                          </h5>
                          <div className="flex flex-wrap gap-4 justify-center">
                            {ticket.carInfo.imagenes?.plateImageUrl && (
                              <div className="text-center">
                                <p className="text-xs text-gray-500 mb-1">Placa</p>
                                <ImageWithFallback
                                  src={ticket.carInfo.imagenes.plateImageUrl || "/placeholder.svg"}
                                  alt="Placa del vehículo"
                                  className="w-64 h-48 object-cover rounded border"
                                  fallback="/placeholder.svg"
                                />
                              </div>
                            )}
                            {ticket.carInfo.imagenes?.vehicleImageUrl && (
                              <div className="text-center">
                                <p className="text-xs text-gray-500 mb-1">Vehículo</p>
                                <ImageWithFallback
                                  src={ticket.carInfo.imagenes.vehicleImageUrl || "/placeholder.svg"}
                                  alt="Vehículo"
                                  className="w-64 h-48 object-cover rounded border"
                                  fallback="/placeholder.svg"
                                />
                              </div>
                            )}
                          </div>
                          {ticket.carInfo.imagenes?.fechaCaptura && (
                            <div className="text-xs text-gray-500 text-center mt-2">
                              <p>Capturado: {formatDateTime(ticket.carInfo.imagenes.fechaCaptura)}</p>
                              {ticket.carInfo.imagenes.capturaMetodo && (
                                <p className="capitalize">
                                  Método: {ticket.carInfo.imagenes.capturaMetodo.replace("_", " ")}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => handleVehicleExit(ticket.codigoTicket)}
                  disabled={isProcessing === ticket.codigoTicket}
                  className="w-full"
                  variant="default"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {isProcessing === ticket.codigoTicket ? "Procesando Salida..." : "Procesar Salida y Liberar Espacio"}
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
})

VehicleExit.displayName = "VehicleExit"

export default VehicleExit
