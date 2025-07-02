"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sun, Moon, Smartphone, CreditCard, DollarSign, Clock } from "lucide-react"
import type { CompanySettings, Bank } from "@/lib/types"

export default function CompanySettingsComponent() {
  const [settings, setSettings] = useState<CompanySettings>({
    pagoMovil: {
      banco: "",
      cedula: "",
      telefono: "",
    },
    transferencia: {
      banco: "",
      cedula: "",
      telefono: "",
      numeroCuenta: "",
    },
    tarifas: {
      precioHoraDiurno: 3.0,
      precioHoraNocturno: 4.0,
      tasaCambio: 36.0,
      horaInicioNocturno: "00:00",
      horaFinNocturno: "06:00",
    },
  })

  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
    fetchBanks()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/company-settings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Error al cargar configuración")
      }

      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBanks = async () => {
    try {
      const response = await fetch("/api/banks")
      if (response.ok) {
        const data = await response.json()
        setBanks(data)
      }
    } catch (error) {
      console.error("Error al cargar bancos:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch("/api/admin/company-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error("Error al guardar configuración")
      }

      alert("Configuración guardada exitosamente")
    } catch (error) {
      console.error("Error:", error)
      alert("Error al guardar la configuración")
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (section: keyof CompanySettings, field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configuración de la Empresa</h1>
        <p className="text-gray-600 mt-2">Configura los métodos de pago y tarifas del estacionamiento</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Configuración de Tarifas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Configuración de Tarifas
            </CardTitle>
            <CardDescription>Configura las tarifas diurnas, nocturnas y la tasa de cambio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tarifas por Hora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tarifa Diurna */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Sun className="h-5 w-5 text-yellow-500" />
                  <Label className="text-base font-semibold">Tarifa Diurna</Label>
                </div>
                <div>
                  <Label htmlFor="precioHoraDiurno">Precio por Hora (USD)</Label>
                  <Input
                    id="precioHoraDiurno"
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.tarifas.precioHoraDiurno}
                    onChange={(e) =>
                      updateSettings("tarifas", "precioHoraDiurno", Number.parseFloat(e.target.value) || 0)
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Tarifa Nocturna */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Moon className="h-5 w-5 text-blue-500" />
                  <Label className="text-base font-semibold">Tarifa Nocturna</Label>
                </div>
                <div>
                  <Label htmlFor="precioHoraNocturno">Precio por Hora (USD)</Label>
                  <Input
                    id="precioHoraNocturno"
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.tarifas.precioHoraNocturno}
                    onChange={(e) =>
                      updateSettings("tarifas", "precioHoraNocturno", Number.parseFloat(e.target.value) || 0)
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Horarios Nocturnos */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-purple-500" />
                <Label className="text-base font-semibold">Horario Nocturno</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="horaInicioNocturno">Hora de Inicio</Label>
                  <Input
                    id="horaInicioNocturno"
                    type="time"
                    value={settings.tarifas.horaInicioNocturno}
                    onChange={(e) => updateSettings("tarifas", "horaInicioNocturno", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="horaFinNocturno">Hora de Fin</Label>
                  <Input
                    id="horaFinNocturno"
                    type="time"
                    value={settings.tarifas.horaFinNocturno}
                    onChange={(e) => updateSettings("tarifas", "horaFinNocturno", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                La tarifa nocturna se aplicará desde las {settings.tarifas.horaInicioNocturno} hasta las{" "}
                {settings.tarifas.horaFinNocturno}
              </p>
            </div>

            {/* Tasa de Cambio */}
            <div>
              <Label htmlFor="tasaCambio">Tasa de Cambio (Bs/USD)</Label>
              <Input
                id="tasaCambio"
                type="number"
                step="0.01"
                min="0"
                value={settings.tarifas.tasaCambio}
                onChange={(e) => updateSettings("tarifas", "tasaCambio", Number.parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>

            {/* Vista Previa de Tarifas */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Vista Previa de Tarifas:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-yellow-500" />
                  <span>
                    Diurna: ${settings.tarifas.precioHoraDiurno}/h ={" "}
                    {(settings.tarifas.precioHoraDiurno * settings.tarifas.tasaCambio).toFixed(2)} Bs/h
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-blue-500" />
                  <span>
                    Nocturna: ${settings.tarifas.precioHoraNocturno}/h ={" "}
                    {(settings.tarifas.precioHoraNocturno * settings.tarifas.tasaCambio).toFixed(2)} Bs/h
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Configuración de Pago Móvil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Pago Móvil
            </CardTitle>
            <CardDescription>Configura los datos para recibir pagos móviles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pagoMovilBanco">Banco</Label>
              <Select
                value={settings.pagoMovil.banco}
                onValueChange={(value) => updateSettings("pagoMovil", "banco", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona un banco" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.code} value={bank.name}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="pagoMovilCedula">Cédula</Label>
              <Input
                id="pagoMovilCedula"
                value={settings.pagoMovil.cedula}
                onChange={(e) => updateSettings("pagoMovil", "cedula", e.target.value)}
                placeholder="V-12345678"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="pagoMovilTelefono">Teléfono</Label>
              <Input
                id="pagoMovilTelefono"
                value={settings.pagoMovil.telefono}
                onChange={(e) => updateSettings("pagoMovil", "telefono", e.target.value)}
                placeholder="0414-1234567"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Transferencia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Transferencia Bancaria
            </CardTitle>
            <CardDescription>Configura los datos para recibir transferencias bancarias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="transferenciaBanco">Banco</Label>
              <Select
                value={settings.transferencia.banco}
                onValueChange={(value) => updateSettings("transferencia", "banco", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona un banco" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.code} value={bank.name}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="transferenciaCedula">Cédula/RIF</Label>
              <Input
                id="transferenciaCedula"
                value={settings.transferencia.cedula}
                onChange={(e) => updateSettings("transferencia", "cedula", e.target.value)}
                placeholder="J-12345678-9"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="transferenciaTelefono">Teléfono</Label>
              <Input
                id="transferenciaTelefono"
                value={settings.transferencia.telefono}
                onChange={(e) => updateSettings("transferencia", "telefono", e.target.value)}
                placeholder="0212-1234567"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="transferenciaCuenta">Número de Cuenta</Label>
              <Input
                id="transferenciaCuenta"
                value={settings.transferencia.numeroCuenta}
                onChange={(e) => updateSettings("transferencia", "numeroCuenta", e.target.value)}
                placeholder="0102-0123-45-6789012345"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="px-8">
            {saving ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </div>
      </form>
    </div>
  )
}
