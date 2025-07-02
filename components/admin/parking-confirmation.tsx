"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Car, RefreshCw, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/utils";
import ImageWithFallback from "../image-with-fallback";
import React from "react";

// Deep comparison for arrays with verbose logging (unchanged)
const areArraysEqual = <T extends { _id: string }>(arr1: T[], arr2: T[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(
      "🔍 DEBUG areArraysEqual - Comparing lengths: arr1.length=",
      arr1.length,
      "arr2.length=",
      arr2.length
    );
  }
  if (arr1.length !== arr2.length) return false;
  const result = arr1.every((item1, i) => {
    const item2 = arr2[i];
    const keysMatch = Object.keys(item1).every(
      (key) => {
        const match = item1[key as keyof T] === item2[key as keyof T];
        if (process.env.NODE_ENV === "development" && !match) {
          console.log(
            "🔍 DEBUG areArraysEqual - Mismatch at index",
            i,
            "key",
            key,
            "item1.",
            item1[key as keyof T],
            "item2.",
            item2[key as keyof T]
          );
        }
        return match;
      }
    );
    return keysMatch;
  });
  if (process.env.NODE_ENV === "development") {
    console.log("🔍 DEBUG areArraysEqual - Result:", result);
  }
  return result;
};

interface PendingParking {
  _id: string;
  codigoTicket: string;
  estado: string;
  horaOcupacion?: string;
  carInfo?: {
    _id: string;
    placa: string;
    marca: string;
    modelo: string;
    color: string;
    nombreDueño: string;
    telefono: string;
    horaIngreso: string;
    fechaRegistro?: string;
    imagenes?: {
      plateImageUrl?: string;
      vehicleImageUrl?: string;
      fechaCaptura?: string;
      capturaMetodo?: string;
    };
  };
}

