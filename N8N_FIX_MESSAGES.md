# Solución para Mensajes del Sistema en n8n

## Problema
Todos los mensajes aparecen como si fueran del cliente, cuando algunos son del sistema/agente que responde.

## Solución

El nodo "Postgres Chat Memory" de n8n guarda automáticamente los mensajes, pero puede que no esté guardando el campo `role` o `direction` correctamente.

### Opción 1: Agregar nodo para guardar mensaje del agente explícitamente

Después del nodo "Enviar WhatsApp YCloud2" o "Enviar WhatsApp YCloud", agregar un nodo "Supabase" que guarde explícitamente el mensaje del agente con los campos correctos:

**Configuración del nodo Supabase:**
- **Operation**: Insert
- **Table**: `chat_histories`
- **Fields**:
  - `session_id`: `={{ $('Webhook1').item.json.body.whatsappInboundMessage.from }}`
  - `message` (JSONB): 
    ```json
    {
      "content": "={{ $('RAG Agent2').item.json.output }}",
      "text": "={{ $('RAG Agent2').item.json.output }}",
      "message_type": 1,
      "direction": "outbound",
      "role": "assistant",
      "from": "={{ $('Webhook1').first().json.body.whatsappInboundMessage.to }}",
      "to": "={{ $('Webhook1').first().json.body.whatsappInboundMessage.from }}",
      "phone_number": "={{ $('Webhook1').first().json.body.whatsappInboundMessage.from }}",
      "status": "sent",
      "created_at": "={{ new Date().toISOString() }}"
    }
    ```

### Opción 2: Modificar el guardado del mensaje entrante

Antes del nodo "RAG Agent2", agregar un nodo "Supabase" que guarde el mensaje entrante del cliente con los campos correctos:

**Configuración del nodo Supabase:**
- **Operation**: Insert
- **Table**: `chat_histories`
- **Fields**:
  - `session_id`: `={{ $('Webhook1').item.json.body.whatsappInboundMessage.from }}`
  - `message` (JSONB):
    ```json
    {
      "content": "={{ $('Parsear Mensaje1').item.json.messageBody }}",
      "text": "={{ $('Parsear Mensaje1').item.json.messageBody }}",
      "message_type": 0,
      "direction": "inbound",
      "role": "user",
      "from": "={{ $('Parsear Mensaje1').item.json.from }}",
      "to": "={{ $('Parsear Mensaje1').item.json.to }}",
      "phone_number": "={{ $('Parsear Mensaje1').item.json.from }}",
      "status": "received",
      "created_at": "={{ $('Parsear Mensaje1').item.json.timestamp }}"
    }
    ```

## Campos Importantes

Para que la API detecte correctamente si un mensaje es del sistema o del cliente, el mensaje debe tener al menos uno de estos campos:

- `message_type`: `1` (sistema) o `0` (cliente)
- `direction`: `"outbound"` (sistema) o `"inbound"` (cliente)
- `role`: `"assistant"` o `"ai"` (sistema) o `"user"` o `"human"` (cliente)
- `sender_type`: `"User"` (sistema) o `"Contact"` (cliente)

## Nota

La API ya ha sido mejorada para detectar mensajes del sistema usando múltiples campos, pero es mejor asegurarse de que los mensajes se guarden con los campos correctos desde n8n.
