"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"

interface CompanySettings {
  nombre: string
  moneda: string
  tasaCambio: number
  tarifaPorHora: number
  tiempoGracia: number
}

interface MobileSettingsProps {
  settings: CompanySettings
  onSettingsUpdate: (settings: CompanySettings) => void
}

const MobileSettings: React.FC<MobileSettingsProps> = ({ settings, onSettingsUpdate }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Empresa:</span>
              <p className="font-medium">{settings.nombre}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Moneda:</span>
              <p className="font-medium">{settings.moneda}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tasa:</span>
              <p className="font-medium">{settings.tasaCambio}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tarifa/Hora:</span>
              <p className="font-medium">${settings.tarifaPorHora}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

MobileSettings.displayName = "MobileSettings"

export default React.memo(MobileSettings)
