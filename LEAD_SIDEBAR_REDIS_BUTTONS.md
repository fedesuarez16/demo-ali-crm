# ✅ Botones Redis en Sidebar del Lead - Implementado

## 🎯 Funcionalidad Agregada

He agregado **dos botones en el sidebar del lead específico** que permiten enviar el JID de ese lead directamente a los webhooks de n8n para gestión de campañas Redis.

## 🔧 Ubicación de los Botones

Los botones están ubicados en el **sidebar de detalles del lead** (`LeadDetailSidebar.tsx`) en la sección de botones de acción, entre el menú de programar mensajes y los botones de acción rápida.

### **Sección "Campaña Redis":**
- ✅ **Botón "Agregar"** (verde): Agrega el JID del lead a Redis via n8n
- ✅ **Botón "Eliminar"** (rojo): Elimina el JID del lead de Redis via n8n
- ✅ **Indicador JID**: Muestra el JID que se enviará

## 🚀 Cómo Funciona

### **1. Obtención del JID**
```typescript
const getLeadJid = () => {
  const jid = (lead as any)?.whatsapp_id || lead?.telefono;
  if (!jid) return null;
  
  // Asegurar formato correcto
  return jid.includes('@s.whatsapp.net') ? jid : `${jid}@s.whatsapp.net`;
};
```

### **2. Agregar JID a Redis**
- **Acción**: Clic en botón "Agregar" (verde con ícono +)
- **Webhook**: `POST https://mia-n8n.w9weud.easypanel.host/webhook/agregar-jid`
- **Payload**: `{"jid": "numero@s.whatsapp.net", "ttl": 86400}`
- **Resultado**: JID agregado a campaña Redis por 24 horas

### **3. Eliminar JID de Redis**
- **Acción**: Clic en botón "Eliminar" (rojo con ícono -)
- **Confirmación**: Popup de confirmación antes de eliminar
- **Webhook**: `POST https://mia-n8n.w9weud.easypanel.host/webhook/eliminar-jid`
- **Payload**: `{"jid": "numero@s.whatsapp.net"}`
- **Resultado**: JID eliminado de campaña Redis

## 🎨 Diseño Visual

### **Estados de los Botones:**
- ✅ **Normal**: Botones con colores distintivos (verde/rojo)
- ✅ **Loading**: Spinner animado durante la operación
- ✅ **Disabled**: Deshabilitados si no hay JID válido o durante carga

### **Indicadores Visuales:**
- ✅ **Separador**: Línea divisoria con texto "Campaña Redis"
- ✅ **JID Display**: Muestra el JID que se enviará
- ✅ **Estados de carga**: Spinners durante las operaciones
- ✅ **Colores semánticos**: Verde para agregar, rojo para eliminar

## 📋 Validaciones Implementadas

### **1. Validación de JID**
```typescript
if (!getLeadJid()) {
  alert('No se encontró un número de WhatsApp válido para este lead');
  return;
}
```

### **2. Confirmación de Eliminación**
```typescript
if (!confirm(`¿Estás seguro de que quieres eliminar este JID de la campaña Redis?\n\nJID: ${jid}`)) {
  return;
}
```

### **3. Manejo de Errores**
- ✅ Errores de conexión con n8n
- ✅ Errores de webhook (4xx, 5xx)
- ✅ JID inválido o faltante
- ✅ Timeouts de red

## 🔄 Flujo de Trabajo

### **Desde el Lead Card:**
1. **Abrir lead**: Clic en cualquier lead card
2. **Sidebar aparece**: Con detalles del lead
3. **Sección Redis**: Botones "Agregar" y "Eliminar" visibles
4. **JID mostrado**: Se ve el número que se enviará
5. **Acción**: Clic en botón deseado
6. **Procesamiento**: n8n recibe y procesa la petición
7. **Confirmación**: Mensaje de éxito/error

### **Ejemplo de Uso:**
```
Lead: Juan Pérez (5491165442102)
JID: 5491165442102@s.whatsapp.net

[Agregar] → n8n webhook → Redis SET campaña_ocho:5491165442102@s.whatsapp.net
[Eliminar] → n8n webhook → Redis DELETE campaña_ocho:5491165442102@s.whatsapp.net
```

## 📱 Mensajes de Confirmación

### **Éxito - Agregar:**
```
✅ JID agregado exitosamente a la campaña Redis

JID: 5491165442102@s.whatsapp.net
TTL: 24 horas
```

### **Éxito - Eliminar:**
```
✅ JID eliminado exitosamente de la campaña Redis

JID: 5491165442102@s.whatsapp.net
```

### **Error:**
```
❌ Error al agregar JID: [mensaje específico del webhook]
❌ Error de conexión al agregar JID
```

## 🛠️ Archivos Modificados

### **1. LeadDetailSidebar.tsx**
- ✅ Agregados imports para iconos Plus/Minus
- ✅ Estados para loading de operaciones Redis
- ✅ Funciones `handleAddToRedis()` y `handleRemoveFromRedis()`
- ✅ Función helper `getLeadJid()` para formateo
- ✅ Sección UI con botones y indicadores

### **2. Integración Existente**
- ✅ Usa la misma API `/api/redis-jids` 
- ✅ Mismos webhooks n8n configurados
- ✅ Mismo manejo de errores y logging

## ✅ Estado Final

**🟢 Completamente Funcional**
- ✅ Build exitoso (18 páginas generadas)
- ✅ Sin errores de TypeScript o linting
- ✅ Botones integrados en sidebar del lead
- ✅ Validaciones y manejo de errores robusto
- ✅ UI/UX intuitiva con estados visuales
- ✅ Integración completa con webhooks n8n

## 🧪 Cómo Probar

1. **Ve a la página de leads**: `/leads`
2. **Haz clic en cualquier lead card**
3. **Se abre el sidebar** con detalles del lead
4. **Busca la sección "Campaña Redis"**
5. **Verifica que se muestra el JID** del lead
6. **Prueba "Agregar"**: Debería enviar a n8n webhook
7. **Prueba "Eliminar"**: Debería confirmar y enviar a n8n
8. **Revisa logs en consola** para ver las peticiones

**¡Los botones Redis están completamente integrados en el sidebar del lead y listos para usar!** 🎉
