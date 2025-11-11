# ✅ Estado del Chat en Sidebar del Lead - Implementado

## 🎯 Funcionalidad Agregada

He implementado un **indicador de estado del chat en tiempo real** en el sidebar del lead que muestra si el chat está activo o inactivo basado en la última actividad.

## 🔧 Componentes Creados

### **1. Hook `useChatStatus`** (`/src/hooks/useChatStatus.js`)
- ✅ Verifica el estado del chat por número de teléfono
- ✅ Determina si está activo (actividad en últimas 24 horas)
- ✅ Obtiene la fecha de última actividad
- ✅ Manejo de estados de carga y errores
- ✅ Función para refrescar manualmente

### **2. Indicadores Visuales en Sidebar**
- ✅ **Badge de estado**: Verde (activo) / Gris (inactivo)
- ✅ **Iconos**: Wifi (activo) / WifiOff (inactivo)
- ✅ **Última actividad**: Fecha y hora formateada
- ✅ **Estado de carga**: Spinner mientras verifica
- ✅ **Botón de actualización**: Para refrescar manualmente

## 🎨 Diseño Visual

### **Estados del Indicador:**

#### **🟢 Chat Activo**
```
[🟢 📶 Chat Activo]
Última actividad: 12 nov 2024, 14:30
```

#### **⚪ Chat Inactivo**
```
[⚪ 📵 Chat Inactivo]
Última actividad: 10 nov 2024, 09:15
```

#### **🔄 Verificando**
```
[⚪ ⏳ Verificando...]
```

### **Ubicación en el Sidebar:**
- **Header**: Junto al badge del estado del lead
- **Detalles**: Debajo del nombre, muestra última actividad
- **Botón Chat**: Cambia texto según estado ("Ir al Chat" vs "Abrir Chat")
- **Botón Actualizar**: En la sección de acciones rápidas

## 🔄 Lógica de Estado

### **Determinación de Estado Activo:**
```javascript
// Considerar activo si hubo actividad en las últimas 24 horas
const lastActivityDate = new Date(lastActivity);
const now = new Date();
const hoursSinceLastActivity = (now - lastActivityDate) / (1000 * 60 * 60);
const isActive = hoursSinceLastActivity < 24;
```

### **Búsqueda de Chat:**
```javascript
// Buscar el chat que coincida con el número de teléfono del lead
const matchingChat = data.data.find(chat => {
  const chatPhone = normalizePhoneNumber(chat.remote_jid || chat.phone || '');
  return chatPhone.includes(normalizedPhone) || normalizedPhone.includes(chatPhone);
});
```

## 🚀 Cómo Funciona

### **1. Carga Automática**
- Al abrir el sidebar del lead, se ejecuta automáticamente `useChatStatus`
- Obtiene el número de teléfono del lead (`whatsapp_id` o `telefono`)
- Consulta la API `/api/chats` para buscar el chat correspondiente

### **2. Verificación de Estado**
- Busca el chat que coincida con el número del lead
- Verifica la última actividad (`last_message_time` o `updated_at`)
- Calcula si fue en las últimas 24 horas

### **3. Actualización Manual**
- Botón "Actualizar Estado Chat" para refrescar
- Útil si el estado cambió recientemente

## 📱 Estados Visuales

### **En el Header:**
```jsx
<Badge variant={isChatActive ? "default" : "secondary"}>
  {isChatActive ? (
    <>
      <Wifi className="h-3 w-3 mr-1" />
      Chat Activo
    </>
  ) : (
    <>
      <WifiOff className="h-3 w-3 mr-1" />
      Chat Inactivo
    </>
  )}
</Badge>
```

### **Detalles de Actividad:**
```jsx
{!chatLoading && lastActivity && (
  <div className="mt-2 text-xs text-muted-foreground">
    Última actividad: {formatDate(lastActivity)}
  </div>
)}
```

### **Botón de Chat Dinámico:**
```jsx
{isChatActive ? 'Ir al Chat' : 'Abrir Chat'}
```

## 🛠️ Archivos Modificados

### **1. Nuevo Hook: `useChatStatus.js`**
- ✅ Lógica completa de verificación de estado
- ✅ Normalización de números de teléfono
- ✅ Manejo de errores y estados de carga
- ✅ Función de refresh manual

### **2. Sidebar: `LeadDetailSidebar.tsx`**
- ✅ Import del hook `useChatStatus`
- ✅ Iconos Wifi/WifiOff agregados
- ✅ Badge de estado en el header
- ✅ Detalles de última actividad
- ✅ Botón de actualización manual
- ✅ Texto dinámico en botón de chat

## ⚙️ Configuración

### **Criterio de "Activo":**
- **24 horas**: Chat se considera activo si hubo actividad en las últimas 24 horas
- **Personalizable**: Fácil de cambiar modificando la constante en `useChatStatus`

### **Fuentes de Datos:**
- **API**: `/api/chats` (lista todos los chats)
- **Campos**: `last_message_time`, `updated_at`, `remote_jid`
- **Matching**: Por número de teléfono normalizado

## 🧪 Cómo Probar

### **1. Abrir Sidebar del Lead**
1. Ve a `/leads`
2. Haz clic en cualquier lead card
3. Se abre el sidebar con el indicador de estado

### **2. Verificar Estados**
- **Con chat activo**: Badge verde "Chat Activo"
- **Sin chat o inactivo**: Badge gris "Chat Inactivo"
- **Cargando**: Badge "Verificando..." con spinner

### **3. Probar Actualización**
1. Haz clic en "Actualizar Estado Chat"
2. Debería mostrar spinner y luego actualizar el estado

### **4. Verificar Última Actividad**
- Si hay actividad reciente, se muestra la fecha/hora
- Formato: "12 nov 2024, 14:30"

## ✅ Estado Final

**🟢 Completamente Funcional**
- ✅ Hook personalizado para estado del chat
- ✅ Indicadores visuales en tiempo real
- ✅ Actualización manual disponible
- ✅ Integración completa en sidebar
- ✅ Manejo de errores robusto
- ✅ Estados de carga visuales
- ✅ Formato de fecha localizado

**¡El sidebar del lead ahora muestra el estado del chat en tiempo real!** 🎉

## 🔮 Posibles Mejoras Futuras

1. **Auto-refresh**: Actualizar automáticamente cada X minutos
2. **Notificaciones**: Alertas cuando el estado cambia
3. **Historial**: Mostrar últimos mensajes del chat
4. **Estados avanzados**: "Escribiendo", "En línea", etc.
5. **Filtros**: Filtrar leads por estado del chat
