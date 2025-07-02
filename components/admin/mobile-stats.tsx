"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react"

interface Stats {
  totalTickets: number
  availableTickets: number
  ticketsOcupados: number
  pendingConfirmations: number
  pendingPayments: number
  pagosValidados: number
  vehiculosListosSalida: number
  ingresosTotales: number
}

export default function MobileStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  if (!stats) return null

  const criticalStats = [
    { label: "Disponibles", value: stats.availableTickets, color: "text-green-600" },
    { label: "Pendientes", value: stats.pendingConfirmations, color: "text-orange-600" },
    { label: "Pagos", value: stats.pendingPayments, color: "text-blue-600" },
  ]

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-0 h-auto"
        >
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span className="font-medium">Estadísticas</span>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {!isExpanded && (
          <div className="flex justify-between mt-3 pt-3 border-t">
            {criticalStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {isExpanded && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-lg font-bold text-green-600">{stats.availableTickets}</div>
                <div className="text-xs text-gray-600">Espacios Libres</div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded">
                <div className="text-lg font-bold text-orange-600">{stats.pendingConfirmations}</div>
                <div className="text-xs text-gray-600">Por Confirmar</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="text-lg font-bold text-blue-600">{stats.pendingPayments}</div>
                <div className="text-xs text-gray-600">Pagos Pendientes</div>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded">
                <div className="text-lg font-bold text-purple-600">{stats.vehiculosListosSalida}</div>
                <div className="text-xs text-gray-600">Listos Salida</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
