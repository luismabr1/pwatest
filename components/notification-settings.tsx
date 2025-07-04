"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Settings, CheckCircle2, AlertCircle } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";

interface NotificationSettingsProps {
  userType?: "user" | "admin";
  className?: string;
}

export default function NotificationSettings({ userType = "user", className = "" }: NotificationSettingsProps) {
  const { isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe } = usePushNotifications();
  const router = useRouter();

  const [testNotificationSent, setTestNotificationSent] = useState(false);
  const [testNotificationError, setTestNotificationError] = useState<string | null>(null);

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe(userType);
    }
  };

  const handleTestNotification = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      console.log("🌐 [CLIENT] Enviando solicitud a:", `${baseUrl}/api/send-notification`);
      const response = await fetch(`${baseUrl}/api/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: userType === "admin" ? "admin_payment" : "payment_validated",
          ticketCode: "TEST-001",
          userType,
          data: {
            amount: 50.0,
            plate: "ABC-123",
            reason: "Notificación de prueba",
          },
        }),
      });

      console.log("📡 [CLIENT] Respuesta recibida:", {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [CLIENT] Error en notificación:", errorText);
        setTestNotificationError(`Error: ${response.status} - ${errorText}`);
        return;
      }

      const result = await response.json();
      console.log("📦 [CLIENT] Respuesta JSON:", result);
      setTestNotificationSent(true);
      setTestNotificationError(null);
      setTimeout(() => setTestNotificationSent(false), 3000);
    } catch (error) {
      console.error("❌ [CLIENT] Error enviando notificación:", error);
      setTestNotificationError("Error al enviar la notificación. Verifica la consola.");
    }
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificaciones No Disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tu navegador no soporta notificaciones push. Considera usar Chrome, Firefox o Safari.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Notificaciones
          </div>
          <Badge variant={isSubscribed ? "default" : "secondary"}>{isSubscribed ? "Activas" : "Inactivas"}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {testNotificationSent && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>¡Notificación de prueba enviada! Deberías verla en unos segundos.</AlertDescription>
          </Alert>
        )}

        {testNotificationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{testNotificationError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Notificaciones Push</h4>
              <p className="text-sm text-gray-500">
                {userType === "admin"
                  ? "Recibe alertas de nuevos pagos y solicitudes de salida"
                  : "Recibe actualizaciones sobre tus pagos y vehículo"}
              </p>
            </div>
            <Button
              onClick={handleToggleNotifications}
              disabled={isLoading}
              variant={isSubscribed ? "destructive" : "default"}
            >
              {isLoading ? (
                "Procesando..."
              ) : isSubscribed ? (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Desactivar
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Activar
                </>
              )}
            </Button>
          </div>

          {isSubscribed && (
            <div className="pt-2 border-t">
              <Button onClick={handleTestNotification} variant="outline" size="sm" disabled={testNotificationSent}>
                {testNotificationSent ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Enviada
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Probar Notificación
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {userType === "user" && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-1">Recibirás notificaciones para:</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Confirmación de pago validado</li>
              <li>• Notificación de pago rechazado</li>
              <li>• Confirmación de vehículo estacionado</li>
              <li>• Proceso de salida del vehículo</li>
            </ul>
          </div>
        )}

        {userType === "admin" && (
          <div className="bg-green-50 p-3 rounded-lg">
            <h5 className="font-medium text-green-900 mb-1">Recibirás notificaciones para:</h5>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Nuevos pagos pendientes de validación</li>
              <li>• Solicitudes de salida de vehículos</li>
              <li>• Confirmaciones de estacionamiento</li>
              <li>• Alertas del sistema</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}