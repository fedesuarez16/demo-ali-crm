# Migración a YCloud (coexistence): staging

Esta carpeta **no** la lee `npm run sync:n8n` (solo sincroniza `workflows/*.json`).
Acá viven las versiones adaptadas de los workflows de producción hasta el corte.

## Arquitectura

```
Lead ⇄ WhatsApp ⇄ YCloud ⇄ n8n (puentes) ⇄ Chatwoot inbox 4 (API) ⇄ agente / CRM
```

| Pieza | Dónde | Estado |
|---|---|---|
| Inbox API "WhatsApp YCloud - Team Ali" | Chatwoot, cuenta 2, **inbox 4** (webhook → `/webhook/ycloud-puente-salida`) | Creado |
| Puente de entrada YCloud → Chatwoot | n8n `DkWFxIuI9acMvhKR` (path `ycloud-puente-entrada`) | Inactivo · Chatwoot ✅ · YCloud ❌ · probado e2e 2026-10-12 |
| Puente de salida Chatwoot → YCloud | n8n `GSv4sNlQufgU9XW9` (path `ycloud-puente-salida`) | Inactivo · Chatwoot ✅ · YCloud ❌ · probado e2e hasta el envío |
| Sub-workflow enviar plantilla | n8n `kTnlO8UPG1BozSzt` | Inactivo · YCloud ❌ |

Credencial n8n `Chatwoot Team Ali` (`WAjyEc5MUwYbhicS`) creada y asignada. Falta `YCloud Team Ali` (X-API-Key): asignarla en
"YCloud - Descargar adjunto" (entrada), "YCloud - Enviar" (salida) y "YCloud - Enviar plantilla" (sub-workflow).
Si se rota el token de Chatwoot: actualizar la credencial y los nodos del seguimiento/agente que lo tienen hardcodeado.

### Prueba e2e (2026-10-12, inbox 4, número ficticio)
- Entrante YCloud → contacto + conversación en inbox 4 + mensaje `incoming` con `source_id = wamid` ✅
- Mismo evento reenviado (retry de YCloud) → descartado por Redis ✅
- Echo → mensaje `outgoing` con `source_id`; el puente de salida lo ignoró ✅
- `conversation_created` / `conversation_updated` → ignorados por el puente de salida ✅
- Respuesta simulada del bot (sin `source_id`) → verificada contra la API, payload correcto, fallo de envío → nota privada con el motivo ✅
- La nota privada no volvió a salir ✅
- Condición de pausa por echo: matchea exactamente 1 lead real por `whatsapp_id` ✅
- Datos de prueba borrados (Chatwoot y `mensajes_pendientes`).
| Seguimiento adaptado | `Team ali - seguimiento (ycloud).json` | Listo para el corte |
| Agente adaptado | Movido a `workflows/backups/Team ali - agente (ycloud)_staging-pre-corte.json` | Obsoleto: el corte ya se hizo y producción es `workflows/Team ali - agente (14).json` (mismo id `ejW2YR1lNj3dYsGc`, no subir) |
| Pruebas de lógica de los puentes | `node workflows-staging/puente.test.mjs` | 25/25 OK |

## Reglas del puente (por qué no hay duplicados ni bucles)

- El puente de entrada crea cada mensaje con `source_id = wamid`. **Chatwoot descarta `content_attributes` en mensajes creados por API**, así que la marca es `source_id` (verificado en vivo el 2026-10-10).
- El puente de salida solo envía mensajes `outgoing`, no privados y **sin `source_id`**. Bot, CRM y agentes crean mensajes sin `source_id`; los echoes y entrantes siempre lo traen.
- El puente de salida no confía en el webhook: vuelve a leer el mensaje desde la API de Chatwoot y exige inbox 4.
- Un echo (lo que el equipo escribe desde la app del celular) pausa el bot del lead: `leads.estado_chat = 0`.
- Las plantillas del seguimiento se registran en Chatwoot como notas privadas → el puente las ignora.
- Envío sin reintentos automáticos (un reintento puede duplicar). Si YCloud rechaza (ej. ventana de 24 h), queda una nota privada en la conversación.

