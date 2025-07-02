"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, RotateCcw, Check, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PlateCaptureProps {
  onPlateDetected: (plateData: {
    placa: string
    imageUrl: string
    confidence: number
  }) => void
  onCancel: () => void
}

export default function PlateCapture({ onPlateDetected, onCancel }: PlateCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Cámara trasera en móviles
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsCapturing(true)
      }
    } catch (err) {
      setError("No se pudo acceder a la cámara. Verifique los permisos.")
      console.error("Camera error:", err)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCapturing(false)
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    // Configurar el canvas con las dimensiones del video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convertir a blob y obtener URL
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob)
          setCapturedImage(imageUrl)
          stopCamera()
        }
      },
      "image/jpeg",
      0.8,
    )
  }, [stopCamera])

  const processImage = useCallback(async () => {
    if (!capturedImage) return

    setIsProcessing(true)
    setError(null)

    try {
      // Convertir la imagen a File para subirla
      const response = await fetch(capturedImage)
      const blob = await response.blob()
      const file = new File([blob], "plate-capture.jpg", { type: "image/jpeg" })

      // Crear FormData para subir la imagen
      const formData = new FormData()
      formData.append("image", file)

      // Subir imagen y procesar placa
      const uploadResponse = await fetch("/api/admin/process-plate", {
        method: "POST",
        body: formData,
      })

      const result = await uploadResponse.json()

      if (uploadResponse.ok && result.success) {
        onPlateDetected({
          placa: result.placa,
          imageUrl: result.imageUrl,
          confidence: result.confidence,
        })
      } else {
        setError(result.message || "Error al procesar la imagen")
      }
    } catch (err) {
      setError("Error al procesar la imagen. Intente nuevamente.")
      console.error("Processing error:", err)
    } finally {
      setIsProcessing(false)
    }
  }, [capturedImage, onPlateDetected])

  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    setError(null)
    startCamera()
  }, [startCamera])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isCapturing && !capturedImage && (
          <div className="text-center space-y-4">
            <Camera className="h-16 w-16 mx-auto text-gray-400" />
            <p className="text-sm text-gray-600">Capture la placa del vehículo para registro automático</p>
            <Button onClick={startCamera} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Abrir Cámara
            </Button>
          </div>
        )}

        {isCapturing && (
          <div className="space-y-4">
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" style={{ maxHeight: "300px" }} />
              <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-24 border-2 border-yellow-400 rounded">
                  <span className="absolute -top-6 left-0 text-xs text-yellow-400 font-medium">
                    Alinee la placa aquí
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={capturePhoto} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Capturar
              </Button>
              <Button onClick={onCancel} variant="outline">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {capturedImage && (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={capturedImage || "/placeholder.svg"}
                alt="Captured plate"
                className="w-full rounded-lg"
                style={{ maxHeight: "300px", objectFit: "contain" }}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={processImage} disabled={isProcessing} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                {isProcessing ? "Procesando..." : "Procesar Placa"}
              </Button>
              <Button onClick={retakePhoto} variant="outline">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  )
}
