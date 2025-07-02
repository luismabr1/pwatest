"use client"

import type React from "react"
import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CarIcon, RefreshCw, Plus, Camera, Smartphone, Monitor, ImageIcon, Edit, Eye } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils"
import { useMobileDetection } from "@/hooks/use-mobile-detection"
import VehicleCapture from "./vehicle-capture"
import MobileStats from "./mobile-stats"
import MobileCarList from "./mobile-car-list"
import CarImageViewer from "./car-image-viewer"
import ImageWithFallback from "../image-with-fallback"

interface AvailableTicket {
  _id: string
  codigoTicket: string
  estado: string
}

interface Car {
  _id: string
  placa: string
  marca: string
  modelo: string
  color: string
  nombreDueño: string
  telefono: string
  ticketAsociado: string
  horaIngreso: string
  estado: string
  imagenes?: {
    plateImageUrl?: string
    vehicleImageUrl?: string
    fechaCaptura?: string
    capturaMetodo?: "manual" | "camara_movil" | "camara_desktop"
    confianzaPlaca?: number
    confianzaVehiculo?: number
  }
}

interface CarFormData {
  placa: string
  marca: string
  modelo: string
  color: string
  nombreDueño: string
  telefono: string
  ticketAsociado: string
}

// Deep comparison for arrays
const areArraysEqual = <T extends { _id: string }>(arr1: T[], arr2: T[]) => {
  if (arr1.length !== arr2.length) return false
  return arr1.every((item1, i) => {
    const item2 = arr2[i]
    return Object.keys(item1).every((key) => item1[key as keyof T] === item2[key as keyof T])
  })
}