## Cambios en los workflows adaptados

**Seguimiento**
- 9 nodos "Send template" del número principal (`1128023933718383`) → sub-workflow YCloud (mismo nombre, mismas conexiones, mismo comportamiento ante error: corta la ejecución).
- `Send template4` / `Send template5` (`tibio_tercero`, `tibio_cuarto`) **quedan en Cloud API**: salen del número `952223914630147`, que no se migra.
- `Chatwoot - Crear Conversacion1`: `inbox_id` 3 → 4.
- `Code - Verificar si hay items`: `INBOX_ID` 3 → 4 y un `chatwoot_conversation_id` del inbox 3 se considera inválido → se re-resuelve por teléfono y se persiste. **No hace falta migrar datos.**

**Agente**
- Rama de audio: el nodo de Evolution API (leía campos que Chatwoot no manda → los audios no se transcribían) se reemplaza por una descarga HTTP de `attachments[0].data_url`.
- `Obtener Historial Evolution4` / `Formatear Historial4` (rama audio) alineados con la rama de texto (antes apuntaban a `app.chatwoot.com` cuenta 135793).
- La entrada no cambia: `Normalice1` procesa mensajes del inbox 4 sin cambios (verificado en vivo).

## Checklist del corte

Antes (sin impacto en producción):
- [ ] `node scripts/backup-snapshot.mjs pre-ycloud` y backup de Postgres de Chatwoot (Easypanel).
- [ ] Crear en n8n la credencial **Chatwoot Team Ali**: Header Auth, `api_access_token` = token de Chatwoot.
- [ ] Crear en n8n la credencial **YCloud Team Ali**: Header Auth, `X-API-Key` = API key de YCloud (Developers → API Keys).
- [ ] Asignarlas en los nodos HTTP de los 3 workflows nuevos (las notas de cada nodo dicen cuál).

Corte:
1. [ ] Pausar el schedule del workflow de seguimiento.
2. [ ] WhatsApp Manager: desactivar PIN de dos pasos y **eliminar solo el número** `+54 9 221 627 3335` (no el WABA).
3. [ ] Registrar el número en la app WhatsApp Business y usarla de verdad (≥7 días).
4. [ ] YCloud: Create Channel → **WhatsApp Business APP Coexistence** → Connect with Facebook → portfolio Team Ali → escanear QR → sincronizar historial.
5. [ ] Recrear las plantillas en el WABA nuevo y esperar aprobación:
   `node scripts/recrear-plantillas-ycloud.mjs ~/demo-ali-backups/pre-ycloud_<fecha>/meta/message_templates.json` (simula)
   y después con `--apply` (requiere `YCLOUD_API_KEY` y `YCLOUD_WABA_ID` en `.env.local`). Las que tengan header con imagen/video avisan: subir el archivo de nuevo.
6. [ ] YCloud Developers → Webhook → endpoint `https://mia-n8n.w9weud.easypanel.host/webhook/ycloud-puente-entrada` con `whatsapp.inbound_message.received` y `whatsapp.smb.message.echoes`.
7. [ ] Activar los 2 puentes y el sub-workflow.
8. [ ] Copiar los JSON adaptados a `workflows/` y `npm run sync:n8n`.
9. [ ] Pruebas con un teléfono propio: entra, responde el bot, respuesta desde el celular pausa el bot, sale una plantilla, sin duplicados.
10. [ ] Reactivar el schedule del seguimiento.

Pendiente de seguridad: validar el header `YCloud-Signature` en el puente de entrada (HMAC-SHA256 de `t.rawBody` con el secreto del endpoint).

Rollback: `~/demo-ali-backups/pre-ycloud_2026-10-10/RESTORE.md`.
