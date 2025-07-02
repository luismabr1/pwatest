"use client";

import type React from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Camera,
  ImageIcon,
  Eye,
  EyeOff,
  Info,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import ImageWithFallback from "../image-with-fallback";

interface Car {
  _id: string;
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  nombreDueño: string;
  telefono: string;
  ticketAsociado: string;
  horaIngreso: string;
  estado: string;
  imagenes?: {
    plateImageUrl?: string;
    vehicleImageUrl?: string;
    fechaCaptura?: string;
    capturaMetodo?: "manual" | "camara_movil" | "camara_desktop";
    confianzaPlaca?: number;
    confianzaVehiculo?: number;
  };
}

interface CarImageViewerProps {
  car: Car;
  onClose: () => void;
  onUpdate: () => void;
}

export default function CarImageViewer({ car, onClose, onUpdate }: CarImageViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [editData, setEditData] = useState({
    placa: car.placa,
    marca: car.marca,
    modelo: car.modelo,
    color: car.color,
    nombreDueño: car.nombreDueño,
    telefono: car.telefono,
    ticketAsociado: car.ticketAsociado, // Added for editing
  });
  const [capturedImages, setCapturedImages] = useState<{
    plate?: string;
    vehicle?: string;
  }>({});
  const [uploadedUrls, setUploadedUrls] = useState<{
    plateUrl?: string;
    vehicleUrl?: string;
  }>({
    plateUrl: car.imagenes?.plateImageUrl,
    vehicleUrl: car.imagenes?.vehicleImageUrl,
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [useFileInput, setUseFileInput] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null); // For vehicle image
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  // Detect device type
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /iphone|ipad|ipod|android|blackberry|windows phone|mobile/i.test(userAgent) || window.innerWidth <= 768;
    setIsMobile(isMobileDevice);
    setUseFileInput(!isMobileDevice); // Force file input on desktop
  }, []);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  // Start camera
  const startCamera = useCallback(async (type: "plate" | "vehicle") => {
    if (!isMobile || !mountedRef.current) return;

    try {
      setMessage("");
      setVideoReady(false);
      setStreamActive(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const constraints = {
        video: selectedCameraId
          ? { deviceId: selectedCameraId, width: { ideal: 640 }, height: { ideal: 480 } }
          : { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setIsCapturing(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.play();
        setVideoReady(true);
        setStreamActive(true);
      }
    } catch (err) {
      setMessage("Error accediendo a la cámara. Intente usar un archivo.");
      setRetryCount((prev) => prev + 1);
      if (retryCount >= 2) setUseFileInput(true);
      setIsCapturing(false);
    }
  }, [isMobile, retryCount, selectedCameraId]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCapturing(false);
    setVideoReady(false);
    setStreamActive(false);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>, type: "plate" | "vehicle") => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImages((prev) => ({ ...prev, [type]: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      setMessage("Por favor seleccione un archivo de imagen válido.");
    }
  }, []);

  // Capture photo
  const capturePhoto = useCallback((type: "plate" | "vehicle") => {
    if (!isMobile || !videoRef.current || !canvasRef.current) {
      setMessage("Error: captura solo disponible en móviles");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context || !videoReady || !streamActive) {
      setMessage("Error: video no está listo para captura");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImages((prev) => ({ ...prev, [type]: imageUrl }));
        stopCamera();
      }
    }, "image/jpeg", 0.9);
  }, [isMobile, stopCamera, videoReady, streamActive]);

  // Upload to Cloudinary
  const uploadToCloudinary = useCallback(async (imageUrl: string, type: "plate" | "vehicle") => {
    setIsLoading(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append("image", blob);
      formData.append("type", type);
      formData.append("method", "auto");

      const uploadResponse = await fetch("/api/admin/process-vehicle", {
        method: "POST",
        body: formData,
      });

      const result = await uploadResponse.json();
      if (result.success) {
        return result.imageUrl;
      } else {
        throw new Error(result.message || "Error subiendo imagen");
      }
    } catch (err) {
      setMessage(`Error subiendo ${type}: ${err}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Process image
  const processImage = useCallback(async (type: "plate" | "vehicle") => {
    if (!capturedImages[type]) return;

    const imageUrl = await uploadToCloudinary(capturedImages[type], type);
    if (imageUrl) {
      setUploadedUrls((prev) => ({
        ...prev,
        [type === "plate" ? "plateUrl" : "vehicleUrl"]: imageUrl,
      }));
    }
  }, [capturedImages, uploadToCloudinary]);

  // Retake photo
  const retakePhoto = useCallback((type: "plate" | "vehicle") => {
    setCapturedImages((prev) => ({ ...prev, [type]: undefined }));
    if (isMobile && !useFileInput) startCamera(type);
  }, [isMobile, startCamera, useFileInput]);

  // Detect cameras
  useEffect(() => {
    if (isMobile) {
      const detectCameras = async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((device) => device.kind === "videoinput");
          setAvailableCameras(videoDevices);
          const backCamera = videoDevices.find((d) => d.label.toLowerCase().includes("back"));
          setSelectedCameraId(backCamera?.deviceId || videoDevices[0]?.deviceId || "");
        } catch (err) {
          setUseFileInput(true);
        }
      };
      detectCameras();
    }
  }, [isMobile]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  // Handle save
  const handleSave = async () => {
    setIsLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("carId", car._id || ""); // Include carId for updates
    formData.append("placa", editData.placa);
    formData.append("marca", editData.marca);
    formData.append("modelo", editData.modelo);
    formData.append("color", editData.color);
    formData.append("nombreDueño", editData.nombreDueño);
    formData.append("telefono", editData.telefono);
    formData.append("ticketAsociado", editData.ticketAsociado); // Added
    if (uploadedUrls.plateUrl) formData.append("plateImageUrl", uploadedUrls.plateUrl);
    if (uploadedUrls.vehicleUrl) formData.append("vehicleImageUrl", uploadedUrls.vehicleUrl);
    if (capturedImages.plate) {
      const plateFile = await fetch(capturedImages.plate)
        .then((res) => res.blob())
        .then((blob) => new File([blob], "plate.jpg", { type: "image/jpeg" }));
      formData.append("plateImage", plateFile);
    }
    if (capturedImages.vehicle) {
      const vehicleFile = await fetch(capturedImages.vehicle)
        .then((res) => res.blob())
        .then((blob) => new File([blob], "vehicle.jpg", { type: "image/jpeg" }));
      formData.append("vehicleImage", vehicleFile);
    }

    try {
      if (process.env.NODE_ENV === "development") console.log("Sending save request", { formData: Object.fromEntries(formData) });
      const response = await fetch("/api/admin/cars", {
        method: car._id ? "PUT" : "POST", // Use PUT for update, POST for create
        body: formData,
      });
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        if (process.env.NODE_ENV === "development") console.log("Invalid JSON response", text);
        throw new Error(`Invalid response: ${text}`);
      }
      if (process.env.NODE_ENV === "development") console.log("Save response", data);
      if (response.ok) {
        setMessage("✅ Información y/o imágenes actualizadas correctamente");
        setUploadedUrls({
          plateUrl: data.car?.imagenes?.plateImageUrl,
          vehicleUrl: data.car?.imagenes?.vehicleImageUrl,
        });
        onUpdate();
        setEditData({
          placa: data.car?.placa || editData.placa,
          marca: data.car?.marca || editData.marca,
          modelo: data.car?.modelo || editData.modelo,
          color: data.car?.color || editData.color,
          nombreDueño: data.car?.nombreDueño || editData.nombreDueño,
          telefono: data.car?.telefono || editData.telefono,
          ticketAsociado: data.car?.ticketAsociado || editData.ticketAsociado,
        }); // Sync with saved data
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`❌ ${data.message || "Error al actualizar"}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.log("Save error", error);
      setMessage("❌ Error de conexión o respuesta inválida");
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setIsLoading(false);
      setCapturedImages({}); // Clear captured images after successful save
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setEditData({
      placa: car.placa,
      marca: car.marca,
      modelo: car.modelo,
      color: car.color,
      nombreDueño: car.nombreDueño,
      telefono: car.telefono,
      ticketAsociado: car.ticketAsociado,
    });
    setCapturedImages({});
    setUploadedUrls({
      plateUrl: car.imagenes?.plateImageUrl,
      vehicleUrl: car.imagenes?.vehicleImageUrl,
    });
    setIsEditing(false);
  };

  // Confidence utilities
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "bg-gray-500";
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getConfidenceText = (confidence?: number) => {
    if (!confidence) return "Sin datos";
    const percentage = Math.round(confidence * 100);
    if (percentage >= 80) return `${percentage}% - Excelente`;
    if (percentage >= 60) return `${percentage}% - Buena`;
    return `${percentage}% - Baja`;
  };

  const getMethodIcon = (method?: string) => {
    switch (method) {
      case "camara_movil": return "📱";
      case "camara_desktop": return "💻";
      case "manual": return "✋";
      default: return "❓";
    }
  };

  const getMethodText = (method?: string) => {
    switch (method) {
      case "camara_movil": return "Cámara Móvil";
      case "camara_desktop": return "Cámara Desktop";
      case "manual": return "Entrada Manual";
      default: return "Método Desconocido";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button onClick={onClose} variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <CardTitle className="flex items-center">
                <ImageIcon className="h-5 w-5 mr-2" />
                Vehículo: {car.placa}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={() => setShowDetails(!showDetails)} variant="outline" size="sm">
                {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showDetails ? "Ocultar" : "Detalles"}
              </Button>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSave}
                    disabled={isLoading || (Object.values(editData).every((v, i) => v === [car.placa, car.marca, car.modelo, car.color, car.nombreDueño, car.telefono, car.ticketAsociado][i]) && !capturedImages.plate && !capturedImages.vehicle)}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert variant={message.includes("❌") ? "destructive" : "default"} className="mb-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Edit Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label>Placa</Label>
                {isEditing ? (
                  <Input name="placa" value={editData.placa} onChange={handleInputChange} className="mt-1" />
                ) : (
                  <p className="text-lg font-semibold">{car.placa}</p>
                )}
              </div>
              <div>
                <Label>Marca</Label>
                {isEditing ? (
                  <Input name="marca" value={editData.marca} onChange={handleInputChange} className="mt-1" />
                ) : (
                  <p>{car.marca}</p>
                )}
              </div>
              <div>
                <Label>Modelo</Label>
                {isEditing ? (
                  <Input name="modelo" value={editData.modelo} onChange={handleInputChange} className="mt-1" />
                ) : (
                  <p>{car.modelo}</p>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Color</Label>
                {isEditing ? (
                  <Input name="color" value={editData.color} onChange={handleInputChange} className="mt-1" />
                ) : (
                  <p>{car.color}</p>
                )}
              </div>
              <div>
                <Label>Propietario</Label>
                {isEditing ? (
                  <Input name="nombreDueño" value={editData.nombreDueño} onChange={handleInputChange} className="mt-1" />
                ) : (
                  <p>{car.nombreDueño}</p>
                )}
              </div>
              <div>
                <Label>Teléfono</Label>
                {isEditing ? (
                  <Input name="telefono" value={editData.telefono} onChange={handleInputChange} className="mt-1" />
                ) : (
                  <p>{car.telefono}</p>
                )}
              </div>
              <div>
                <Label>Ticket Asociado</Label>
                {isEditing ? (
                  <Input name="ticketAsociado" value={editData.ticketAsociado} onChange={handleInputChange} className="mt-1" />
                ) : (
                  <p className="font-medium">{car.ticketAsociado}</p>
                )}
              </div>
            </div>
          </div>

          {/* Image Capture/Upload Section */}
          {isEditing && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-lg font-medium mb-2">Actualizar Imágenes</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {["plate", "vehicle"].map((type) => (
                  <div key={type}>
                    <Label>Imagen de {type === "plate" ? "Placa" : "Vehículo"}</Label>
                    <div className="space-y-2">
                      <input
                        ref={type === "plate" ? fileInputRef : fileInputRef2}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, type)}
                        className="hidden"
                      />
                      <Button
                        onClick={() => (type === "plate" ? fileInputRef.current?.click() : fileInputRef2.current?.click())}
                        className="w-full"
                        size="sm"
                      >
                        <Smartphone className="h-4 w-4 mr-2" />
                        Seleccionar Imagen
                      </Button>
                      {capturedImages[type] && (
                        <div className="space-y-2">
                          <ImageWithFallback
                            src={capturedImages[type] || "/placeholder.svg"}
                            alt={`${type} capturada`}
                            className="w-full h-48 object-cover rounded-lg border mt-2"
                            fallback="/placeholder.svg"
                          />
                          <Button
                            onClick={() => processImage(type)}
                            disabled={isLoading}
                            className="w-full"
                            size="sm"
                          >
                            {isLoading ? "Subiendo..." : "Subir Imagen"}
                          </Button>
                          <Button
                            onClick={() => retakePhoto(type)}
                            variant="outline"
                            className="w-full"
                            size="sm"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Tomar de Nuevo
                          </Button>
                        </div>
                      )}
                      {!capturedImages[type] && isMobile && !useFileInput && (
                        <div>
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full rounded-lg bg-black"
                            style={{ height: "250px", objectFit: "cover" }}
                          />
                          <Button
                            onClick={() => capturePhoto(type)}
                            disabled={!videoReady}
                            className="w-full mt-2"
                            size="sm"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            {videoReady ? "Capturar Foto" : "Preparando..."}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {uploadedUrls.plateUrl && (
                <Alert className="mt-2">
                  <AlertDescription>✅ Imagen de placa subida</AlertDescription>
                </Alert>
              )}
              {uploadedUrls.vehicleUrl && (
                <Alert className="mt-2">
                  <AlertDescription>✅ Imagen de vehículo subida</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Existing Images (Non-editing View) */}
          {!isEditing && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-lg font-medium mb-2">Imágenes</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label>Imagen de Placa</Label>
                  <ImageWithFallback
                    src={car.imagenes?.plateImageUrl || "/placeholder.svg"}
                    alt={`Placa de ${car.placa}`}
                    className="w-full h-48 object-cover rounded-lg border mt-2"
                    fallback="/placeholder.svg"
                  />
                  {car.imagenes?.plateImageUrl && (
                    <Badge className={`mt-2 text-white ${getConfidenceColor(car.imagenes.confianzaPlaca)}`}>
                      {getConfidenceText(car.imagenes.confianzaPlaca)}
                    </Badge>
                  )}
                </div>
                <div>
                  <Label>Imagen del Vehículo</Label>
                  <ImageWithFallback
                    src={car.imagenes?.vehicleImageUrl || "/placeholder.svg"}
                    alt={`Vehículo de ${car.placa}`}
                    className="w-full h-48 object-cover rounded-lg border mt-2"
                    fallback="/placeholder.svg"
                  />
                  {car.imagenes?.vehicleImageUrl && (
                    <Badge className={`mt-2 text-white ${getConfidenceColor(car.imagenes.confianzaVehiculo)}`}>
                      {getConfidenceText(car.imagenes.confianzaVehiculo)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <Label className="text-xs text-gray-500">Ticket</Label>
                <p className="font-medium">{car.ticketAsociado}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Estado</Label>
                <Badge variant={car.estado === "estacionado_confirmado" ? "default" : "secondary"}>{car.estado}</Badge>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Hora de Ingreso</Label>
                <p>{car.horaIngreso ? formatDateTime(car.horaIngreso) : "Sin fecha"}</p>
              </div>
            </div>
          </div>

          {car.imagenes && showDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  Información de Captura
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Método de Captura</Label>
                    <p className="flex items-center">
                      <span className="mr-2">{getMethodIcon(car.imagenes.capturaMetodo)}</span>
                      {getMethodText(car.imagenes.capturaMetodo)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Fecha de Captura</Label>
                    <p>{car.imagenes.fechaCaptura ? formatDateTime(car.imagenes.fechaCaptura) : "No disponible"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Precisión Promedio</Label>
                    <p>
                      {car.imagenes.confianzaPlaca && car.imagenes.confianzaVehiculo
                        ? `${Math.round(((car.imagenes.confianzaPlaca + car.imagenes.confianzaVehiculo) / 2) * 100)}%`
                        : "No disponible"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