function CarRegistration() {
  const [cars, setCars] = useState<Car[]>([])
  const [availableTickets, setAvailableTickets] = useState<AvailableTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [showVehicleCapture, setShowVehicleCapture] = useState(false)
  const [selectedCarImages, setSelectedCarImages] = useState<Car | null>(null)
  const isMobile = useMobileDetection()
  const cameraRetryCount = useRef(0)
  const maxRetries = 10

  const [formData, setFormData] = useState<CarFormData>({
    placa: "",
    marca: "",
    modelo: "",
    color: "",
    nombreDueño: "",
    telefono: "",
    ticketAsociado: "",
  })

  const [capturedImages, setCapturedImages] = useState<{
    placaUrl?: string
    vehiculoUrl?: string
    confianzaPlaca?: number
    confianzaVehiculo?: number
  } | null>(null)

  const fetchCars = useCallback(async () => {
    try {
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/admin/cars?t=${timestamp}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        next: { revalidate: 0 },
      })
      if (response.ok) {
        const data = await response.json()
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 DEBUG: FetchCars response:", data)
          data.forEach((car: Car, index: number) => {
            console.log(`🔍 DEBUG: Car ${index} - placa: ${car.placa}, horaIngreso: ${car.horaIngreso}`)
          })
        }
        setCars(data)
      } else {
        console.error("🔍 DEBUG: FetchCars response not ok:", response.status)
      }
    } catch (error) {
      console.error("Error fetching cars:", error)
    }
  }, [])

  const fetchAvailableTickets = useCallback(async () => {
    try {
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/admin/available-tickets?t=${timestamp}`, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        next: { revalidate: 0 },
      })
      if (response.ok) {
        const data = await response.json()
        setAvailableTickets((prev) => {
          if (!areArraysEqual(prev, data)) {
            if (process.env.NODE_ENV === "development") {
              console.log(`🔍 DEBUG: Actualizando tickets: ${data.length} disponibles`)
            }
            return data
          }
          return prev
        })
      }
    } catch (error) {
      console.error("Error fetching available tickets:", error)
    }
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log(`🔍 DEBUG: Iniciando fetch de cars y tickets, isMobile: ${isMobile}`)
    }
    Promise.all([fetchCars(), fetchAvailableTickets()])
      .then(() => {
        setIsLoading(false)
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 DEBUG: Fetch completado, isLoading: false")
        }
      })
      .catch(() => {
        setIsLoading(false)
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 DEBUG: Fetch fallido, isLoading: false")
        }
      })
  }, [fetchCars, fetchAvailableTickets, isMobile])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCars()
      fetchAvailableTickets()
    }, 60000)
    return () => clearInterval(interval)
  }, [fetchCars, fetchAvailableTickets])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleTicketChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, ticketAsociado: value }))
  }, [])

  const handleVehicleDetected = useCallback(
    (vehicleData: {
      placa: string
      marca: string
      modelo: string
      color: string
      plateImageUrl: string
      vehicleImageUrl: string
      plateConfidence: number
      vehicleConfidence: number
    }) => {
      setFormData((prev) => ({
        ...prev,
        placa: vehicleData.placa,
        marca: vehicleData.marca,
        modelo: vehicleData.modelo,
        color: vehicleData.color,
      }))
      setCapturedImages({
        placaUrl: vehicleData.plateImageUrl,
        vehiculoUrl: vehicleData.vehicleImageUrl,
        confianzaPlaca: vehicleData.plateConfidence,
        confianzaVehiculo: vehicleData.vehicleConfidence,
      })
      setShowVehicleCapture(false)
      setMessage(
        `✅ Vehículo capturado: ${vehicleData.marca} ${vehicleData.modelo} ${vehicleData.color} - Placa: ${vehicleData.placa}`,
      )
      setTimeout(() => setMessage(""), 5000)
    },
    [],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsSubmitting(true)
      setMessage("")
      try {
        const submitData = {
          ...formData,
          imagenes: capturedImages
            ? {
                plateImageUrl: capturedImages.placaUrl,
                vehicleImageUrl: capturedImages.vehiculoUrl,
                capturaMetodo: isMobile ? "camara_movil" : "camara_desktop",
                confianzaPlaca: capturedImages.confianzaPlaca,
                confianzaVehiculo: capturedImages.confianzaVehiculo,
              }
            : undefined,
        }
        const response = await fetch("/api/admin/cars", {
          method: "POST",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
          next: { revalidate: 0 },
          body: JSON.stringify(submitData),
        })
        const data = await response.json()
        if (response.ok) {
          setMessage(`✅ ${data.message}`)
          setFormData({
            placa: "",
            marca: "",
            modelo: "",
            color: "",
            nombreDueño: "",
            telefono: "",
            ticketAsociado: "",
          })
          setCapturedImages(null)
          await Promise.all([fetchCars(), fetchAvailableTickets()])
        } else {
          setMessage(`❌ ${data.message}`)
        }
        setTimeout(() => setMessage(""), 5000)
      } catch (error) {
        setMessage("❌ Error al registrar el carro")
        setTimeout(() => setMessage(""), 5000)
      } finally {
        setIsSubmitting(false)
      }
    },
    [formData, capturedImages, isMobile, fetchCars, fetchAvailableTickets],
  )

  const isFormValid = useCallback(() => {
    if (isMobile) {
      return formData.placa.trim() !== "" && formData.ticketAsociado.trim() !== ""
    }
    return Object.values(formData).every((value) => value.trim() !== "")
  }, [formData, isMobile])

  const openCamera = useCallback(() => {
    if (cameraRetryCount.current < maxRetries) {
      setShowVehicleCapture(true)
      cameraRetryCount.current += 1
      if (process.env.NODE_ENV === "development") {
        console.log(`🔍 DEBUG: Attempting to open camera, attempt #${cameraRetryCount.current}`)
      }
    } else {
      setMessage("❌ Máximo de intentos de cámara alcanzado. Verifique permisos o hardware.")
      setTimeout(() => setMessage(""), 5000)
    }
  }, [])

  // Función para manejar la actualización después de editar un carro
  const handleCarUpdate = useCallback(() => {
    fetchCars()
    setSelectedCarImages(null)
    setMessage("✅ Información del vehículo actualizada correctamente")
    setTimeout(() => setMessage(""), 3000)
  }, [fetchCars])

  if (process.env.NODE_ENV === "development") {
    console.log(
      `🔍 DEBUG: Renderizando CarRegistration - isLoading: ${isLoading}, showVehicleCapture: ${showVehicleCapture}, selectedCarImages: ${!!selectedCarImages}, isMobile: ${isMobile}, cars: ${cars.length}, tickets: ${availableTickets.length}`,
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {isMobile ? <Smartphone className="h-5 w-5 mr-2" /> : <Monitor className="h-5 w-5 mr-2" />}
            Registro de Carros {isMobile ? "(Móvil)" : "(Desktop)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (showVehicleCapture) {
    return <VehicleCapture onVehicleDetected={handleVehicleDetected} onCancel={() => setShowVehicleCapture(false)} />
  }

  if (selectedCarImages) {
    return (
      <CarImageViewer car={selectedCarImages} onClose={() => setSelectedCarImages(null)} onUpdate={handleCarUpdate} />
    )
  }

  if (isMobile) {
    return (
      <div className="space-y-4 p-4">
        <MobileStats />
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-center text-xl">
              <Camera className="h-6 w-6 mr-2 text-blue-600" />
              Registro Rápido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <Alert variant={message.includes("❌") ? "destructive" : "default"}>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            {availableTickets.length === 0 ? (
              <Alert variant="destructive">
                <AlertDescription>No hay tickets disponibles para asignar.</AlertDescription>
              </Alert>
            ) : (
              <>
                <Button onClick={openCamera} className="w-full py-8 text-lg bg-blue-600 hover:bg-blue-700" size="lg">
                  <Camera className="h-6 w-6 mr-3" />
                  Capturar Vehículo
                </Button>
                {capturedImages && (
                  <Alert>
                    <AlertDescription>
                      <div className="flex items-center space-x-2">
                        <ImageIcon className="h-4 w-4 text-green-600" />
                        <span>
                          ✅ Imágenes capturadas (Placa: {Math.round((capturedImages.confianzaPlaca || 0) * 100)}%,
                          Vehículo: {Math.round((capturedImages.confianzaVehiculo || 0) * 100)}%)
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="placa" className="text-lg">
                      Placa del Vehículo
                    </Label>
                    <Input
                      id="placa"
                      name="placa"
                      value={formData.placa}
                      onChange={handleInputChange}
                      placeholder="Ej. ABC123"
                      required
                      className="text-lg py-6"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticketAsociado" className="text-lg">
                      Ticket de Estacionamiento
                    </Label>
                    <Select value={formData.ticketAsociado} onValueChange={handleTicketChange}>
                      <SelectTrigger className="text-lg py-6">
                        <SelectValue placeholder="Seleccione un ticket" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTickets.map((ticket) => (
                          <SelectItem key={ticket._id} value={ticket.codigoTicket} className="text-lg">
                            {ticket.codigoTicket}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500 text-center">{availableTickets.length} espacios disponibles</p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full py-6 text-lg"
                    disabled={!isFormValid() || isSubmitting}
                    variant={isFormValid() ? "default" : "secondary"}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    {isSubmitting ? "Registrando..." : "Registrar Vehículo"}
                  </Button>
                </form>
                <Alert>
                  <AlertDescription className="text-center">
                    💡 <strong>Tip:</strong> Usa &quot;Capturar Vehículo&quot; para llenar datos automáticamente
                  </AlertDescription>
                </Alert>
              </>
            )}
          </CardContent>
        </Card>
        <MobileCarList cars={cars} onRefresh={fetchCars} onViewImages={setSelectedCarImages} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Monitor className="h-5 w-5 mr-2" />
            Registro Completo (Desktop)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert variant={message.includes("❌") ? "destructive" : "default"} className="mb-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          {availableTickets.length === 0 ? (
            <Alert variant="destructive">
              <AlertDescription>
                No hay tickets disponibles. Crea tickets primero en la pestaña &quot;Gestión de Tickets&quot;.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="placa">Placa del Vehículo</Label>
                  <Input
                    id="placa"
                    name="placa"
                    value={formData.placa}
                    onChange={handleInputChange}
                    placeholder="Ej. ABC123"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticketAsociado">Ticket de Estacionamiento</Label>
                  <Select value={formData.ticketAsociado} onValueChange={handleTicketChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un ticket disponible" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTickets.map((ticket) => (
                        <SelectItem key={ticket._id} value={ticket.codigoTicket}>
                          {ticket.codigoTicket}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">Tickets disponibles: {availableTickets.length}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    name="marca"
                    value={formData.marca}
                    onChange={handleInputChange}
                    placeholder="Ej. Toyota"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input
                    id="modelo"
                    name="modelo"
                    value={formData.modelo}
                    onChange={handleInputChange}
                    placeholder="Ej. Corolla"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    placeholder="Ej. Blanco"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombreDueño">Nombre del Dueño</Label>
                  <Input
                    id="nombreDueño"
                    name="nombreDueño"
                    value={formData.nombreDueño}
                    onChange={handleInputChange}
                    placeholder="Ej. Juan Pérez"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    placeholder="Ej. 0414-1234567"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={!isFormValid() || isSubmitting}>
                  <Plus className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Registrando..." : "Registrar Carro"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Lista de Carros Estacionados - Desktop */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Carros Estacionados Actualmente</CardTitle>
          <Button onClick={fetchCars} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {cars?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay carros estacionados actualmente.</p>
              </div>
            ) : (
              cars
                .filter((car) => car.estado === "estacionado" || car.estado === "estacionado_confirmado")
                .map((car) => (
                  <div
                    key={car._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-lg">{car.placa}</p>
                            <Badge variant={car.estado === "estacionado_confirmado" ? "default" : "secondary"}>
                              {car.estado === "estacionado_confirmado" ? "Confirmado" : "Pendiente"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {car.marca} {car.modelo} - {car.color}
                          </p>
                          <p className="text-sm text-gray-600">
                            Dueño: {car.nombreDueño} | Tel: {car.telefono}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            {car.imagenes?.plateImageUrl && (
                              <ImageWithFallback
                                src={car.imagenes.plateImageUrl || "/placeholder.svg"}
                                alt={`Placa de ${car.placa}`}
                                className="w-24 h-16 object-cover rounded border"
                                fallback="/placeholder.svg"
                              />
                            )}
                            {car.imagenes?.vehicleImageUrl && (
                              <ImageWithFallback
                                src={car.imagenes.vehicleImageUrl || "/placeholder.svg"}
                                alt={`Vehículo de ${car.placa}`}
                                className="w-24 h-16 object-cover rounded border"
                                fallback="/placeholder.svg"
                              />
                            )}
                            {car.imagenes && (
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs text-blue-600 flex items-center">
                                  <ImageIcon className="h-3 w-3 mr-1" />
                                  Con imágenes
                                </span>
                                {car.imagenes.confianzaPlaca && (
                                  <span className="text-xs text-gray-500">
                                    Placa: {Math.round(car.imagenes.confianzaPlaca * 100)}%
                                  </span>
                                )}
                                {car.imagenes.confianzaVehiculo && (
                                  <span className="text-xs text-gray-500">
                                    Vehículo: {Math.round(car.imagenes.confianzaVehiculo * 100)}%
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="font-medium">Ticket: {car.ticketAsociado}</p>
                      <p className="text-sm text-gray-500">
                        Ingreso: {car.horaIngreso ? formatDateTime(car.horaIngreso) : "Sin fecha"}
                      </p>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => setSelectedCarImages(car)}
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        {car.imagenes && (
                          <Button
                            onClick={() => setSelectedCarImages(car)}
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver Imágenes
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default memo(CarRegistration)
