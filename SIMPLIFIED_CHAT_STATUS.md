# ✅ Estado del Chat Simplificado - Usa Directamente n8n

## 🎯 Cambio Implementado

He simplificado el sistema para que **use directamente el estado que devuelve tu webhook de n8n**, sin hacer cálculos complicados ni lógica adicional.

## 🔧 Lógica Simplificada

### **Antes (Complejo):**
```javascript
// Calculaba estado basado en última actividad
const hoursSinceLastActivity = (now - lastActivityDate) / (1000 * 60 * 60);
const isActive = hoursSinceLastActivity < 24;
```

### **Ahora (Directo):**
```javascript
// Usa directamente lo que devuelve n8n
const isActive = data.estado === 'activo' || 
                 data.status === 'active' || 
                 data.is_active === true || 
                 data.activo === true;
```

## 📋 Formatos de Respuesta Soportados

Tu webhook puede devolver el estado en cualquiera de estos formatos:

### **Opción 1: Campo `estado`**
```json
{
  "estado": "activo"    // o "inactivo"
}
```

### **Opción 2: Campo `status`**
```json
{
  "status": "active"    // o "inactive"
}
```

### **Opción 3: Campo `is_active`**
```json
{
  "is_active": true     // o false
}
```

### **Opción 4: Campo `activo`**
```json
{
  "activo": true        // o false
}
```

### **Con Información Adicional (Opcional):**
```json
{
  "estado": "activo",
  "last_message_time": "2024-11-12T14:30:00Z",
  "jid": "5491165442102@s.whatsapp.net"
}
```

## 🎨 Resultado Visual

### **Estado Activo:**
```
[🟢 📶 Chat Activo]
📡 Datos desde n8n webhook
Última actividad: 12 nov 2024, 14:30 (si se proporciona)
```

### **Estado Inactivo:**
```
[⚪ 📵 Chat Inactivo]  
📡 Datos desde n8n webhook
```

## 🔍 Logs de Debug

### **En la Consola:**
```
=== CONSULTANDO ESTADO DEL LEAD EN N8N ===
JID: 5491165442102@s.whatsapp.net
Webhook URL: https://mia-n8n.w9weud.easypanel.host/webhook/consultar-lead
✅ Respuesta del webhook n8n: { estado: "activo" }
📊 Estado del chat procesado: ACTIVO
```

## 🛠️ Configuración del Webhook n8n

### **Payload que Recibe:**
```json
{
  "jid": "5491165442102@s.whatsapp.net"
}
```

### **Respuesta Mínima Requerida:**
```json
{
  "estado": "activo"    // o "inactivo"
}
```

### **Respuesta Recomendada:**
```json
{
  "estado": "activo",
  "last_message_time": "2024-11-12T14:30:00Z"
}
```

## ✅ Ventajas del Sistema Simplificado

1. **🎯 Directo**: Usa exactamente lo que devuelve n8n
2. **🔧 Simple**: Sin cálculos complejos de tiempo
3. **🛡️ Robusto**: Maneja múltiples formatos de respuesta
4. **🔍 Claro**: Logs específicos del estado procesado
5. **⚡ Rápido**: Menos procesamiento, más eficiente

## 🧪 Cómo Probar

### **1. Configurar tu Webhook n8n**
Asegúrate de que `/webhook/consultar-lead` devuelva:
```json
{
  "estado": "activo"    // o "inactivo" según corresponda
}
```

### **2. Probar en la Interfaz**
1. Abre el sidebar de cualquier lead
2. Observa el badge de estado del chat
3. Haz clic en "Consultar Estado en n8n" para refrescar

### **3. Verificar Logs**
1. Abre la consola del navegador (F12)
2. Busca los logs que muestran el estado procesado
3. Verifica que muestre "ACTIVO" o "INACTIVO" correctamente

**¡Ahora el sistema usa directamente el estado que devuelve tu webhook sin complicaciones adicionales!** 🎉