function ParkingConfirmation() {
  const [pendingParkings, setPendingParkings] = useState<PendingParking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [isDataStable, setIsDataStable] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const effectRunCount = useRef(0);
  const renderCount = useRef(0);

  const fetchPendingParkings = useCallback(async () => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 DEBUG fetchPendingParkings - Starting fetch");
    }
    try {
      setIsLoading(true);
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 DEBUG fetchPendingParkings - Set isLoading to true");
      }
      const timestamp = new Date().getTime();
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 DEBUG fetchPendingParkings - Timestamp:", timestamp);
      }
      const response = await fetch(`/api/admin/pending-parkings?t=${timestamp}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
          "If-Modified-Since": lastFetchTime ? new Date(lastFetchTime).toUTCString() : "0",
        },
        next: { revalidate: 0 },
      });
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 DEBUG fetchPendingParkings - Response status:", response.status);
      }

      if (response.ok) {
        const data = await response.json();
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 DEBUG fetchPendingParkings - Received data:", data);
          data.forEach((parking: PendingParking, index: number) => {
            if (parking.carInfo && parking.carInfo.imagenes) {
              console.log(
                `🔍 DEBUG fetchPendingParkings - imagenes for ${parking.codigoTicket} at index ${index}:`,
                parking.carInfo.imagenes
              );
            }
            if (parking.carInfo) {
              console.log(
                `🔍 DEBUG fetchPendingParkings - carInfo for ${parking.codigoTicket} at index ${index}:`,
                {
                  fechaRegistro: parking.carInfo.fechaRegistro,
                  horaIngreso: parking.carInfo.horaIngreso,
                }
              );
            }
          });
        }
        if (!areArraysEqual(pendingParkings, data)) {
          setPendingParkings(data);
          setIsDataStable(false);
          if (process.env.NODE_ENV === "development") {
            console.log(
              `🔍 DEBUG ParkingConfirmation - Updated parkings: ${data.length} items`,
              "New data:",
              data
            );
          }
        } else {
          setIsDataStable(true);
          if (process.env.NODE_ENV === "development") {
            console.log(
              "🔍 DEBUG ParkingConfirmation - Data unchanged, skipping update",
              "Current parkings:",
              pendingParkings
            );
          }
        }
        setLastFetchTime(new Date());
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 DEBUG fetchPendingParkings - Updated lastFetchTime:", lastFetchTime);
        }
      } else if (response.status === 304) {
        setIsDataStable(true);
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 DEBUG ParkingConfirmation - Not Modified (304), data stable");
        }
      }
    } catch (error) {
      console.error("🔍 DEBUG fetchPendingParkings - Error caught:", error);
      setMessage("❌ Error fetching parking data");
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setIsLoading(false);
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 DEBUG fetchPendingParkings - Set isLoading to false");
      }
    }
  }, [pendingParkings, lastFetchTime]);

  useEffect(() => {
    renderCount.current += 1;
    effectRunCount.current += 1;
    if (process.env.NODE_ENV === "development") {
      console.log(
        `🔍 DEBUG useEffect - Entering effect for ParkingConfirmation, run count: ${effectRunCount.current}, render count: ${renderCount.current}`
      );
    }

    if (effectRunCount.current === 1) {
      fetchPendingParkings();
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 DEBUG useEffect - Completed initial fetch");
      }
    } else {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 DEBUG useEffect - Skipping initial fetch, not first run");
      }
    }

    const startInterval = () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 DEBUG useEffect - Cleared previous interval");
        }
      }
      const intervalId = setInterval(() => {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "🔍 DEBUG useEffect - Interval triggered, calling fetchPendingParkings",
            "isDataStable:",
            isDataStable
          );
        }
        fetchPendingParkings();
      }, isDataStable ? 60000 : 30000);
      intervalRef.current = intervalId;
      if (process.env.NODE_ENV === "development") {
        console.log(
          `🔍 DEBUG useEffect - Set new interval: ${isDataStable ? 60000 : 30000}ms`,
          "isDataStable:",
          isDataStable
        );
      }
    };

    startInterval();

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 DEBUG useEffect - Cleared interval on cleanup");
        }
      }
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 DEBUG useEffect - Exiting effect for ParkingConfirmation");
      }
    };
  }, [fetchPendingParkings]);

  const confirmParking = async (ticketCode: string) => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 DEBUG confirmParking - Starting confirmation for ticket:", ticketCode);
    }
    try {
      setConfirmingId(ticketCode);
      setMessage("");
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 DEBUG confirmParking - Set confirmingId and cleared message");
      }

      const timestamp = new Date().getTime();
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 DEBUG confirmParking - Timestamp:", timestamp);
      }
      const response = await fetch(`/api/admin/confirm-parking?t=${timestamp}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        next: { revalidate: 0 },
        body: JSON.stringify({ ticketCode }),
      });
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 DEBUG confirmParking - Response status:", response.status);
      }

      const data = await response.json();
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 DEBUG confirmParking - Response data:", data);
      }

      if (response.ok) {
        setMessage(`✅ ${data.message || "Estacionamiento confirmado exitosamente"}`);
        await fetchPendingParkings(); // Refresh to remove confirmed parking
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 DEBUG confirmParking - Success, updated message and refetched");
        }
      } else {
        setMessage(`❌ ${data.message || "Error al confirmar el estacionamiento"}`);
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 DEBUG confirmParking - Failed, updated message");
        }
      }

      setTimeout(() => setMessage(""), 5000);
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 DEBUG confirmParking - Scheduled message clear after 5s");
      }
    } catch (error) {
      setMessage("❌ Error al confirmar el estacionamiento");
      console.error("🔍 DEBUG confirmParking - Error:", error);
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 DEBUG confirmParking - Set error message");
      }
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setConfirmingId(null);
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 DEBUG confirmParking - Cleared confirmingId");
      }
    }
  };

  const formatDataWithFallback = (value: string | undefined) => {
    if (value === undefined || value === null) {
      return "Dato no proporcionado";
    }
    return value || "Dato no proporcionado";
  };

  if (isLoading) {
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 DEBUG render - Rendering loading state, render count:", renderCount.current);
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>Confirmación de Estacionamiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (process.env.NODE_ENV === "development") {
    console.log("🔍 DEBUG render - Rendering main content, pendingParkings:", pendingParkings, "render count:", renderCount.current);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Confirmación de Estacionamiento</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Confirme que los vehículos están correctamente estacionados para habilitar el cobro
          </p>
        </div>
        <Button onClick={fetchPendingParkings} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert variant={message.includes("❌") ? "destructive" : "default"}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-gray-600">
          <p>
            <strong>Vehículos pendientes de confirmación:</strong> {pendingParkings.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Una vez confirmado, el cliente podrá buscar su ticket y realizar el pago.
          </p>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {pendingParkings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
              <p>No hay vehículos pendientes de confirmación</p>
              <p className="text-sm">Todos los estacionamientos han sido confirmados</p>
            </div>
          ) : (
            pendingParkings.map((parking) => (
              <div key={parking._id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-lg">Espacio: {parking.codigoTicket}</h3>
                    <Badge variant={parking.estado === "estacionado_confirmado" ? "default" : "outline"}>
                      {parking.estado === "estacionado_confirmado" ? "Confirmado" : "Ocupado"}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Registrado</p>
                    <p className="font-medium">
                      {parking.carInfo?.fechaRegistro
                        ? formatDateTime(parking.carInfo.fechaRegistro)
                        : parking.carInfo?.horaIngreso
                        ? formatDateTime(parking.carInfo.horaIngreso)
                        : "Sin fecha"}
                    </p>
                  </div>
                </div>

                {parking.carInfo && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <Car className="h-4 w-4 text-orange-600" />
                      <h4 className="font-medium text-orange-800">Vehículo a Confirmar</h4>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="space-y-3">
                        <h5 className="text-sm font-medium text-gray-700 flex items-center">
                          Imágenes de Referencia
                        </h5>

                        <div className="space-y-2">
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Placa</p>
                            {process.env.NODE_ENV === "development" && (
                              console.log(
                                "🔍 ParkingConfirmation - Passing plateImageUrl to ImageWithFallback:",
                                parking.carInfo.imagenes?.plateImageUrl
                              )
                            )}
                            <ImageWithFallback
                              src={parking.carInfo.imagenes?.plateImageUrl || "/placeholder.svg"}
                              alt="Placa del vehículo"
                              className="w-full h-16 object-cover rounded border mx-auto md:max-w-[8rem] lg:max-w-[10rem]"
                              fallback="/placeholder.svg"
                            />
                          </div>

                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Vehículo</p>
                            {process.env.NODE_ENV === "development" && (
                              console.log(
                                "🔍 ParkingConfirmation - Passing vehicleImageUrl to ImageWithFallback:",
                                parking.carInfo.imagenes?.vehicleImageUrl
                              )
                            )}
                            <ImageWithFallback
                              src={parking.carInfo.imagenes?.vehicleImageUrl || "/placeholder.svg"}
                              alt="Vehículo"
                              className="w-full h-24 object-cover rounded border mx-auto md:max-w-[10rem] lg:max-w-[12rem]"
                              fallback="/placeholder.svg"
                            />
                          </div>
                        </div>

                        {parking.carInfo.imagenes?.fechaCaptura && (
                          <div className="text-xs text-gray-500 text-center">
                            <p>Capturado: {formatDateTime(parking.carInfo.imagenes.fechaCaptura)}</p>
                            {parking.carInfo.imagenes.capturaMetodo && (
                              <p className="capitalize">
                                Método: {parking.carInfo.imagenes.capturaMetodo.replace("_", " ")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div
                        className={`${
                          parking.carInfo.imagenes?.plateImageUrl || parking.carInfo.imagenes?.vehicleImageUrl
                            ? "lg:col-span-2"
                            : "lg:col-span-3"
                        } grid grid-cols-1 md:grid-cols-2 gap-3`}
                      >
                        <div className="space-y-2">
                          <div>
                            <span className="text-gray-600 text-sm">Placa:</span>
                            <span className="font-medium ml-2 text-lg">
                              {formatDataWithFallback(parking.carInfo.placa)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 text-sm">Vehículo:</span>
                            <span className="font-medium ml-2">
                              {formatDataWithFallback(parking.carInfo.marca)}{" "}
                              {formatDataWithFallback(parking.carInfo.modelo)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 text-sm">Color:</span>
                            <span className="font-medium ml-2">{formatDataWithFallback(parking.carInfo.color)}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <span className="text-gray-600 text-sm">Propietario:</span>
                            <span className="font-medium ml-2">
                              {formatDataWithFallback(parking.carInfo.nombreDueño)}
                            </span>
                          </div>
                          {parking.carInfo.telefono &&
                            parking.carInfo.telefono !== "Por definir" &&
                            parking.carInfo.telefono !== "Dato no proporcionado" && (
                              <div>
                                <span className="text-gray-600 text-sm">Teléfono:</span>
                                <span className="font-medium ml-2">{parking.carInfo.telefono}</span>
                              </div>
                            )}
                          <div>
                            <span className="text-gray-600 text-sm">Hora Ingreso:</span>
                            <span className="font-medium ml-2 text-sm">
                              {formatDateTime(parking.carInfo.horaIngreso)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      ⚠️ El cliente NO puede pagar hasta que confirme el estacionamiento
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => confirmParking(parking.codigoTicket)}
                  disabled={confirmingId === parking.codigoTicket || parking.estado === "estacionado_confirmado"}
                  className="w-full"
                  variant={parking.estado === "estacionado_confirmado" ? "secondary" : "default"}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {confirmingId === parking.codigoTicket
                    ? "Confirmando Estacionamiento..."
                    : parking.estado === "estacionado_confirmado"
                    ? "Confirmado"
                    : "Confirmar que el Vehículo está Estacionado"}
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default React.memo(ParkingConfirmation);
