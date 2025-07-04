# 🚗 Sistema de Estacionamiento - Guía de Instalación

## 📋 Resumen V2 - Estructura y Funcionalidad del Sistema

### 🎯 ¿Qué es este Sistema?
**Sistema de Gestión de Estacionamiento Inteligente** - Una aplicación web completa que digitaliza y automatiza la operación de estacionamientos, desde el registro de vehículos hasta el procesamiento de pagos.

### 🏗️ Estructura del Sistema

#### **Frontend (Interfaz de Usuario)**
- **Página Principal** (`/`): Búsqueda de tickets para clientes
- **Panel de Administración** (`/admin`): Dashboard completo para personal
- **Página de Ticket** (`/ticket/[code]`): Detalles y proceso de pago

#### **Backend (Lógica del Servidor)**
- **APIs de Admin** (`/api/admin/*`): 20+ endpoints para gestión administrativa
- **APIs Públicas** (`/api/*`): Endpoints para clientes (búsqueda, pagos)
- **Base de Datos MongoDB**: 7 colecciones principales

#### **Componentes Principales**
- **Admin Dashboard**: 7 pestañas de gestión (Tickets, Registro, Pagos, etc.)
- **Sistema de Pagos**: Formulario multi-paso para transferencias
- **Generador QR**: Códigos únicos para cada espacio
- **Calculadora de Tarifas**: Automática según horario diurno/nocturno

### 🔄 Flujo de Operación

1. **Llegada del Vehículo**
   - Personal registra vehículo → Asigna ticket → Confirma estacionamiento

2. **Proceso de Pago**
   - Cliente busca ticket → Ve monto calculado → Realiza pago → Envía comprobante

3. **Validación y Salida**
   - Personal valida pago → Cliente puede salir → Personal libera espacio

### 💾 Estructura de Base de Datos

\`\`\`
MongoDB Collections:
├── company_settings    # Configuración general y tarifas
├── tickets            # Espacios de estacionamiento (PARK001-PARK100)
├── cars              # Vehículos registrados
├── pagos             # Pagos realizados por clientes
├── staff             # Personal del sistema (admin/operadores)
├── banks             # Lista de bancos venezolanos
└── car_history       # Historial completo de eventos
\`\`\`

### 🎛️ Panel de Administración (7 Pestañas)

1. **Dashboard**: Estadísticas en tiempo real (6 métricas principales)
2. **Confirmar**: Confirmar estacionamiento de vehículos recién llegados
3. **Tickets**: Crear y gestionar espacios de estacionamiento
4. **Registro**: Registrar nuevos vehículos que llegan
5. **Pagos**: Validar/rechazar pagos pendientes de clientes
6. **Salidas**: Procesar salida de vehículos con pagos validados
7. **Config**: Configurar tarifas diurnas/nocturnas y datos bancarios
8. **Historial**: Búsqueda avanzada en historial completo
9. **Personal**: Gestión de usuarios del sistema

### 🌙 Sistema de Tarifas Inteligente

- **Tarifa Diurna**: Precio estándar durante el día
- **Tarifa Nocturna**: Precio diferenciado para horario nocturno
- **Cálculo Automático**: El sistema determina qué tarifa aplicar según la hora actual
- **Configuración Flexible**: Horarios personalizables (ej: nocturno 00:00-06:00)

### 💳 Métodos de Pago Soportados

- **Pago Móvil**: Con datos bancarios configurables
- **Transferencia Bancaria**: Con información de cuenta empresarial
- **Validación Manual**: Personal revisa y aprueba cada pago

### 📱 Características Técnicas

- **PWA Ready**: Funciona como app móvil
- **Responsive**: Optimizado para móviles y desktop
- **Tiempo Real**: Actualizaciones automáticas cada 30 segundos
- **QR Codes**: Generación y escaneo integrado
- **Búsqueda Avanzada**: Filtros por placa, nombre, marca, ticket
- **Paginación**: Manejo eficiente de grandes volúmenes de datos

### 🔔 Sistema de Notificaciones Push (NUEVO)
- **Notificaciones en Tiempo Real**: Los usuarios reciben notificaciones automáticas sobre el estado de sus pagos
- **Notificaciones para Administradores**: Alertas cuando llegan nuevos pagos o solicitudes de salida
- **Soporte Multiplataforma**: Funciona en Android, iOS y escritorio
- **Tipos de Notificación**:
  - ✅ Pago validado
  - ❌ Pago rechazado
  - 🚗 Vehículo confirmado en estacionamiento
  - 🚪 Vehículo listo para salir
  - 💰 Nuevo pago recibido (admin)
  - 🚪 Solicitud de salida (admin)

### 📱 Progressive Web App (PWA) (NUEVO)
- **Instalación como App**: Los usuarios pueden instalar la aplicación en sus dispositivos
- **Funcionamiento Offline**: Funcionalidad básica disponible sin conexión
- **Acceso Rápido**: Icono en pantalla de inicio como una app nativa
- **Actualizaciones Automáticas**: El sistema se actualiza automáticamente
- **Compatibilidad Universal**: Funciona en Android, iOS, Windows, macOS

### 🎯 Casos de Uso Principales

**Estacionamiento Comercial**: Centros comerciales, oficinas, hospitales
**Estacionamiento Residencial**: Edificios, condominios
**Eventos**: Conciertos, ferias, eventos deportivos
**Aeropuertos**: Estacionamientos de corta y larga estadía

---

## 📋 Requisitos Previos

- **Node.js** 18+ 
- **MongoDB** (local o MongoDB Atlas)
- **Cloudinary** (para almacenamiento de imágenes)
- **Cuenta de Vercel** (para despliegue)
- **Claves VAPID** (para notificaciones push - se generan automáticamente)

## 🚀 Instalación Rápida

### 1. Clonar el Repositorio
\`\`\`bash
git clone <url-del-repositorio>
cd parking-app
\`\`\`

### 2. Instalar Dependencias
\`\`\`bash
npm install
\`\`\`

### 3. Configurar Variables de Entorno
Crear archivo `.env.local`:
\`\`\`env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/parking
# O para MongoDB Atlas:
# MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/parking

# Cloudinary (para imágenes)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# URL base de la aplicación
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# OCR Service (opcional)
PYTHON_OCR_API_URL=http://localhost:8000

# Notificaciones Push (se generan automáticamente al ejecutar npm run seed)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=tu_clave_publica_vapid
VAPID_PRIVATE_KEY=tu_clave_privada_vapid
\`\`\`

### 4. Inicializar Base de Datos
\`\`\`bash
npm run seed
\`\`\`

### 5. Ejecutar en Desarrollo
\`\`\`bash
npm run dev
\`\`\`

La aplicación estará disponible en `http://localhost:3000`

