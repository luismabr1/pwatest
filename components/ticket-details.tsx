"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import PaymentForm from "@/components/payment-form"
import type { Ticket } from "@/lib/types"

interface TicketDetailsProps {
  ticket: Ticket
}

export default function TicketDetails({ ticket }: TicketDetailsProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Código de Ticket</p>
                <p className="text-lg font-medium">{ticket.codigoTicket}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Hora de Entrada</p>
                <p className="text-lg font-medium">{formatDateTime(ticket.horaEntrada)}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Monto a Pagar</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(ticket.montoCalculado)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!showPaymentForm ? (
        <Button onClick={() => setShowPaymentForm(true)} className="w-full h-12 text-lg">
          Pagar Ahora
        </Button>
      ) : (
        <PaymentForm ticket={ticket} />
      )}
    </div>
  )
}
