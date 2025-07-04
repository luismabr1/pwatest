"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, QrCode, RefreshCw, Printer } from "lucide-react"
import QRCode from "qrcode"

interface Ticket {
  _id: string
  codigoTicket: string
  estado: string
  fechaCreacion?: string
}

export default function QRGenerator() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [generatingQR, setGeneratingQR] = useState<string | null>(null)

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/tickets")
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets)
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateQRCode = async (ticketCode: string) => {
    try {
      setGeneratingQR(ticketCode)

      // Generar la URL que apuntará a la página de pago
      const baseUrl = window.location.origin
      const ticketUrl = `${baseUrl}/ticket/${ticketCode}`

      // Generar el código QR
      const qrDataUrl = await QRCode.toDataURL(ticketUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })

      return qrDataUrl
    } catch (error) {
      console.error("Error generating QR code:", error)
      return null
    } finally {
      setGeneratingQR(null)
    }
  }

  const downloadQR = async (ticketCode: string) => {
    const qrDataUrl = await generateQRCode(ticketCode)
    if (qrDataUrl) {
      const link = document.createElement("a")
      link.download = `QR_${ticketCode}.png`
      link.href = qrDataUrl
      link.click()
    }
  }

  const printQRCard = async (ticketCode: string) => {
    const qrDataUrl = await generateQRCode(ticketCode)
    if (qrDataUrl) {
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Tarjeta QR - ${ticketCode}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 20px;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  background: white;
                }
                
                .card-container {
                  display: flex;
                  border: 2px solid #000;
                  border-radius: 10px;
                  overflow: hidden;
                  background: white;
                  width: 600px;
                  height: 400px;
                }
                
                .card-front, .card-back {
                  width: 300px;
                  height: 400px;
                  padding: 20px;
                  box-sizing: border-box;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                }
                
                .card-front {
                  border-right: 2px dashed #ccc;
                  text-align: center;
                }
                
                .card-back {
                  background: #f9f9f9;
                  transform: scaleX(-1);
                  text-align: center;
                }
                
                .card-back-content {
                  transform: scaleX(-1);
                }
                
                .title {
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 10px;
                  color: #000;
                }
                
                .subtitle {
                  font-size: 16px;
                  color: #666;
                  margin-bottom: 20px;
                }
                
                .qr-code {
                  margin: 20px 0;
                  flex-grow: 1;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                
                .ticket-code {
                  font-size: 20px;
                  font-weight: bold;
                  font-family: monospace;
                  background: #f0f0f0;
                  padding: 10px;
                  border-radius: 5px;
                  margin: 15px 0;
                }
                
                .instructions {
                  font-size: 12px;
                  color: #666;
                  line-height: 1.4;
                }
                
                .disclaimer-title {
                  font-size: 18px;
                  font-weight: bold;
                  margin-bottom: 15px;
                  color: #d32f2f;
                  text-transform: uppercase;
                }
                
                .disclaimer-content {
                  font-size: 11px;
                  line-height: 1.4;
                  color: #333;
                  text-align: justify;
                  margin-bottom: 15px;
                }
                
                .disclaimer-list {
                  font-size: 10px;
                  line-height: 1.3;
                  color: #555;
                  text-align: left;
                }
                
                .disclaimer-list ul {
                  margin: 8px 0;
                  padding-left: 15px;
                }
                
                .disclaimer-list li {
                  margin-bottom: 4px;
                }
                
                .contact-info {
                  font-size: 9px;
                  color: #666;
                  margin-top: auto;
                  padding-top: 10px;
                  border-top: 1px solid #ddd;
                }
                
                .fold-line {
                  position: absolute;
                  left: 50%;
                  top: 0;
                  bottom: 0;
                  width: 2px;
                  background: repeating-linear-gradient(
                    to bottom,
                    #ccc 0px,
                    #ccc 5px,
                    transparent 5px,
                    transparent 10px
                  );
                  transform: translateX(-50%);
                }
                
                .cut-instructions {
                  position: absolute;
                  top: -15px;
                  left: 50%;
                  transform: translateX(-50%);
                  font-size: 10px;
                  color: #999;
                  background: white;
                  padding: 0 10px;
                }
                
                @media print {
                  body { 
                    margin: 0; 
                    padding: 10px;
                  }
                  .card-container { 
                    border: 1px solid #000;
                  }
                  .card-front {
                    border-right: 1px dashed #999;
                  }
                }
              </style>
            </head>
            <body>
              <div style="position: relative;">
                <div class="cut-instructions">✂️ Cortar por la línea y doblar</div>
                <div class="card-container">
                  <!-- CARA FRONTAL -->
                  <div class="card-front">
                    <div>
                      <div class="title">🚗 Parking MoDo Caracas</div>
                      <div class="subtitle">Espacio de Estacionamiento</div>
                    </div>
                    
                    <div class="qr-code">
                      <img src="${qrDataUrl}" alt="QR Code" style="width: 180px; height: 180px;">
                    </div>
                    
                    <div>
                      <div class="ticket-code">${ticketCode}</div>
                      <div class="instructions">
                        <strong>Instrucciones:</strong><br>
                        1. Escanee el código QR<br>
                        2. Complete el proceso de pago<br>
                        3. Espere la validación<br>
                        4. Presente al salir
                      </div>
                    </div>
                  </div>
                  
                  <!-- CARA POSTERIOR (ESPEJO) -->
                  <div class="card-back">
                    <div class="card-back-content">
                      <div>
                        <div class="disclaimer-title">⚠️ Términos</div>
                      </div>
                      
                      <div class="disclaimer-content">
                        <strong>IMPORTANTE:</strong> La empresa NO se hace responsable por la pérdida, robo o daño de esta tarjeta.
                      </div>
                      
                      <div class="disclaimer-list">
                        <strong>Condiciones:</strong>
                        <ul>
                          <li>Tarjeta personal e intransferible</li>
                          <li>Conservar durante toda la estadía</li>
                          <li>Pérdida genera cargos adicionales</li>
                          <li>Pago antes de salir</li>
                          <li>Horarios: 24 horas</li>
                          <li>Tarifas sujetas a cambios</li>
                        </ul>
                      </div>
                      
                      <div class="disclaimer-content">
                        <strong>Responsabilidad:</strong> El usuario es responsable del cuidado de esta tarjeta. Reportar pérdidas inmediatamente.
                      </div>
                      
                      <div class="contact-info">
                        <strong>Contacto:</strong> Personal 24/7<br>
                        <strong>Código:</strong> ${ticketCode}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "disponible":
        return <Badge variant="secondary">Disponible</Badge>
      case "ocupado":
        return <Badge variant="destructive">Ocupado</Badge>
      case "pagado_pendiente":
        return <Badge variant="outline">Pago Pendiente</Badge>
      case "pagado_validado":
        return <Badge>Pagado</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generador de Códigos QR</CardTitle>
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
        <div>
          <CardTitle>Generador de Códigos QR</CardTitle>
          <p className="text-sm text-gray-600 mt-1">Genere códigos QR para cada espacio de estacionamiento</p>
        </div>
        <Button onClick={fetchTickets} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((ticket) => (
            <div key={ticket._id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{ticket.codigoTicket}</h3>
                {getStatusBadge(ticket.estado)}
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => downloadQR(ticket.codigoTicket)}
                  disabled={generatingQR === ticket.codigoTicket}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {generatingQR === ticket.codigoTicket ? "Generando..." : "Descargar QR"}
                </Button>

                <Button
                  onClick={() => printQRCard(ticket.codigoTicket)}
                  disabled={generatingQR === ticket.codigoTicket}
                  className="w-full"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Tarjeta
                </Button>
              </div>
            </div>
          ))}
        </div>

        {tickets.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay tickets disponibles</p>
            <p className="text-sm">Cree tickets primero en la pestaña &quot;Espacios&quot;</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
