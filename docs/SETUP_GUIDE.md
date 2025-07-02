# 🚀 Guía de Configuración Rápida

## 📋 Variables de Entorno Necesarias

### ✅ **MÍNIMAS (Para que funcione básicamente)**

\`\`\`bash
# Copia .env.example a .env.local
cp .env.example .env.local

# Edita .env.local con estos valores MÍNIMOS:
MONGODB_URI=mongodb+srv://tu-usuario:tu-password@cluster.mongodb.net/parkingapp
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
\`\`\`

### 🚀 **RECOMENDADAS (Para OCR mejorado)**

\`\`\`bash
# Después de desplegar el Cloudflare Worker:
PYTHON_OCR_API_URL=https://ocr-api.tu-usuario.workers.dev
\`\`\`

## 🔧 Pasos de Configuración

### 1. **Configuración Básica**

\`\`\`bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables mínimas
cp .env.example .env.local
# Editar .env.local con tus credenciales

# 3. Ejecutar en desarrollo
npm run dev
\`\`\`

### 2. **Configuración de OCR (Opcional pero Recomendado)**

\`\`\`bash
# 1. Ir a la carpeta de workers
cd cloudflare-workers

# 2. Instalar dependencias del worker
npm install

# 3. Desplegar worker
chmod +x deploy.sh
./deploy.sh

# 4. Copiar la URL que te dé y agregarla a .env.local
# PYTHON_OCR_API_URL=https://tu-url-del-worker
\`\`\`

### 3. **Verificar que Todo Funcione**

\`\`\`bash
# 1. Ejecutar la app
npm run dev

# 2. Ir a http://localhost:3000/admin/dashboard
# 3. Probar "Registro de Carros" → "Capturar Vehículo"
# 4. Verificar que la cámara funcione y el OCR procese
\`\`\`

## 🔍 **Métodos de OCR Disponibles**

El sistema funciona con **múltiples niveles de respaldo**:

1. **Tesseract.js** (Local, gratis, rápido)
2. **Cloudflare Worker** (Remoto, gratis, simulado)
3. **Google Vision API** (Remoto, pago, máxima precisión)
4. **Simulación** (Siempre funciona)

## 🆘 **Solución de Problemas**

### ❌ "Cannot connect to MongoDB"
\`\`\`bash
# Verificar que MONGODB_URI esté correcto
echo $MONGODB_URI
\`\`\`

### ❌ "Cloudinary upload failed"
\`\`\`bash
# Verificar credenciales de Cloudinary
echo $CLOUDINARY_CLOUD_NAME
echo $CLOUDINARY_API_KEY
\`\`\`

### ❌ "OCR API not responding"
\`\`\`bash
# Probar la API directamente
curl https://tu-worker.workers.dev/health
\`\`\`

### ❌ "Camera not working"
- Verificar permisos de cámara en el navegador
- Usar HTTPS (requerido para cámara)
- Probar en dispositivo móvil

## 📊 **Estados del Sistema**

- **🟢 Funcionando**: Todas las variables configuradas
- **🟡 Básico**: Solo variables mínimas (sin OCR avanzado)
- **🔴 Error**: Variables mínimas faltantes

## 🎯 **Configuración Recomendada por Entorno**

### **Desarrollo Local**
\`\`\`bash
MONGODB_URI=mongodb://localhost:27017/parkingapp  # O MongoDB Atlas
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
\`\`\`

### **Producción (Vercel)**
\`\`\`bash
# Todas las variables anteriores +
PYTHON_OCR_API_URL=https://ocr-api.tu-usuario.workers.dev
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
\`\`\`

---

**💡 Tip**: Empieza con la configuración mínima y ve agregando funcionalidades gradualmente.
