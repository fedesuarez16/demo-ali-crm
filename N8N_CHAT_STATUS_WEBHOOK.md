# ✅ Estado del Chat via n8n Webhook - Actualizado

## 🔄 Cambio Implementado

He actualizado el sistema de estado del chat para usar **tu webhook específico de n8n** en lugar de la API local, proporcionando datos más precisos y actualizados.

## 🔧 Webhook Configurado

### **URL del Webhook:**
```
https://mia-n8n.w9weud.easypanel.host/webhook/consultar-lead
```

### **Payload Enviado:**
```json
{
  "jid": "5491165442102@s.whatsapp.net"
}
```

### **Método:** `POST`

## 🚀 Cómo Funciona Ahora

### **1. Flujo de Consulta**
```
Sidebar del Lead → useChatStatus Hook → n8n Webhook → Respuesta → Estado Actualizado
```

### **2. Procesamiento de Datos**
El hook procesa múltiples formatos de respuesta de n8n:

```javascript
// Campos soportados para actividad:
const lastActivity = data.last_message_time || data.ultima_actividad || data.updated_at;

// Campos soportados para estado activo:
const isActive = data.is_active || data.activo || false;

// Si n8n no proporciona is_active, se calcula automáticamente:
// Activo = actividad en las últimas 24 horas
```

## 🎨 Indicadores Visuales Actualizados

### **Estados del Badge:**
- **🔄 Cargando**: `"Consultando n8n..."` (con spinner)
- **🟢 Activo**: `"Chat Activo"` (verde con ícono Wifi)
- **⚪ Inactivo**: `"Chat Inactivo"` (gris con ícono WifiOff)

### **Información Adicional:**
- **Tooltip**: "Estado obtenido desde n8n webhook"
- **Indicador de fuente**: "📡 Datos desde n8n webhook"
- **Botón actualizado**: "Consultar Estado en n8n"

## 📋 Respuestas Esperadas del Webhook

### **Formato Flexible:**
El hook soporta múltiples formatos de respuesta:

```json
// Opción 1: Con estado explícito
{
  "is_active": true,
  "last_message_time": "2024-11-12T14:30:00Z"
}

// Opción 2: Con nombres en español
{
  "activo": false,
  "ultima_actividad": "2024-11-10T09:15:00Z"
}

// Opción 3: Solo con timestamp (calcula automáticamente)
{
  "updated_at": "2024-11-12T14:30:00Z"
}
```

## 🔍 Logs de Depuración

### **En la Consola del Navegador:**
```
=== CONSULTANDO ESTADO DEL LEAD EN N8N ===
JID: 5491165442102@s.whatsapp.net
Webhook URL: https://mia-n8n.w9weud.easypanel.host/webhook/consultar-lead
✅ Respuesta del webhook n8n: { is_active: true, last_message_time: "..." }
```

### **En Caso de Error:**
```
❌ Error consultando estado del lead en n8n: Webhook error: 404 - Not found
```

## 🛠️ Archivos Modificados

### **1. Hook `useChatStatus.js`**
- ✅ **URL actualizada**: Usa webhook de n8n en lugar de API local
- ✅ **Payload correcto**: Envía JID formateado
- ✅ **Procesamiento flexible**: Soporta múltiples formatos de respuesta
- ✅ **Logs detallados**: Para debugging
- ✅ **Manejo de errores**: Específico para webhooks

### **2. Sidebar `LeadDetailSidebar.tsx`**
- ✅ **Texto actualizado**: "Consultando n8n..." en lugar de "Verificando..."
- ✅ **Tooltip informativo**: Indica que usa n8n webhook
- ✅ **Indicador de fuente**: "📡 Datos desde n8n webhook"
- ✅ **Botón actualizado**: "Consultar Estado en n8n"

## 🧪 Cómo Probar

### **1. Abrir Sidebar del Lead**
1. Ve a `/leads`
2. Haz clic en cualquier lead card
3. Observa el badge de estado del chat

### **2. Verificar Logs**
1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña Console
3. Busca los logs que comienzan con "=== CONSULTANDO ESTADO DEL LEAD EN N8N ==="

### **3. Probar Actualización Manual**
1. Haz clic en "Consultar Estado en n8n"
2. Debería mostrar "Consultando n8n..." con spinner
3. Luego actualizar el estado basado en la respuesta

### **4. Verificar Indicadores**
- **Tooltip**: Al pasar el mouse sobre el badge
- **Fuente**: "📡 Datos desde n8n webhook" debajo del nombre
- **Última actividad**: Si hay datos disponibles

## ⚙️ Configuración del Webhook n8n

### **Payload Esperado por el Webhook:**
```json
{
  "jid": "numero@s.whatsapp.net"
}
```

### **Respuesta Sugerida del Webhook:**
```json
{
  "is_active": boolean,
  "last_message_time": "ISO_DATE_STRING",
  "jid": "numero@s.whatsapp.net"
}
```

## ✅ Ventajas del Nuevo Sistema

1. **🎯 Datos Precisos**: Directamente desde tu sistema n8n
2. **🔄 Tiempo Real**: Información actualizada al momento
3. **🛠️ Centralizado**: Una sola fuente de verdad (n8n)
4. **📊 Consistente**: Misma lógica que otros webhooks
5. **🔍 Trazable**: Logs detallados para debugging
6. **🔧 Flexible**: Soporta múltiples formatos de respuesta

## 🚀 Estado Final

**🟢 Completamente Integrado con n8n**
- ✅ Webhook configurado y funcionando
- ✅ Logs detallados para debugging
- ✅ Manejo de errores robusto
- ✅ Indicadores visuales actualizados
- ✅ Formato flexible de respuestas
- ✅ Sin errores de linting

**¡El estado del chat ahora se obtiene directamente desde tu sistema n8n!** 🎉
