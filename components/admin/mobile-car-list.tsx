"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/utils"
import { Car, Clock, RefreshCw } from "lucide-react"

interface CarInfo {
  _id: string
  placa: string
  marca: string
  modelo: string
  color: string
  estado: string
  fechaIngreso: string
  ticketAsociado: string
}

interface MobileCarListProps {
  onStatsUpdate: () => void
}

const MobileCarList: React.FC<MobileCarListProps> = ({ onStatsUpdate }) => {
  const [cars, setCars] = useState<CarInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchCars = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/cars")
      if (response.ok) {
        const data = await response.json()
        setCars(data)
      }
    } catch (error) {
      console.error("Error fetching cars:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCars()
  }, [fetchCars])

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "estacionado":
        return <Badge variant="secondary">Pendiente Confirmación</Badge>
      case "estacionado_confirmado":
        return <Badge variant="default">Confirmado</Badge>
      case "pago_pendiente_validacion":
        return <Badge variant="destructive">Pago Pendiente</Badge>
      case "pagado_validado":
        return <Badge variant="outline">Pagado - Listo para Salir</Badge>
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Carros Estacionados</h3>
        <Button variant="outline" size="sm" onClick={fetchCars}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {cars.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Car className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No hay carros estacionados</p>
          </CardContent>
        </Card>
      ) : (
        cars.map((car) => (
          <Card key={car._id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  <span className="font-semibold">{car.placa}</span>
                </div>
                {getStatusBadge(car.estado)}
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  {car.marca} {car.modelo} - {car.color}
                </p>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Ingreso: {car.horaIngreso ? formatDateTime(car.horaIngreso) : "Sin fecha"}</span>
                </div>
                <p>Ticket: {car.ticketAsociado}</p>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

MobileCarList.displayName = "MobileCarList"

export default React.memo(MobileCarList)