## 🔧 Configuración Detallada

### MongoDB Setup

#### Opción 1: MongoDB Local
\`\`\`bash
# Instalar MongoDB
# Ubuntu/Debian:
sudo apt-get install mongodb

# macOS:
brew install mongodb-community

# Iniciar servicio
sudo systemctl start mongodb
\`\`\`

#### Opción 2: MongoDB Atlas (Recomendado)
1. Crear cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crear cluster gratuito
3. Obtener string de conexión
4. Configurar en `.env.local`

### Cloudinary Setup
1. Crear cuenta en [Cloudinary](https://cloudinary.com)
2. Obtener credenciales del dashboard
3. Configurar en `.env.local`

## 🔔 Configuración de Notificaciones Push

### Generación Automática de Claves VAPID
Las claves VAPID necesarias para las notificaciones push se generan automáticamente cuando ejecutas:

\`\`\`bash
npm run seed
\`\`\`

Este comando:
1. Genera un par de claves VAPID únicas
2. Las guarda en tu archivo `.env.local`
3. Configura el sistema de notificaciones

### Activación Manual de Notificaciones (si es necesario)
Si necesitas generar nuevas claves VAPID manualmente:

\`\`\`bash
# Instalar web-push globalmente
npm install -g web-push

# Generar claves VAPID
web-push generate-vapid-keys

# Agregar las claves a tu .env.local
\`\`\`

### Configuración en Producción
Para el despliegue en Vercel:
1. Las claves VAPID se configuran automáticamente
2. Asegúrate de que `NEXT_PUBLIC_BASE_URL` apunte a tu dominio de producción
3. Las notificaciones funcionarán automáticamente

## 📱 Configuración PWA (Progressive Web App)

### Características PWA Incluidas
- ✅ **Manifest.json**: Configuración completa de la app
- ✅ **Service Worker**: Para funcionalidad offline
- ✅ **Iconos**: Generados automáticamente en múltiples tamaños
- ✅ **Instalación Guiada**: Prompt automático para instalar
- ✅ **Modo Standalone**: Funciona como app nativa
- ✅ **Actualizaciones**: Sistema de actualización automática

### Instalación de la PWA

#### En Android/Chrome:
1. Visita la aplicación en Chrome
2. Aparecerá automáticamente un prompt de instalación
3. Toca "Instalar" para agregar a pantalla de inicio

#### En iOS/Safari:
1. Abre la app en Safari
2. Toca el botón "Compartir" 
3. Selecciona "Agregar a pantalla de inicio"
4. Confirma la instalación

#### En Escritorio:
1. Visita la app en Chrome/Edge
2. Busca el ícono de instalación en la barra de direcciones
3. Haz clic para instalar como aplicación de escritorio

### Funcionalidad Offline
La PWA incluye funcionalidad básica offline:
- **Página de inicio**: Disponible sin conexión
- **Búsqueda de tickets**: Cache de búsquedas recientes
- **Interfaz completa**: UI disponible offline
- **Sincronización**: Los datos se sincronizan al reconectar

## 🎯 Funcionalidades Principales

### 🌙 Sistema de Tarifas Diurnas/Nocturnas
- **Tarifa Diurna**: Aplicada durante horas normales
- **Tarifa Nocturna**: Aplicada durante horario nocturno (configurable)
- **Configuración Flexible**: Horarios personalizables desde el panel admin
- **Cálculo Automático**: El sistema determina qué tarifa aplicar según la hora

#### Configuración de Tarifas:
\`\`\`javascript
// Ejemplo de configuración
{
  tarifas: {
    precioHoraDiurno: 3.0,    // $3.00/hora durante el día
    precioHoraNocturno: 4.0,  // $4.00/hora durante la noche
    tasaCambio: 36.0,         // 36 Bs/USD
    horaInicioNocturno: "00:00", // Inicio horario nocturno
    horaFinNocturno: "06:00"     // Fin horario nocturno
  }
}
\`\`\`

### 📱 Panel de Administración
- **Gestión de Vehículos**: Registro, seguimiento y salida
- **Validación de Pagos**: Pago móvil y transferencias
- **Configuración**: Tarifas, métodos de pago, horarios
- **Reportes**: Estadísticas y historial

### 💳 Métodos de Pago
- **Pago Móvil**: Configuración de datos bancarios
- **Transferencia**: Número de cuenta y datos del beneficiario
- **Efectivo**: Registro manual de pagos

### 🎫 Sistema de Tickets
- **Códigos QR**: Generación automática
- **Estados**: Disponible, ocupado, pagado, finalizado
- **Seguimiento**: Historial completo de cada espacio

### 🔔 Sistema de Notificaciones Push
- **Para Usuarios**:
  - Notificación cuando el pago es validado
  - Alerta cuando el pago es rechazado con motivo
  - Confirmación cuando el vehículo es registrado
  - Aviso cuando el vehículo está listo para salir

- **Para Administradores**:
  - Notificación inmediata de nuevos pagos
  - Alerta de solicitudes de salida pendientes
  - Resumen de actividad del estacionamiento

- **Configuración Flexible**:
  - Los usuarios pueden activar/desactivar notificaciones
  - Diferentes tipos de notificación según el rol
  - Soporte para múltiples dispositivos por usuario

### 📱 Aplicación Web Progresiva (PWA)
- **Instalación Nativa**: Los usuarios pueden instalar la app como si fuera nativa
- **Acceso Offline**: Funcionalidad básica disponible sin internet
- **Actualizaciones Automáticas**: El sistema se actualiza sin intervención del usuario
- **Rendimiento Optimizado**: Carga rápida y uso eficiente de recursos
- **Compatibilidad Universal**: Funciona en todos los dispositivos y sistemas operativos

## 🔐 Credenciales por Defecto

Después de ejecutar `npm run seed`:
- **Usuario**: `admin`
- **Contraseña**: `admin123`

⚠️ **Importante**: Cambiar estas credenciales en producción

## 📊 Estructura de la Base de Datos

### Colecciones Principales:
- `company_settings`: Configuración general del sistema
- `tickets`: Espacios de estacionamiento
- `cars`: Registro de vehículos
- `pagos`: Pagos realizados (nueva colección unificada)
- `staff`: Usuarios del sistema
- `banks`: Lista de bancos venezolanos
- `car_history`: Historial de eventos por vehículo

## 🚀 Despliegue en Vercel

### 1. Preparar para Producción
\`\`\`bash
npm run build
\`\`\`

### 2. Configurar Variables en Vercel
En el dashboard de Vercel, agregar las mismas variables del `.env.local`

### 3. Desplegar
\`\`\`bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel --prod
\`\`\`

## 🛠️ Scripts Disponibles

\`\`\`bash
# Desarrollo
npm run dev

# Construcción
npm run build

# Inicializar BD (incluye generación de claves VAPID)
npm run seed

# Linting
npm run lint

# Generar claves VAPID (si es necesario)
npx web-push generate-vapid-keys
\`\`\`

## 📱 Uso del Sistema

### Para Clientes:
1. Escanear código QR del ticket
2. Ingresar datos del vehículo
3. Realizar pago (móvil/transferencia)
4. Esperar validación del administrador

### Para Administradores:
1. Acceder al panel admin (`/admin`)
2. Gestionar vehículos y pagos
3. Configurar tarifas y métodos de pago
4. Validar comprobantes de pago

### Activación de Notificaciones:

#### Para Usuarios:
1. **Primera Visita**: Al acceder por primera vez, aparecerá un prompt para activar notificaciones
2. **Permitir Notificaciones**: Acepta los permisos cuando el navegador lo solicite
3. **Confirmación**: Recibirás una notificación de prueba confirmando la activación
4. **Gestión**: Puedes desactivar las notificaciones desde la configuración del navegador

#### Para Administradores:
1. **Acceso al Panel**: Las notificaciones se activan automáticamente al hacer login
2. **Notificaciones en Tiempo Real**: Recibirás alertas de:
   - Nuevos pagos pendientes de validación
   - Vehículos listos para salir
   - Actividad general del estacionamiento
3. **Múltiples Dispositivos**: Puedes recibir notificaciones en varios dispositivos

### Instalación como PWA:

#### Instalación Automática:
1. **Prompt Automático**: Después de usar la app, aparecerá un prompt de instalación
2. **Beneficios Mostrados**: El sistema explica las ventajas de instalar la app
3. **Un Clic**: Instalación simple con un botón

#### Instalación Manual:
- **Chrome/Edge**: Busca el ícono de instalación en la barra de direcciones
- **Safari iOS**: Usar "Compartir" → "Agregar a pantalla de inicio"
- **Android**: Usar el menú del navegador → "Instalar app"

## 🔧 Personalización

### Modificar Tarifas:
1. Acceder al panel de administración
2. Ir a "Configuración"
3. Ajustar tarifas diurnas/nocturnas
4. Configurar horarios nocturnos

### Agregar Métodos de Pago:
1. Modificar `components/payment-form.tsx`
2. Actualizar tipos en `lib/types.ts`
3. Ajustar validación en APIs

## 🐛 Solución de Problemas

### Error de Conexión a MongoDB:
\`\`\`bash
# Verificar que MongoDB esté ejecutándose
sudo systemctl status mongodb

# O verificar conexión a Atlas
ping cluster0.xxxxx.mongodb.net
\`\`\`

### Error de Cloudinary:
- Verificar credenciales en `.env.local`
- Confirmar que el cloud name sea correcto

### Error 405 en Vercel:
- Verificar que las rutas API estén correctamente exportadas
- Revisar que `dynamic = 'force-dynamic'` esté configurado

### Problemas con Notificaciones Push:
\`\`\`bash
# Verificar que las claves VAPID estén configuradas
echo $NEXT_PUBLIC_VAPID_PUBLIC_KEY
echo $VAPID_PRIVATE_KEY

# Regenerar claves si es necesario
npm run seed
\`\`\`

### Problemas con PWA:
- **No aparece el prompt de instalación**: Verifica que estés usando HTTPS (o localhost)
- **Service Worker no se registra**: Revisa la consola del navegador para errores
- **Notificaciones no funcionan**: Confirma que los permisos estén otorgados

### Error de VAPID Keys:
\`\`\`bash
# Si las claves VAPID no se generan automáticamente
npx web-push generate-vapid-keys

# Agregar manualmente al .env.local
NEXT_PUBLIC_VAPID_PUBLIC_KEY=tu_clave_publica
VAPID_PRIVATE_KEY=tu_clave_privada
\`\`\`

## 📞 Soporte

Para reportar problemas o solicitar funcionalidades:
1. Crear issue en el repositorio
2. Incluir logs de error
3. Describir pasos para reproducir

## 🔄 Actualizaciones

### Migración de Versiones Anteriores:
El sistema incluye migración automática de configuraciones antiguas:
- `tarifaPorHora` → `tarifas.precioHoraDiurno`
- Colección `payments` → `pagos`
- Configuraciones legacy se actualizan automáticamente

## 📈 Próximas Funcionalidades

- [x] Notificaciones push en tiempo real
- [x] PWA con instalación nativa
- [x] Funcionamiento offline básico
- [ ] Notificaciones por email/SMS
- [ ] Reportes avanzados con gráficos
- [ ] API para integraciones externas
- [ ] App móvil nativa
- [ ] Sistema de reservas
- [ ] Geolocalización de espacios
- [ ] Integración con sistemas de pago automático

---

## 🎉 ¡Sistema Listo!

El sistema de estacionamiento está configurado con:
- ✅ Tarifas diurnas y nocturnas
- ✅ Panel de administración completo
- ✅ Múltiples métodos de pago
- ✅ Base de datos limpia y optimizada
- ✅ **Notificaciones push en tiempo real**
- ✅ **PWA instalable en cualquier dispositivo**
- ✅ **Funcionamiento offline**
- ✅ **Claves VAPID generadas automáticamente**
- ✅ **Service Worker configurado**
- ✅ Listo para producción

**¡Disfruta tu nuevo sistema de estacionamiento inteligente con notificaciones push y PWA!** 🚗💨📱🔔

# Sistema de Estacionamiento - Aplicación Web Completa

Una aplicación web integral para la gestión completa de estacionamientos con registro de vehículos, control de espacios, procesamiento de pagos, tarifas diurnas/nocturnas y panel de administración avanzado.

## 🚀 Características Principales

### Para Clientes
- **Búsqueda de Tickets**: Los clientes pueden buscar sus tickets usando el código único
- **Cálculo Automático Inteligente**: El sistema calcula automáticamente el monto a pagar basado en el tiempo de estacionamiento y aplica tarifas diurnas o nocturnas según la hora
- **Proceso de Pago Guiado**: Formulario paso a paso para registrar transferencias bancarias
- **Información Bancaria Dinámica**: Muestra los datos bancarios configurados por la empresa
- **Confirmación de Pago**: Los clientes reciben confirmación inmediata del registro de su pago

### Para Personal del Estacionamiento
- **Panel de Administración Completo**: Interfaz integral para gestionar todo el sistema
- **Gestión de Espacios**: Crear y administrar tickets de estacionamiento (hasta 100 por lote)
- **Registro de Vehículos**: Sistema completo para registrar carros con datos del vehículo y propietario
- **Confirmación de Estacionamiento**: Verificar que el vehículo está correctamente estacionado antes de habilitar pagos
- **Control de Ocupación**: Asignación automática de espacios y control de disponibilidad
- **Gestión de Pagos**: Validar o rechazar pagos pendientes con información detallada
- **Salida de Vehículos**: Procesar la salida y liberar espacios automáticamente
- **Códigos QR**: Generar, imprimir y escanear códigos QR para cada espacio
- **Historial Completo**: Registro histórico de todos los vehículos que han usado el estacionamiento
- **Gestión de Personal**: Crear, editar y eliminar cuentas de personal
- **Configuración Avanzada de Empresa**: 
  - Configurar datos bancarios para pago móvil y transferencias
  - **Tarifas Diurnas y Nocturnas**: Configurar diferentes precios según la hora del día
  - **Horarios Personalizables**: Definir exactamente cuándo aplica cada tarifa
- **Estadísticas en Tiempo Real**: Dashboard con 8 métricas importantes y actualización automática
- **Búsqueda Avanzada**: Filtros y búsqueda en el historial de vehículos

## 🌙 Nueva Funcionalidad: Tarifas Diurnas y Nocturnas

### Características del Sistema de Tarifas
- **Tarifa Diurna**: Precio estándar durante el día
- **Tarifa Nocturna**: Precio diferenciado (generalmente más alto) durante la noche
- **Horarios Configurables**: Define exactamente cuándo inicia y termina el horario nocturno
- **Aplicación Automática**: El sistema aplica automáticamente la tarifa correcta según la hora actual
- **Cálculo Inteligente**: Considera la hora de salida para determinar qué tarifa aplicar

### Configuración de Horarios
- **Formato**: Usa formato de 24 horas (HH:mm)
- **Ejemplo**: Nocturno de 00:00 a 06:00 (medianoche a 6 AM)
- **Flexibilidad**: Puede configurar cualquier rango horario
- **Cruce de Medianoche**: Soporta horarios que cruzan medianoche

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Base de Datos**: MongoDB Atlas
- **Autenticación**: Sistema personalizado para administradores
- **Deployment**: Optimizado para Vercel

## 📋 Prerrequisitos

- Node.js 18+ instalado
- Cuenta en MongoDB Atlas (gratuita)
- Editor de código (VS Code recomendado)

## 🔧 Instalación

### 1. Clonar o Descargar el Proyecto

\`\`\`bash
# Si tienes el código en un repositorio
git clone <url-del-repositorio>
cd sistema-estacionamiento

# O simplemente descomprime los archivos en una carpeta
\`\`\`

### 2. Instalar Dependencias

\`\`\`bash
npm install
\`\`\`

### 3. Configurar MongoDB Atlas

1. Ve a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crea una cuenta gratuita si no tienes una
3. Crea un nuevo cluster (usa el tier gratuito)
4. Configura un usuario de base de datos:
   - Ve a "Database Access"
   - Crea un nuevo usuario con permisos de lectura/escritura
5. Configura el acceso de red:
   - Ve a "Network Access"
   - Añade tu IP actual o usa `0.0.0.0/0` para acceso desde cualquier IP (solo para desarrollo)
6. Obtén la cadena de conexión:
   - Ve a "Clusters" → "Connect" → "Connect your application"
   - Copia la cadena de conexión

### 4. Configurar Variables de Entorno

\`\`\`bash
# Copia el archivo de ejemplo
cp .env.local.example .env.local

# Edita .env.local y reemplaza con tu cadena de conexión real
MONGODB_URI=mongodb+srv://tuusuario:tupassword@cluster0.abc123.mongodb.net/parking?retryWrites=true&w=majority
\`\`\`

### 5. Inicializar la Base de Datos

\`\`\`bash
npm run seed
\`\`\`

Este comando creará:
- **Espacios de estacionamiento**: 50 tickets disponibles (PARK001-PARK050)
- **Tickets de ejemplo**: 2 tickets con vehículos estacionados (TEST001-TEST002)
- **Usuarios del personal**: admin y operador
- **Configuración inicial**: Datos bancarios y tarifas diurnas/nocturnas
- **Bancos venezolanos**: Lista completa de bancos para el dropdown
- **Carros de ejemplo**: 2 vehículos registrados para demostración

### 6. Ejecutar la Aplicación

\`\`\`bash
npm run dev
\`\`\`

La aplicación estará disponible en: http://localhost:3000

## 🎯 Cómo Usar el Sistema

### Para Clientes

1. **Acceder a la Aplicación**
   - Ve a http://localhost:3000
   - Verás la página principal con el formulario de búsqueda

2. **Buscar Ticket**
   - Ingresa tu código de ticket (puedes usar TEST001 o TEST002)
   - Haz clic en "Buscar Ticket"

3. **Revisar Detalles**
   - Verifica el código del ticket y el monto calculado
   - **Nota**: El monto se calcula automáticamente considerando si es horario diurno o nocturno
   - Haz clic en "Pagar Ahora"

4. **Proceso de Pago**
   - **Paso 1**: Confirma los datos y revisa la información bancaria de la empresa
   - **Paso 2**: Realiza tu transferencia/pago móvil y completa el formulario con los detalles
   - **Paso 3**: Confirma la información y envía el pago

5. **Confirmación**
   - Recibirás confirmación de que el pago fue registrado
   - El pago quedará pendiente de validación por el personal

### Para Personal del Estacionamiento

1. **Acceder al Panel de Administración**
   - Ve a http://localhost:3000/admin
   - Usa las credenciales:
     - Usuario: `admin`
     - Contraseña: `admin123`
   - O usa el botón "Acceso Rápido (Demo)"

2. **Dashboard Principal**
   - Ve estadísticas en tiempo real (6 métricas principales)
   - Navega entre las 7 pestañas disponibles
   - Las estadísticas se actualizan automáticamente cada 30 segundos

3. **Configuración de Tarifas** (Pestaña "Config" - NUEVA FUNCIONALIDAD)
   - **Configurar Tarifa Diurna**: Precio estándar durante el día
   - **Configurar Tarifa Nocturna**: Precio diferenciado para la noche
   - **Definir Horario Nocturno**: 
     - Hora de inicio (ej: 00:00 para medianoche)
     - Hora de fin (ej: 06:00 para las 6 AM)
   - **Tasa de Cambio**: Conversión de USD a Bolívares
   - **Vista Previa**: Muestra cómo se aplicarán las tarifas

4. **Confirmación de Estacionamiento** (Pestaña "Confirmar" - PRIMERA PRIORIDAD)
   - **Ver vehículos pendientes**: Carros registrados que necesitan confirmación
   - **Verificar estacionamiento**: Confirmar físicamente que el vehículo está bien ubicado
   - **Confirmar estacionamiento**: Un clic para habilitar el cobro
   - **Badge de notificación**: Muestra cantidad de confirmaciones pendientes
   - **Inicio del tiempo de cobro**: Se marca desde la confirmación, no desde el registro

5. **Gestión de Tickets** (Pestaña "Tickets")
   - **Ver estadísticas**: Total, disponibles, ocupados, confirmados, pagados
   - **Crear tickets masivos**: Hasta 100 tickets por lote
   - **Generar códigos QR**: Para cada espacio de estacionamiento
   - **Monitorear espacios**: Lista completa de todos los tickets con sus estados

6. **Registro de Vehículos** (Pestaña "Registro")
   - **Registrar nuevo carro**: Cuando llega un vehículo al estacionamiento
   - **Datos completos**: Placa, marca, modelo, color, dueño, teléfono
   - **Asignación automática**: Seleccionar ticket disponible del dropdown
   - **Estado inicial**: Ticket pasa a "ocupado" (pendiente confirmación)

7. **Gestión de Pagos** (Pestaña "Pagos")
   - Ve todos los pagos pendientes de validación
   - **Cálculo Automático**: Los montos se calculan considerando tarifas diurnas/nocturnas
   - Revisa los detalles de cada pago (referencia, banco, monto, etc.)
   - Valida o rechaza pagos según corresponda

8. **Salida de Vehículos** (Pestaña "Salidas")
   - **Procesar salidas**: Lista de vehículos con pagos validados listos para salir
   - **Liberar espacios**: Confirmar salida y liberar ticket automáticamente
   - **Actualización en tiempo real**: Lista se actualiza cada 30 segundos

9. **Historial Completo** (Pestaña "Historial")
   - **Búsqueda avanzada**: Por placa, nombre del dueño, marca o ticket
   - **Paginación**: 20 registros por página para mejor rendimiento
   - **Filtros**: Buscar en todo el historial de vehículos

10.  **Gestión de Personal** (Pestaña "Personal")
    - **Crear usuarios**: Administradores y operadores
    - **Editar información**: Nombres, emails, roles
    - **Eliminar usuarios**: Con confirmación de seguridad

## 🔧 Configuración Avanzada

### Configuración de Tarifas Diurnas y Nocturnas

1. **Acceder a Configuración**
   - Panel Admin → Pestaña "Config"

2. **Configurar Tarifas**
   - **Tarifa Diurna**: Precio por hora durante el día (ej: $3.00)
   - **Tarifa Nocturna**: Precio por hora durante la noche (ej: $4.00)
   - **Horario Nocturno**: Define cuándo aplica cada tarifa
     - Inicio: 00:00 (medianoche)
     - Fin: 06:00 (6 AM)

3. **Ejemplos de Configuración**
   - **Estándar**: Diurno $3.00, Nocturno $4.00 (00:00-06:00)
   - **Extendido**: Diurno $2.50, Nocturno $3.50 (22:00-07:00)
   - **Premium**: Diurno $4.00, Nocturno $6.00 (20:00-08:00)

### Configuración de Datos Bancarios

1. **Pago Móvil**
   - Banco, cédula y teléfono para recibir pagos móviles

2. **Transferencia Bancaria**
   - Banco, cédula, teléfono y número de cuenta

3. **Tasa de Cambio**
   - Conversión automática de USD a Bolívares

## 📊 Métricas y Estadísticas

El dashboard muestra 6 métricas principales:
1. **Pagos Pendientes**: Transferencias esperando validación
2. **Personal Activo**: Usuarios del sistema registrados
3. **Pagos de Hoy**: Transacciones validadas en el día actual
4. **Total Tickets**: Espacios de estacionamiento creados
5. **Tickets Disponibles**: Espacios libres para asignar
6. **Carros Estacionados**: Vehículos actualmente en el estacionamiento

## 🔄 Flujo Completo del Sistema

### Flujo del Cliente
1. **Llegada**: Cliente llega al estacionamiento
2. **Registro**: Personal registra el vehículo y asigna ticket
3. **Confirmación**: Personal confirma que el vehículo está bien estacionado
4. **Búsqueda**: Cliente busca su ticket cuando quiere salir
5. **Pago**: Cliente ve el monto (calculado con tarifa diurna/nocturna) y realiza el pago
6. **Validación**: Personal valida el pago
7. **Salida**: Personal procesa la salida y libera el espacio

### Flujo del Personal
1. **Login**: Acceso al panel de administración
2. **Registro**: Registrar vehículos que llegan
3. **Confirmación**: Confirmar estacionamiento correcto
4. **Monitoreo**: Revisar pagos pendientes y estadísticas
5. **Validación**: Validar o rechazar pagos
6. **Salidas**: Procesar salidas de vehículos
7. **Gestión**: Crear tickets, gestionar personal, configurar tarifas

## 🚀 Despliegue en Producción

### Opción 1: Vercel (Recomendado)

1. **Preparar el proyecto**
   \`\`\`bash
   # Asegúrate de que todo funciona localmente
   npm run build
   \`\`\`

2. **Subir a GitHub**
   - Crea un repositorio en GitHub
   - Sube tu código

3. **Conectar con Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Conecta tu repositorio de GitHub
   - Configura la variable de entorno `MONGODB_URI`

4. **Configurar dominio**
   - Vercel te dará un dominio gratuito
   - Opcionalmente configura un dominio personalizado

### Opción 2: Otros Proveedores

El sistema es compatible con cualquier proveedor que soporte Node.js:
- Railway
- Render
- DigitalOcean App Platform
- AWS Amplify
- Netlify

## 🔒 Seguridad

- **Autenticación**: Sistema de login para personal autorizado
- **Validación**: Todos los datos son validados en el servidor
- **Sanitización**: Prevención de inyección de código
- **Variables de entorno**: Credenciales seguras

## 🐛 Solución de Problemas

### Error de Conexión a MongoDB
- Verifica que la cadena de conexión sea correcta
- Asegúrate de que tu IP esté en la whitelist de MongoDB Atlas
- Confirma que el usuario de base de datos tenga permisos

### La aplicación no inicia
- Ejecuta `npm install` para instalar dependencias
- Verifica que Node.js 18+ esté instalado
- Revisa que el archivo `.env.local` exista y tenga la configuración correcta

### Los tickets no aparecen
- Ejecuta `npm run seed` para inicializar la base de datos
- Verifica la conexión a MongoDB

### Las tarifas no se calculan correctamente
- Revisa la configuración de tarifas en el panel de administración
- Verifica que los horarios estén en formato correcto (HH:mm)
- Confirma que la tasa de cambio esté configurada

## 📞 Soporte

Si necesitas ayuda adicional:
1. Revisa esta documentación completa
2. Verifica los logs de la consola del navegador
3. Confirma que todos los pasos de instalación se siguieron correctamente

## 🎉 ¡Listo!

Tu sistema de estacionamiento con tarifas diurnas y nocturnas está completamente configurado y listo para usar. El sistema incluye:

✅ **50 espacios** de estacionamiento listos para usar  
✅ **2 tickets de ejemplo** para probar el sistema  
✅ **Panel de administración** completo con 7 pestañas  
✅ **Sistema de tarifas** diurnas y nocturnas configurable  
✅ **Cálculo automático** de montos según la hora  
✅ **Gestión completa** de pagos y validaciones  
✅ **Estadísticas en tiempo real** con actualización automática  
✅ **Códigos QR** para cada espacio  
✅ **Historial completo** con búsqueda avanzada  
✅ **Configuración flexible** de datos bancarios y tarifas  

**Credenciales de acceso:**
- **Admin**: usuario `admin`, contraseña `admin123`
- **Operador**: usuario `operador`, contraseña `operador123`

**Tickets de prueba:**
- **TEST001**: Toyota Corolla ABC123
- **TEST002**: Chevrolet Aveo XYZ789

¡Disfruta usando tu nuevo sistema de gestión de estacionamiento! 🚗💰
