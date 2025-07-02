"use client"

import { useState, useEffect, useMemo } from "react"

interface UseRealTimeCountdownProps {
  tiempoSalida?: string | null // Cambiar a opcional
  tiempoSalidaEstimado?: string | null
  fechaPago: string
}

interface CountdownResult {
  displayText: string
  timeInQueue: number
  urgencyLevel: "normal" | "warning" | "urgent" | "critical"
  isOverdue: boolean
}

export function useRealTimeCountdown({
  tiempoSalida,
  tiempoSalidaEstimado,
  fechaPago,
}: UseRealTimeCountdownProps): CountdownResult {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 10000) // Actualizar cada 10 segundos
    return () => clearInterval(interval)
  }, [])

  const countdown = useMemo(() => {
    if (!tiempoSalida) {
      return {
        displayText: "Sin salida programada",
        timeInQueue: 0,
        urgencyLevel: "normal" as const,
        isOverdue: false,
      }
    }

    const paymentTime = new Date(fechaPago)
    let targetTime: Date

    if (tiempoSalida === "now") {
      targetTime = paymentTime
    } else if (tiempoSalidaEstimado) {
      targetTime = new Date(tiempoSalidaEstimado)
    } else {
      const minutesToAdd =
        {
          "5min": 5,
          "10min": 10,
          "15min": 15,
          "20min": 20,
          "30min": 30,
          "45min": 45,
          "60min": 60,
        }[tiempoSalida] || 0
      targetTime = new Date(paymentTime.getTime() + minutesToAdd * 60000)
    }

    const timeRemaining = Math.ceil((targetTime.getTime() - currentTime.getTime()) / 60000)
    const timeInQueue = Math.max(0, Math.floor((currentTime.getTime() - paymentTime.getTime()) / 60000))

    const urgencyLevel = timeRemaining <= 0 ? "critical" :
                         timeRemaining <= 2 ? "urgent" :
                         timeRemaining <= 5 ? "warning" : "normal"

    const displayText = timeRemaining <= 0 ? `¡ATRASADO ${Math.abs(timeRemaining)} min!` :
                        timeRemaining === 1 ? "Sale en 1 min" :
                        `Sale en ${timeRemaining} min`

    return {
      displayText,
      timeInQueue,
      urgencyLevel,
      isOverdue: timeRemaining <= 0,
    }
  }, [tiempoSalida, tiempoSalidaEstimado, fechaPago, currentTime])

  return countdown
}
