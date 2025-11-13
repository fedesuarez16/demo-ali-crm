# 🔍 Depuración: Números de Teléfono en Chats de Chatwoot

## 🎯 Problema Identificado

Las conversaciones de Chatwoot no están trayendo el número de teléfono o JID correctamente, lo que impide encontrar el chat correspondiente al lead.

## ✅ Cambios Implementados

### 1. **API Enriquecida** (`/api/chats/route.js`)

He agregado lógica para **enriquecer** las conversaciones de Chatwoot extrayendo el número de teléfono de múltiples fuentes:

```javascript
// Fuentes de datos que se buscan:
1. meta.sender (phone_number, phone, identifier)
2. additional_attributes (phone_number, phone, wa_id)
3. last_non_activity_message.sender (phone_number, identifier)
4. source_id (formato WAID:numero)
5. contact_inbox.source_id
```

Cada conversación ahora incluye:
- `enriched_phone_number`: Número de teléfono extraído
- `enriched_identifier`: Identificador/JID extraído

### 2. **ChatList.js Mejorado**

La función `getChatPhoneNumber()` ahora:
1. **Prioriza** los campos enriquecidos de la API
2. Tiene 10 niveles de fallback para encontrar el número
3. Busca en todas las ubicaciones posibles donde Chatwoot puede guardar el número

### 3. **Logs de Depuración Extensivos**

Se agregaron logs para ver:
- Estructura completa de la primera conversación de Chatwoot
- Campos enriquecidos extraídos
- Números normalizados durante la búsqueda
- Comparaciones realizadas

## 🧪 Cómo Depurar

### Paso 1: Ver los Logs del Servidor

1. Abre la terminal donde corre tu servidor Next.js
2. Recarga la página de chat
3. Busca estos logs:

```
📋 Primera conversación (muestra): {...}
Found X total conversations, Y WhatsApp conversations
📱 Ejemplo de chat enriquecido: {
  id: ...,
  enriched_phone: "...",
  enriched_identifier: "..."
}
```

### Paso 2: Ver los Logs del Cliente

1. Abre la consola del navegador (F12)
2. Haz clic en un lead y luego en "Ir al Chat"
3. Busca estos logs:

```
🔍 Buscando chat para número: ...
📱 Número normalizado: ...
📋 Chats disponibles: [...]
```

### Paso 3: Analizar la Estructura de Chatwoot

Revisa el log `📋 Primera conversación (muestra)` en la terminal del servidor. Te mostrará algo como:

```json
{
  "id": 123,
  "contact": {
    "phone_number": "...",
    "identifier": "..."
  },
  "additionalAttributes": {
    "phone": "...",
    "wa_id": "..."
  },
  "lastMessage": {
    "sender": {
      "phone_number": "...",
      "identifier": "..."
    },
    "source_id": "WAID:..."
  }
}
```

**¿Qué buscar?**
- ¿Hay algún campo con el número de teléfono?
- ¿En qué formato está? (con +, sin +, con @s.whatsapp.net, etc.)
- ¿Está en una ubicación diferente a las que estamos buscando?

## 🔧 Posibles Soluciones

### Si el número NO aparece en ningún log:

**Opción 1: Verificar configuración de Chatwoot**
- Asegúrate de que Chatwoot esté guardando los números correctamente
- Verifica la integración de WhatsApp con Chatwoot

**Opción 2: Usar API de Contacts de Chatwoot**
```javascript
// En /api/chats/route.js, podríamos agregar:
const contactResponse = await fetch(
  `${baseUrl}/api/v1/accounts/${accountId}/contacts/${chat.meta.sender.id}`,
  { headers: { 'api_access_token': apiToken } }
);
```

**Opción 3: Sincronizar desde n8n**
- Si n8n ya tiene los números correctos, podríamos:
  1. Guardar los números en Supabase cuando n8n procesa los mensajes
  2. Agregar un campo `chatwoot_conversation_id` en la tabla `leads`
  3. Hacer la búsqueda por ID en lugar de por número

### Si el número aparece pero no coincide:

**Problema de normalización**
- Revisa los logs `📱 Número normalizado` vs `📋 Chats disponibles`
- Si los formatos son muy diferentes, ajusta la función `normalizePhoneNumber()`

**Ejemplo:**
```javascript
// Lead tiene: "5491165442102"
// Chat tiene: "+54 9 11 6544-2102"
// Normalizado ambos: "5491165442102" ✅ Deberían coincidir
```

## 📊 Verificar en Producción

1. Abre `/chat` en tu navegador
2. Abre la consola (F12)
3. Haz clic en "Actualizar" en la lista de chats
4. Revisa la pestaña "Network" → busca la petición `/api/chats`
5. Ve la respuesta → Pestaña "Preview" o "Response"
6. Busca: `data[0].enriched_phone_number` y `data[0].enriched_identifier`

**¿Qué deberías ver?**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "enriched_phone_number": "5491165442102",
      "enriched_identifier": "5491165442102@s.whatsapp.net",
      ...
    }
  ]
}
```

## 🚨 Casos Especiales

### Si Chatwoot usa IDs en lugar de números:

Algunos canales de Chatwoot (como Telegram) usan IDs de usuario en lugar de números de teléfono. Para WhatsApp, **siempre debería haber un número**.

### Si necesitas sincronización bidireccional:

Considera agregar un campo en Supabase:
```sql
ALTER TABLE leads ADD COLUMN chatwoot_conversation_id INTEGER;
```

Luego, cuando creas un lead desde Chatwoot:
```javascript
const lead = {
  whatsapp_id: "5491165442102@s.whatsapp.net",
  chatwoot_conversation_id: 123,
  ...
};
```

Y buscar por ID directo:
```javascript
const chat = chats.find(c => c.id === lead.chatwoot_conversation_id);
```

## 📝 Próximos Pasos

1. **Ejecuta la app** y revisa los logs
2. **Copia el log** `📋 Primera conversación (muestra)` y envíamelo
3. **Dime qué números ves** en los logs del navegador
4. Con esa información podré ajustar la lógica de extracción exactamente a tu estructura de Chatwoot

---

## 🎯 Objetivo Final

Que cuando hagas clic en "Ir al Chat" desde un lead:
```
Lead (whatsapp_id: "5491165442102") 
  → Normalizado: "5491165442102"
  → Buscar en chats...
  → Chat encontrado: { id: 123, enriched_phone_number: "5491165442102" }
  → ✅ Redirigir y seleccionar automáticamente
```

