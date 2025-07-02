# 🚀 Configuración de Cloudflare Workers para OCR

## 📋 Requisitos Previos

1. **Cuenta de Cloudflare**: [Registrarse gratis](https://dash.cloudflare.com/sign-up)
2. **Node.js**: Versión 16 o superior
3. **Wrangler CLI**: Se instalará automáticamente

## 🔧 Instalación Paso a Paso

### 1. Instalar Wrangler CLI

\`\`\`bash
npm install -g wrangler
\`\`\`

### 2. Autenticarse en Cloudflare

\`\`\`bash
wrangler login
\`\`\`

Esto abrirá tu navegador para autorizar el acceso.

### 3. Verificar Autenticación

\`\`\`bash
wrangler whoami
\`\`\`

### 4. Configurar el Proyecto

\`\`\`bash
cd cloudflare-workers

# Verificar configuración
cat wrangler.toml
\`\`\`

### 5. Desplegar (Método Automático)

\`\`\`bash
# Hacer ejecutable el script
chmod +x deploy.sh

# Ejecutar despliegue
./deploy.sh
\`\`\`

### 6. Desplegar (Método Manual)

\`\`\`bash
# Despliegue de desarrollo
wrangler deploy --config wrangler.dev.toml

# Despliegue de producción
wrangler deploy
\`\`\`

## 🧪 Probar la API

### Método Automático

\`\`\`bash
chmod +x test-api.sh
./test-api.sh
\`\`\`

### Método Manual

\`\`\`bash
# Obtener tu URL
wrangler subdomain

# Probar salud
curl https://tu-worker.workers.dev/health

# Probar OCR
curl -X POST https://tu-worker.workers.dev/ocr/plate \
  -H "Content-Type: application/json" \
  -d '{"image_url": "test", "country": "venezuela"}'
\`\`\`

## 🔍 Monitoreo

### Ver Logs en Tiempo Real

\`\`\`bash
wrangler tail
\`\`\`

### Ver Métricas

\`\`\`bash
wrangler metrics
\`\`\`

### Dashboard Web

Visita: https://dash.cloudflare.com/workers

## 🐛 Solución de Problemas

### Error: "python_workers compatibility flag is required"

**Solución**: Asegúrate de que `wrangler.toml` tenga:

\`\`\`toml
compatibility_flags = ["python_workers"]
\`\`\`

### Error: "Authentication required"

**Solución**:

\`\`\`bash
wrangler logout
wrangler login
\`\`\`

### Error: "Worker name already exists"

**Solución**: Cambiar el nombre en `wrangler.toml`:

\`\`\`toml
name = "python-ocr-api-tu-nombre"
\`\`\`

### Error de CORS

**Solución**: La API ya incluye headers CORS. Verificar que la URL sea correcta.

## 📊 Límites y Costos

### Plan Gratuito de Cloudflare Workers

- **Requests**: 100,000/día
- **CPU Time**: 10ms por request
- **Memory**: 128MB
- **Costo**: $0

### Plan Paid ($5/mes)

- **Requests**: 10,000,000/mes
- **CPU Time**: 50ms por request
- **Memory**: 128MB
- **Costo**: $5/mes + $0.50 por millón adicional

## 🔧 Configuración Avanzada

### Variables de Entorno

\`\`\`bash
# Configurar secretos
wrangler secret put GOOGLE_CLOUD_PROJECT_ID
wrangler secret put GOOGLE_CLOUD_CREDENTIALS

# Configurar variables públicas
wrangler vars put ENVIRONMENT production
\`\`\`

### Dominios Personalizados

1. Ir a Cloudflare Dashboard
2. Workers & Pages → tu-worker → Settings → Triggers
3. Agregar Custom Domain

### Configurar Alertas

1. Dashboard → Workers → tu-worker → Metrics
2. Configurar alertas por errores o latencia

## 📝 Comandos Útiles

\`\`\`bash
# Ver información del worker
wrangler info

# Ver subdominios disponibles
wrangler subdomain

# Eliminar worker
wrangler delete

# Ver versiones desplegadas
wrangler deployments list

# Rollback a versión anterior
wrangler rollback [deployment-id]

# Ejecutar localmente (si está disponible)
wrangler dev
\`\`\`

## 🔄 Actualización de la API

### Actualizar Código

1. Modificar `main.py`
2. Ejecutar `wrangler deploy`
3. Verificar con `./test-api.sh`

### Actualizar Configuración

1. Modificar `wrangler.toml`
2. Ejecutar `wrangler deploy`

## 📋 Checklist de Despliegue

- [ ] ✅ Wrangler CLI instalado
- [ ] ✅ Autenticado en Cloudflare
- [ ] ✅ Archivo `wrangler.toml` configurado
- [ ] ✅ Código Python funcionando
- [ ] ✅ Worker desplegado
- [ ] ✅ Endpoints probados
- [ ] ✅ URL configurada en frontend
- [ ] ✅ Monitoreo configurado

## 🆘 Soporte

Si tienes problemas:

1. **Documentación oficial**: https://developers.cloudflare.com/workers/
2. **Discord de Cloudflare**: https://discord.gg/cloudflaredev
3. **GitHub Issues**: Crear issue en el repositorio del proyecto

---

**Nota**: Python Workers está en beta. Algunas funcionalidades pueden cambiar.
