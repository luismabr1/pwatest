interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
  url?: string;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private vapidKeys = {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
  };

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private isValidSubscription(subscription: PushSubscription): boolean {
    const isValid =
      subscription &&
      typeof subscription.endpoint === "string" &&
      subscription.endpoint.startsWith("https://") &&
      subscription.keys &&
      typeof subscription.keys.p256dh === "string" &&
      typeof subscription.keys.auth === "string" &&
      subscription.keys.p256dh.length > 10 && // Basic length check for validity
      subscription.keys.auth.length > 10;
    console.log(
      `🔍 [PUSH-SERVICE] Validating subscription: Endpoint=${subscription.endpoint.substring(
        0,
        50,
      )}..., Valid=${isValid}`,
    );
    return isValid;
  }

  async sendNotification(subscription: PushSubscription, payload: NotificationPayload): Promise<boolean | string> {
    try {
      if (!this.isValidSubscription(subscription)) {
        console.error("❌ [PUSH-SERVICE] Invalid subscription data");
        return "Invalid subscription";
      }

      const webpush = await import("web-push");

      console.log("🔑 [PUSH-SERVICE] Configurando VAPID keys:");
      console.log("   Public key exists:", !!this.vapidKeys.publicKey);
      console.log("   Private key exists:", !!this.vapidKeys.privateKey);
      console.log("   Public key prefix:", this.vapidKeys.publicKey.substring(0, 10));
      console.log("   Private key prefix:", this.vapidKeys.privateKey.substring(0, 10));

      if (!this.vapidKeys.publicKey || !this.vapidKeys.privateKey) {
        console.error("❌ [PUSH-SERVICE] VAPID keys no configuradas");
        throw new Error("VAPID keys are required");
      }

      webpush.setVapidDetails("mailto:admin@parking.com", this.vapidKeys.publicKey, this.vapidKeys.privateKey);

      console.log("📤 [PUSH-SERVICE] Enviando notificación:");
      console.log("   Endpoint:", subscription.endpoint.substring(0, 50) + "...");
      console.log("   Título:", payload.title);
      console.log("   Cuerpo:", payload.body);
      console.log("   Tag:", payload.tag);

      const result = await webpush.sendNotification(subscription, JSON.stringify(payload));

      console.log("✅ [PUSH-SERVICE] Notificación enviada exitosamente:", payload.title);
      console.log("   Status Code:", result.statusCode);
      console.log("   Headers:", result.headers);

      return true;
    } catch (error: any) {
      console.error("❌ [PUSH-SERVICE] Error enviando notificación:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Status code:", error.statusCode);
      console.error("   Body:", error.body);
      console.error("   Stack:", error.stack);

      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log("🗑️ [PUSH-SERVICE] Suscripción expirada o inválida");
        return "EXPIRED";
      } else if (error.statusCode === 413) {
        console.log("📏 [PUSH-SERVICE] Payload demasiado grande");
        return "PAYLOAD_TOO_LARGE";
      } else if (error.statusCode === 429) {
        console.log("⏰ [PUSH-SERVICE] Rate limit excedido");
        return "RATE_LIMITED";
      } else if (error.name === "TypeError" || error.message.includes("invalid")) {
        console.log("❌ [PUSH-SERVICE] Invalid subscription or endpoint");
        return "INVALID_SUBSCRIPTION";
      }

      return error.message || "Error desconocido";
    }
  }

  async sendToMultipleSubscriptions(subscriptions: PushSubscription[], payload: NotificationPayload): Promise<number> {
    console.log("📤 [PUSH-SERVICE] ===== ENVÍO MASIVO INICIADO =====");
    console.log("   Total suscripciones:", subscriptions.length);
    console.log("   Notificación:", payload.title);

    if (subscriptions.length === 0) {
      console.log("⚠️ [PUSH-SERVICE] No hay suscripciones para enviar");
      return 0;
    }

    let successCount = 0;
    let expiredCount = 0;
    const errors: string[] = [];

    console.log("🔄 [PUSH-SERVICE] Procesando suscripciones...");

    for (let i = 0; i < subscriptions.length; i++) {
      const subscription = subscriptions[i];
      console.log(`📨 [PUSH-SERVICE] Enviando ${i + 1}/${subscriptions.length}...`);
      console.log(`   Endpoint: ${subscription.endpoint.substring(0, 50)}...`);

      if (!this.isValidSubscription(subscription)) {
        errors.push("Invalid subscription data");
        console.log(`❌ [PUSH-SERVICE] ${i + 1}/${subscriptions.length} - Invalid subscription skipped`);
        continue;
      }

      try {
        const result = await this.sendNotification(subscription, payload);

        if (result === true) {
          successCount++;
          console.log(`✅ [PUSH-SERVICE] ${i + 1}/${subscriptions.length} - Éxito`);
        } else if (result === "EXPIRED") {
          expiredCount++;
          console.log(`🗑️ [PUSH-SERVICE] ${i + 1}/${subscriptions.length} - Expirada`);
        } else {
          errors.push(result as string);
          console.log(`❌ [PUSH-SERVICE] ${i + 1}/${subscriptions.length} - Error: ${result}`);
        }
      } catch (error: any) {
        errors.push(error.message);
        console.error(`❌ [PUSH-SERVICE] ${i + 1}/${subscriptions.length} - Exception:`, error.message);
      }

      // Small delay between requests to avoid rate limiting
      if (i < subscriptions.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log("📊 [PUSH-SERVICE] ===== RESUMEN DE ENVÍO =====");
    console.log("   Total suscripciones:", subscriptions.length);
    console.log("   Enviadas exitosamente:", successCount);
    console.log("   Suscripciones expiradas:", expiredCount);
    console.log("   Errores:", errors.length);
    console.log("   Tasa de éxito:", ((successCount / subscriptions.length) * 100).toFixed(1) + "%");

    if (expiredCount > 0) {
      console.log(`🗑️ [PUSH-SERVICE] Suscripciones expiradas encontradas: ${expiredCount}`);
    }

    if (errors.length > 0) {
      console.log("❌ [PUSH-SERVICE] Errores encontrados:");
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log(`📊 [PUSH-SERVICE] Notificaciones enviadas: ${successCount}/${subscriptions.length}`);

    return successCount;
  }

  // Notification factory methods (unchanged)
  createPaymentValidatedNotification(ticketCode: string, amount: number): NotificationPayload {
    return {
      title: "✅ Pago Validado",
      body: `Tu pago de Bs. ${amount.toFixed(2)} para el ticket ${ticketCode} ha sido validado. Ya puedes solicitar la salida de tu vehículo.`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `payment-validated-${ticketCode}`,
      data: { ticketCode, type: "payment_validated", amount },
      url: `/ticket/${ticketCode}`,
      requireInteraction: true,
      actions: [
        { action: "view", title: "Ver Ticket" },
        { action: "close", title: "Cerrar" },
      ],
    };
  }

  createPaymentRejectedNotification(ticketCode: string, reason: string): NotificationPayload {
    return {
      title: "❌ Pago Rechazado",
      body: `Tu pago para el ticket ${ticketCode} ha sido rechazado. Motivo: ${reason}. Por favor, intenta nuevamente.`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `payment-rejected-${ticketCode}`,
      data: { ticketCode, type: "payment_rejected", reason },
      url: `/ticket/${ticketCode}`,
      requireInteraction: true,
      actions: [
        {
          action: "retry",
          title: "Reintentar Pago",
        },
        {
          action: "view",
          title: "Ver Detalles",
        },
      ],
    }
  }

  createVehicleParkedNotification(ticketCode: string, plate: string): NotificationPayload {
    return {
      title: "🚗 Vehículo Estacionado",
      body: `El vehículo ${plate} ha sido estacionado exitosamente. Ticket: ${ticketCode}`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `vehicle-parked-${ticketCode}`,
      data: { ticketCode, type: "vehicle_parked", plate },
      url: `/admin/dashboard`,
      actions: [
        { action: "view", title: "Ver Dashboard" },
      ],
    };
  }

  createVehicleExitNotification(ticketCode: string, plate: string): NotificationPayload {
    return {
      title: "🚪 Vehículo Listo para Salir",
      body: `Tu vehículo ${plate} está listo para salir. Dirígete a la salida del estacionamiento.`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `vehicle-exit-${ticketCode}`,
      data: { ticketCode, type: "vehicle_exit", plate },
      url: `/ticket/${ticketCode}`,
      requireInteraction: true,
      actions: [
        {
          action: "directions",
          title: "Ver Ubicación",
        },
        {
          action: "close",
          title: "Cerrar",
        },
      ],
    }
  }

  createVehicleDeliveredNotification(
    ticketCode: string,
    plate: string,
    duration: number,
    amount: number,
  ): NotificationPayload {
    return {
      title: "🎉 Vehículo Entregado",
      body: `Tu vehículo ${plate} ha sido entregado exitosamente. Duración: ${duration} min. Total: Bs. ${amount.toFixed(2)}`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `vehicle-delivered-${ticketCode}`,
      data: { ticketCode, type: "vehicle_delivered", plate, duration, amount },
      requireInteraction: false,
      actions: [
        {
          action: "close",
          title: "Cerrar",
        },
      ],
    }
  }

  createAdminPaymentNotification(ticketCode: string, amount: number, plate: string): NotificationPayload {
    return {
      title: "💰 Nuevo Pago Recibido",
      body: `Pago de Bs. ${amount.toFixed(2)} recibido para el vehículo ${plate} (${ticketCode}). Requiere validación.`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `admin-payment-${ticketCode}`,
      data: { ticketCode, type: "admin_payment", amount, plate },
      url: "/admin/dashboard",
      requireInteraction: true,
      actions: [
        {
          action: "validate",
          title: "Validar Pago",
        },
        {
          action: "view",
          title: "Ver Detalles",
        },
      ],
    }
  }

  createAdminExitRequestNotification(ticketCode: string, plate: string): NotificationPayload {
    return {
      title: "🚪 Solicitud de Salida",
      body: `El vehículo ${plate} (${ticketCode}) solicita salir del estacionamiento.`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `admin-exit-${ticketCode}`,
      data: { ticketCode, type: "admin_exit_request", plate },
      url: "/admin/dashboard",
      requireInteraction: true,
      actions: [
        {
          action: "approve",
          title: "Aprobar Salida",
        },
        {
          action: "view",
          title: "Ver Detalles",
        },
      ],
    }
  }

  // NEW: Add method for vehicle registered notification
  createVehicleRegisteredNotification(ticketCode: string, plate: string): NotificationPayload {
    return {
      title: "📝 Vehículo Registrado",
      body: `Vehículo ${plate} registrado en el sistema. Ticket: ${ticketCode}`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `vehicle-registered-${ticketCode}`,
      data: { ticketCode, type: "vehicle_registered", plate },
      url: `/admin/dashboard`,
      actions: [
        {
          action: "view",
          title: "Ver Dashboard",
        },
      ],
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance()
