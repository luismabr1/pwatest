"use client"

import { memo } from "react"
import { Clock, AlertTriangle, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRealTimeCountdown } from "@/hooks/use-real-time-countdown"

interface ExitTimeDisplayProps {
  tiempoSalida?: string | null
  tiempoSalidaEstimado?: string | null
  fechaPago: string
  codigoTicket?: string
  variant?: "full" | "compact"
}

function ExitTimeDisplay({
  tiempoSalida,
  tiempoSalidaEstimado,
  fechaPago,
  codigoTicket = "Unknown",
  variant = "full",
}: ExitTimeDisplayProps) {
  if (process.env.NODE_ENV === "development") {
    console.log(`🔍 DEBUG: Renderizando ExitTimeDisplay para ticket ${codigoTicket}`)
  }

  const countdown = useRealTimeCountdown({
    tiempoSalida,
    tiempoSalidaEstimado,
    fechaPago,
  })

  if (!tiempoSalida) {
    return null
  }

  const getUrgencyStyles = () => {
    switch (countdown.urgencyLevel) {
      case "critical":
        return {
          container: "bg-red-100 border-red-500 border-2 animate-pulse",
          text: "text-red-900",
          icon: "text-red-600",
          badge: "destructive" as const,
        }
      case "urgent":
        return {
          container: "bg-orange-100 border-orange-500 border-2",
          text: "text-orange-900",
          icon: "text-orange-600",
          badge: "destructive" as const,
        }
      case "warning":
        return {
          container: "bg-yellow-100 border-yellow-500 border-2",
          text: "text-yellow-900",
          icon: "text-yellow-600",
          badge: "secondary" as const,
        }
      default:
        return {
          container: "bg-blue-100 border-blue-500",
          text: "text-blue-900",
          icon: "text-blue-600",
          badge: "outline" as const,
        }
    }
  }

  const styles = getUrgencyStyles()

  const exitTimeLabels: { [key: string]: string } = {
    now: "Inmediatamente",
    "5min": "En 5 minutos",
    "10min": "En 10 minutos",
    "15min": "En 15 minutos",
    "20min": "En 20 minutos",
    "30min": "En 30 minutos",
    "45min": "En 45 minutos",
    "60min": "En 1 hora",
  }

  const originalLabel = exitTimeLabels[tiempoSalida] || tiempoSalida

  const UrgencyIcon =
    countdown.urgencyLevel === "critical" ? Zap : countdown.urgencyLevel === "urgent" ? AlertTriangle : Clock

  if (variant === "compact") {
    return (
      <div className={`p-3 rounded-lg ${styles.container} mb-3`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <UrgencyIcon className={`h-4 w-4 ${styles.icon}`} />
            <h5 className={`font-bold text-sm ${styles.text}`}>Cliente programó salida</h5>
          </div>
          <Badge variant={styles.badge} className="text-xs">
            {countdown.urgencyLevel === "critical"
              ? "CRÍTICO"
              : countdown.urgencyLevel === "urgent"
                ? "URGENTE"
                : countdown.urgencyLevel === "warning"
                  ? "PRONTO"
                  : "OK"}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <p className="opacity-75">Estado</p>
            <p className={`font-bold ${styles.text}`}>{countdown.displayText}</p>
          </div>

          <div className="text-center">
            <p className="opacity-75">En cola</p>
            <p className={`font-bold ${styles.text}`}>{countdown.timeInQueue} min</p>
          </div>

          <div className="text-center">
            <p className="opacity-75">Prioridad</p>
            <p className={`font-bold ${styles.text}`}>
              {countdown.urgencyLevel === "critical"
                ? "MÁXIMA"
                : countdown.urgencyLevel === "urgent"
                  ? "ALTA"
                  : countdown.urgencyLevel === "warning"
                    ? "MEDIA"
                    : "NORMAL"}
            </p>
          </div>
        </div>

        {countdown.isOverdue && (
          <div className="mt-2 p-1 bg-red-200 rounded text-center">
            <p className="text-red-900 font-bold text-xs">🚨 ¡PROCESAR INMEDIATAMENTE! 🚨</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-lg ${styles.container}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <UrgencyIcon className={`h-5 w-5 ${styles.icon}`} />
          <h4 className={`font-bold ${styles.text}`}>⏰ Tiempo de Salida Programado</h4>
        </div>
        <Badge variant={styles.badge} className="font-bold">
          {countdown.urgencyLevel === "critical"
            ? "CRÍTICO"
            : countdown.urgencyLevel === "urgent"
              ? "URGENTE"
              : countdown.urgencyLevel === "warning"
                ? "PRONTO"
                : "NORMAL"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-sm opacity-75">Cliente eligió</p>
          <p className={`font-bold text-lg ${styles.text}`}>{originalLabel}</p>
        </div>

        <div className="text-center">
          <p className="text-sm opacity-75">Estado actual</p>
          <p className={`font-bold text-xl ${styles.text}`}>{countdown.displayText}</p>
        </div>

        <div className="text-center">
          <p className="text-sm opacity-75">Tiempo en cola</p>
          <p className={`font-bold text-lg ${styles.text}`}>{countdown.timeInQueue} min</p>
        </div>
      </div>

      {countdown.isOverdue && (
        <div className="mt-3 p-2 bg-red-200 rounded text-center">
          <p className="text-red-900 font-bold text-sm">🚨 ¡CLIENTE ESPERANDO MÁS DE LO PROGRAMADO! 🚨</p>
        </div>
      )}

      {countdown.urgencyLevel === "urgent" && !countdown.isOverdue && (
        <div className="mt-3 p-2 bg-orange-200 rounded text-center">
          <p className="text-orange-900 font-bold text-sm">⚠️ Validar con prioridad - Cliente sale pronto</p>
        </div>
      )}

      {process.env.NODE_ENV === "development" && (
        <div className="mt-3 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <p>🔧 DEBUG: {codigoTicket}</p>
          <p>
            Tiempo: {tiempoSalida} | Estimado: {tiempoSalidaEstimado || "N/A"}
          </p>
          <p>Pago: {new Date(fechaPago).toLocaleTimeString()}</p>
        </div>
      )}
    </div>
  )
}

export default memo(ExitTimeDisplay)
