import { PendingPayment } from "@/components/pending-payments"

export const EXIT_TIME_MINUTES: Record<string, number> = {
  now: 0,
  "5min": 5,
  "10min": 10,
  "15min": 15,
  "20min": 20,
  "30min": 30,
  "45min": 45,
  "60min": 60,
}

export function getUrgencyScore(payment: PendingPayment): number {
  if (!payment.tiempoSalida) return 1 // Normal por defecto

  const paymentTime = new Date(payment.fechaPago)
  const currentTime = new Date()
  const minutesToAdd = EXIT_TIME_MINUTES[payment.tiempoSalida] || 0
  const targetTime = new Date(paymentTime.getTime() + minutesToAdd * 60000)
  const timeRemaining = Math.ceil((targetTime.getTime() - currentTime.getTime()) / 60000)

  if (timeRemaining <= 0) return 4 // Crítico
  if (timeRemaining <= 2) return 3 // Urgente
  if (timeRemaining <= 5) return 2 // Warning
  return 1 // Normal
}

export function sortPaymentsByUrgency(a: PendingPayment, b: PendingPayment): number {
  if (!a.tiempoSalida && !b.tiempoSalida) return 0
  if (!a.tiempoSalida) return 1
  if (!b.tiempoSalida) return -1
  return getUrgencyScore(b) - getUrgencyScore(a)
}
