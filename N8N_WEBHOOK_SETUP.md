# 🔗 Configuración de Webhook n8n para Agregar JIDs

## ✅ Estado Actual

- ✅ **Webhook Eliminar**: Ya tienes `/webhook/eliminar-jid` funcionando
- ❌ **Webhook Agregar**: Necesitas crear `/webhook/agregar-jid`

## 🛠️ Cómo Crear el Webhook Agregar JID

### 1. **Duplicar tu Workflow Existente**
1. Ve a tu n8n: `https://mia-n8n.w9weud.easypanel.host`
2. Duplica el workflow que tiene `/webhook/eliminar-jid`
3. Renómbralo a "Agregar JID Webhook"

### 2. **Configurar el Webhook Trigger**
```json
{
  "httpMethod": "POST",
  "path": "agregar-jid",
  "responseMode": "responseNode"
}
```

### 3. **Payload que Recibirás**
La interfaz web enviará este JSON:
```json
{
  "jid": "5492216692697@s.whatsapp.net",
  "ttl": 86400
}
```

### 4. **Nodos del Workflow**

#### **Nodo 1: Webhook Trigger**
- **Tipo**: `Webhook`
- **Path**: `agregar-jid`
- **Método**: `POST`

#### **Nodo 2: Procesar JID**
- **Tipo**: `Code`
- **Código**:
```javascript
// Obtener datos del webhook
const jid = $input.first().json.body.jid;
const ttl = $input.first().json.body.ttl || 86400;

// Validar JID
if (!jid || !jid.includes('@s.whatsapp.net')) {
  throw new Error('JID inválido');
}

return [{
  json: {
    jid: jid,
    ttl: ttl,
    key: `campaña_ocho:${jid}`
  }
}];
```

#### **Nodo 3: Redis SET**
- **Tipo**: `Redis`
- **Operación**: `Set`
- **Key**: `={{ $json.key }}`
- **Value**: `1`
- **TTL**: `={{ $json.ttl }}`

#### **Nodo 4: Response**
- **Tipo**: `Respond to Webhook`
- **Response Body**:
```json
{
  "success": true,
  "message": "JID agregado exitosamente",
  "jid": "={{ $('Procesar JID').first().json.jid }}",
  "ttl": "={{ $('Procesar JID').first().json.ttl }}"
}
```

## 🧪 Cómo Probar

### **Desde la Interfaz Web**:
1. Ve a `/redis-manager`
2. Agrega un JID (ej: `5492216692697`)
3. Debería mostrar: "JID enviado a n8n exitosamente"

### **Manualmente con curl**:
```bash
curl -X POST https://mia-n8n.w9weud.easypanel.host/webhook/agregar-jid \
  -H "Content-Type: application/json" \
  -d '{"jid": "5492216692697@s.whatsapp.net", "ttl": 86400}'
```

### **Verificar en Redis**:
Usa tu webhook existente de verificación o Redis CLI:
```bash
redis-cli GET "campaña_ocho:5492216692697@s.whatsapp.net"
```

## 🔧 Workflow Completo Sugerido

```json
{
  "name": "Agregar JID Webhook",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "agregar-jid",
        "responseMode": "responseNode"
      },
      "type": "n8n-nodes-base.webhook",
      "position": [240, 300],
      "name": "Webhook"
    },
    {
      "parameters": {
        "jsCode": "const jid = $input.first().json.body.jid;\nconst ttl = $input.first().json.body.ttl || 86400;\n\nif (!jid || !jid.includes('@s.whatsapp.net')) {\n  throw new Error('JID inválido');\n}\n\nreturn [{\n  json: {\n    jid: jid,\n    ttl: ttl,\n    key: `campaña_ocho:${jid}`\n  }\n}];"
      },
      "type": "n8n-nodes-base.code",
      "position": [460, 300],
      "name": "Procesar JID"
    },
    {
      "parameters": {
        "operation": "set",
        "key": "={{ $json.key }}",
        "value": "1",
        "expire": true,
        "ttl": "={{ $json.ttl }}"
      },
      "type": "n8n-nodes-base.redis",
      "position": [680, 300],
      "name": "Redis SET",
      "credentials": {
        "redis": {
          "id": "TU_REDIS_CREDENTIAL_ID"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"success\": true,\n  \"message\": \"JID agregado exitosamente\",\n  \"jid\": \"{{ $('Procesar JID').first().json.jid }}\",\n  \"ttl\": {{ $('Procesar JID').first().json.ttl }}\n}"
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "position": [900, 300],
      "name": "Response"
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Procesar JID",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Procesar JID": {
      "main": [
        [
          {
            "node": "Redis SET",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Redis SET": {
      "main": [
        [
          {
            "node": "Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

## ✅ Una Vez Configurado

Después de crear el webhook, la interfaz web podrá:

1. **Agregar JIDs**: Envía a `/webhook/agregar-jid` → n8n procesa → Redis
2. **Eliminar JIDs**: Envía a `/webhook/eliminar-jid` → n8n procesa → Redis  
3. **Listar JIDs**: Se mantiene localmente para mostrar en la interfaz

**¡Tu interfaz web estará completamente integrada con n8n!** 🎉
