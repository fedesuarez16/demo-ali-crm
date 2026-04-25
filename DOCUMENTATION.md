# Documentación del Proyecto — CRM Inmobiliaria

CRM inmobiliario construido sobre **Next.js 15 (App Router)** que centraliza gestión de leads, propiedades, conversaciones de WhatsApp, seguimientos automáticos y un asistente de IA con RAG. Los datos viven en **Supabase** (Postgres + pgvector), los chats se proxean contra **Chatwoot**, las automatizaciones y envíos se ejecutan en **n8n**, y el asistente consulta **OpenAI**.

---

## 1. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15.3.6 (App Router, React 19) |
| Lenguaje | TypeScript 5 (strict) + JavaScript para hooks/APIs legacy |
| Estilos | Tailwind CSS 3.4 + `tailwindcss-animate` |
| UI | shadcn/ui (Radix UI) + Lucide React + Heroicons |
| Gráficos | Recharts |
| Base de datos | Supabase (Postgres 15 + pgvector) |
| Chat / WhatsApp | Chatwoot API |
| Automatización | n8n (webhooks) |
| IA | OpenAI (`gpt-4o-mini` por defecto, embeddings `text-embedding-3-small`) |
| Cache / colas | Redis (gestionado desde n8n) |

---

## 2. Requisitos

- Node.js 18.17+ (requerido por Next.js 15)
- npm (hay `package-lock.json`; también existe `pnpm-lock.yaml` pero los scripts oficiales usan `npm`)
- Una instancia de Supabase con las migraciones de `supabase/migrations/` aplicadas y pgvector habilitado
- Acceso a una instancia de Chatwoot (opcional si no se usa `/chat`)
- Workflow de n8n con API pública habilitada (ver §13). El proyecto incluye sync automático del workflow principal contra el server.
- API key de OpenAI (opcional si no se usa `/asistente`)

---

## 3. Configuración del entorno

Crear `.env.local` en la raíz:

```env
# --- Supabase (obligatorio para casi todo) ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# --- Chatwoot (vista /chat y APIs /api/chats, /api/agents) ---
CHATWOOT_URL=                       # ej: https://chatwoot.example.com
CHATWOOT_ACCOUNT_ID=                # ej: 2
CHATWOOT_API_TOKEN=                 # api_access_token

# --- OpenAI (/api/ai-chat y /api/ai-knowledge) ---
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini            # opcional
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # opcional, 1536 dims
AI_KNOWLEDGE_MATCH_COUNT=10         # opcional, top-k para RAG

# --- WhatsApp Cloud (opcional, features específicas) ---
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# --- Redis (no lo consume el frontend directo, pero lo usan scripts/n8n) ---
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
REDIS_DB=

# --- n8n sync (para npm run sync:n8n) ---
N8N_BASE_URL=https://mia-n8n.w9weud.easypanel.host
N8N_API_KEY=                        # generada en n8n Settings → n8n API
```

> **Importante:** las variables no rompen el build si faltan. Los servicios las validan en cada request y devuelven `503` o `500` con mensaje descriptivo.

---

## 4. Instalación y comandos

```bash
# 1. Instalar dependencias
npm install

# 2. Aplicar migraciones en Supabase (SQL Editor o CLI)
#    Ejecutar en orden los archivos de supabase/migrations/*.sql
#    y además los scripts SUPABASE_*.sql de la raíz si aplica.

# 3. Levantar en dev
npm run dev        # http://localhost:3000

# Otros
npm run build      # build de producción (también ejecuta type-check)
npm run start      # server de producción
npm run lint       # next lint
npm run sync:n8n   # sincroniza workflows/*.json con n8n (ver §13)
```

No hay suite de tests configurada. El type-check se obtiene ejecutando `npm run build`.

---

## 5. Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx                       # Home (estadísticas de leads)
│   ├── layout.tsx                     # Root layout (Inter font, metadata)
│   ├── globals.css                    # Tailwind + CSS vars shadcn
│   │
│   ├── dashboard/page.tsx             # Dashboard con gráficos (Recharts)
│   ├── leads/
│   │   ├── page.tsx                   # Vista Kanban
│   │   └── tabla/page.tsx             # Vista tabla + filtros
│   ├── chat/page.tsx                  # WhatsApp vía Chatwoot
│   ├── propiedades/
│   │   ├── page.tsx                   # Kanban de propiedades
│   │   ├── nueva/page.tsx
│   │   ├── busquedas/page.tsx         # Tabla propiedad_busquedas
│   │   └── [id]/editar/page.tsx
│   ├── campanas-activas/page.tsx      # Leads agrupados por campaña
│   ├── mensajes-programados/page.tsx  # Cola de seguimientos
│   ├── redis-manager/page.tsx         # JIDs en Redis
│   ├── conocimiento/page.tsx          # Carga de chunks para RAG
│   ├── asistente/page.tsx             # Chat con la IA
│   ├── automatizaciones/              # Editor visual de workflows
│   │
│   ├── api/                           # Route Handlers
│   │   ├── agent-status/route.ts      # GET/POST estado del agente IA (tabla agent_status)
│   │   ├── agents/route.js            # GET agentes de Chatwoot
│   │   ├── ai-chat/route.ts           # GET/POST conversaciones IA + RAG
│   │   ├── ai-knowledge/route.ts      # CRUD chunks (con embeddings)
│   │   ├── chats/
│   │   │   ├── route.js               # GET conversaciones Chatwoot
│   │   │   ├── search/route.js        # POST búsqueda exhaustiva por teléfono
│   │   │   └── [id]/messages/...      # GET/POST mensajes + attachments
│   │   ├── pautas/route.ts            # CRUD pautas del agente
│   │   └── redis-jids/route.ts        # Gestión de JIDs en Redis vía n8n
│   │
│   ├── components/                    # Componentes de la app
│   ├── services/                      # Capa de datos (ver §8)
│   ├── hooks/                         # useChats, useChatMessages, ...
│   ├── types/index.ts                 # Tipos TypeScript
│   ├── utils/                         # CSV parse/export
│   └── data/                          # JSONs legacy
│
├── components/ui/                     # Primitivos shadcn/ui
├── hooks/                             # use-mobile
└── lib/
    ├── supabase.ts                    # Cliente singleton
    └── utils.ts                       # cn()

supabase/
└── migrations/
    ├── 20260413120000_ai_chat.sql             # ai_conversations, ai_messages
    ├── 20260413123000_ai_knowledge_chunks.sql # pgvector + función de matching
    └── 20260413130000_ai_multi_assistant.sql  # multi-asistente por assistant_id

workflows/                            # exports de workflows n8n versionados (ver §13)
└── Team ali - agente (14).json       # workflow principal (id ejW2YR1lNj3dYsGc)

scripts/
└── sync-n8n.mjs                      # sincroniza workflows/*.json → n8n vía API

.github/workflows/
└── sync-n8n.yml                      # GH Action: sync automático en push a main
```

La raíz contiene múltiples `*.md` históricos (decisiones, fixes puntuales) y scripts `SUPABASE_*.sql` one-off — **no forman parte del build** y sirven como referencia.

---

## 6. Arquitectura general

```
┌─────────────────┐        ┌───────────────┐
│  Next.js UI /   │ HTTP   │   Chatwoot    │  WhatsApp / conversaciones
│  Route Handlers │◄──────►│      API      │
└────────┬────────┘        └───────────────┘
         │
         │   supabase-js (anon key)
         ▼
  ┌───────────────┐         ┌───────────────┐
  │   Supabase    │         │    n8n        │  Webhooks: agregar-jid,
  │  Postgres +   │         │ (automat.)    │  eliminar-jid, calificación,
  │   pgvector    │         └──────┬────────┘  envío seguimientos
  └──────┬────────┘                │
         │                         ▼
         │                  ┌───────────────┐
         │                  │     Redis     │
         │                  └───────────────┘
         ▼
  ┌───────────────┐
  │    OpenAI     │  embeddings + chat completions (RAG)
  └───────────────┘
```

Puntos clave:

- La UI es un **panel delgado** sobre Chatwoot para los chats: los mensajes no se persisten en Supabase.
- n8n es la **fuente de verdad operativa** de la calificación automática de leads, el envío de seguimientos y la gestión de Redis. El frontend sólo dispara webhooks o consulta lo que n8n ya escribió en Supabase.
- El asistente IA usa **RAG**: embebe la query del usuario, llama a la RPC `match_ai_knowledge_chunks` (pgvector) y envía el contexto recuperado al modelo.

---

## 7. Modelo de datos (Supabase)

### `leads` — tabla principal

| Columna | Tipo | Uso |
|---|---|---|
| `id` | serial PK | |
| `whatsapp_id` | text UNIQUE | teléfono / identificador WhatsApp |
| `nombre` | text | |
| `estado` | text | `'frío'`, `'tibio'`, `'caliente'`, `'llamada'`, `'visita'` o columna personalizada |
| `presupuesto`, `zona`, `tipo_propiedad`, `forma_pago`, `intencion` | text/numeric | |
| `caracteristicas_buscadas`, `caracteristicas_venta` | text | |
| `propiedades_mostradas`, `propiedad_interes` | text | campaña asociada |
| `seguimientos_count` | int | contador de toques |
| `notas` | text | |
| `estado_chat` | int | `1` activo / `0` inactivo — **independiente de `estado`** |
| `chatwoot_conversation_id` | int | para calificación por conteo de mensajes |
| `created_at`, `updated_at`, `ultima_interaccion` | timestamptz | |

### `propiedades` — CRUD completo

Columnas principales: `tipo_de_propiedad`, `direccion`, `zona`, `valor`, `dormitorios`, `banos`, `patio_parque`, `garage`, `mts_const`, `lote`, `piso`, `link`, `columna_1`, `apto_banco`, `notas`, más `alternativa_menor_1..5` y `alternativa_mayor..5` para sugerir opciones.

### `documents` — propiedades con embeddings

Mismos campos que `propiedades` + `embedding vector`, `metadata jsonb`, `content`, `descripcion`. Usada para búsqueda semántica.

### `propiedad_busquedas` — búsquedas históricas

`valor`, `zona`, `patio`, `piscina`, `habitaciones`, `banos`, `mts2`, `archivo_origen`, `created_at`.

### `kanban_columns` — configuración del tablero

`custom_columns text[]`, `visible_columns text[]`, `column_colors jsonb` (mapeo columna → color hex).

### `agent_status` — toggle del agente IA de n8n

Una única fila con `id=1` y `is_active boolean`. n8n consulta esta fila al inicio del workflow.

### `pautas` — instrucciones para el agente

`id`, `texto`, `activo`, `created_at`.

### `cola_seguimientos` / `cola_seguimientos_dos` — seguimientos programados

`remote_jid`, `session_id`, `mensaje`, `fecha_programada`, `estado` (`'pendiente'`/`'enviado'`), `tipo_lead`, `seguimientos_count`, `chatwoot_conversation_id`, `plantilla` (ej. `toque_1_frio`, `toque_2_tibio`). Los mensajes migran entre tablas según `plantilla`.

### Tablas de IA

- `ai_conversations` — `id uuid`, `title`, `created_at`, `updated_at`.
- `ai_messages` — `id uuid`, `conversation_id`, `role` (`user`/`assistant`/`system`), `content`, `created_at`.
- `ai_knowledge_chunks` — `id uuid`, `content`, `embedding vector(1536)`, `assistant_id text` (default `'tasador'`), `created_at`. Indexada con `ivfflat` + `vector_cosine_ops`.

### RLS

Todas las tablas tienen RLS habilitado con políticas `FOR ALL USING (true) WITH CHECK (true)`. Esto es **intencional**: el CRM es single-tenant interno con la anon key.

---

## 8. Capa de servicios (`src/app/services/`)

Cada servicio encapsula una tabla o un dominio. Todos crean su propio cliente Supabase con un `getSupabase()` singleton por módulo.

| Servicio | Responsabilidad | Exports principales |
|---|---|---|
| `leadService.ts` | Leads: fetch, filtro, calificación, campañas | `getAllLeads`, `searchLeads`, `filterLeads`, `updateLeadStatus`, `createLead`, `updateLead`, `findLeadByPhone`, `buildCampaignRepresentatives`, `recalificarLead` |
| `propiedadesService.ts` | CRUD de `propiedades` | `getAllPropiedades`, `createPropiedad`, `updatePropiedad`, `deletePropiedad`, `getAllPropiedadDirecciones` |
| `documentService.ts` | Lectura de `documents` (con embeddings) | `getAllDocuments`, `filterDocuments`, `groupDocumentsByPropertyType` |
| `busquedasPropiedadService.ts` | CRUD de `propiedad_busquedas` | `getAllPropiedadBusquedas`, `insertPropiedadBusquedas`, `countPropiedadBusquedas` |
| `columnService.ts` | Columnas Kanban personalizadas | `getKanbanColumns`, `saveKanbanColumns`, `migrateColumnsFromLocalStorage` |
| `mensajeService.ts` | Seguimientos y colas | `programarSeguimiento`, `moverMensajeEntreTablas`, `getSeguimientosPendientes`, `eliminarTodosSeguimientosPendientes`, `marcarMensajeEnviado` |
| `matchingService.ts` | Matching leads ↔ propiedades | `findMatchingPropertiesForLead`, `findMatchingLeadsForProperty`, `getMatchingStats` |
| `propertyService.ts` | **Legacy** — lee `data/properties.json` | no usar para features nuevas |
| `automationService.ts` | Workflows de automatización (datos mock) | `getWorkflows`, `createWorkflow`, `updateWorkflow` |

---

## 9. API Routes (`src/app/api/`)

### `/api/agent-status`
- `GET` → `{ is_active: boolean }`
- `POST { is_active: boolean }` → actualiza la fila `id=1` de `agent_status`
- Tiene fallback en memoria si Supabase no está configurado.

### `/api/agents`
- `GET` → lista de agentes de Chatwoot (`/api/v1/accounts/:id/agents`).

### `/api/chats`
- `GET` → conversaciones paginadas de Chatwoot. **Chatwoot ignora `per_page`** y devuelve ~25 por página. Response shape real: `data.data.payload`.
- `GET /api/chats/:id/messages` → mensajes de la conversación.
- `POST /api/chats/:id/messages` → enviar mensaje.
- `POST /api/chats/search` → búsqueda exhaustiva por teléfono (pagina toda la API).
- `GET /api/chats/:id/messages/:messageId/attachments/:attachmentId` → descarga adjuntos.

### `/api/pautas`
- `GET` → listado ordenado por `created_at DESC`.
- `POST { texto, activo? }` → crear pauta.

### `/api/redis-jids`
- `GET ?jid=…` → consulta un JID (o lista todos).
- `POST { jid, value, ttl }` → agrega JID (proxy a `POST /webhook/agregar-jid` de n8n).
- `DELETE ?jid=…` → elimina (proxy a `POST /webhook/eliminar-jid`).
- Mantiene un Map en memoria como espejo — se pierde al reiniciar.

### `/api/ai-chat`
- `GET` → lista 50 conversaciones más recientes.
- `GET ?conversationId=…` → mensajes de una conversación.
- `POST { conversationId?, content, assistantId? }` → envía mensaje del usuario, hace RAG contra `match_ai_knowledge_chunks`, llama a OpenAI, persiste ambos mensajes en `ai_messages`.

### `/api/ai-knowledge`
- `GET ?assistantId=…` → `count` de chunks.
- `POST { content, assistantId }` → chunkea (1000 chars, overlap 200), genera embeddings con `text-embedding-3-small`, inserta en `ai_knowledge_chunks`.

---

## 10. Flujos clave

### Leads

1. `getAllLeads()` trae los últimos 1000 leads (`created_at DESC`) y los mapea con `mapLeadRow()`.
2. Normalización de estado: `'Fríos' → 'frío'`. Estados inválidos (`'activo'`, `'inicial'`) se corrigen a `'frío'` en background.
3. **Calificación**: n8n es quien califica (cuenta mensajes en Chatwoot → ≤2 frío, 3–15 tibio, >15 caliente). El frontend sólo tiene `recalificarLead` como fallback manual.
4. **Campañas**: `propiedad_interes` se agrupa con `buildCampaignRepresentatives()` usando una huella numérica (números presentes en el texto, ordenados) para unir variantes como `"466 ENTRE 24 Y 25"` y `"466 e/ 24 y 25"`. Fallback: similitud de strings con threshold 65%.
5. **Kanban**: las columnas visibles y sus colores se leen de `kanban_columns`; el tipo `LeadStatus` es `string` para aceptar columnas personalizadas.

### Chat (WhatsApp vía Chatwoot)

1. `useChats` pagina `/api/chats` y enriquece cada conversación extrayendo el teléfono desde varias fuentes (`meta.sender.phone_number`, `meta.sender.identifier`, `last_non_activity_message.sender.identifier` con `@s.whatsapp.net`, `source_id` con prefijo `WAID:`, `additional_attributes.wa_id`).
2. Búsqueda en dos niveles: primero en `ChatList.js` sobre la cache local; si no hay hit, `POST /api/chats/search` pagina exhaustivamente Chatwoot.
3. **Normalización de teléfonos**: siempre convertir a sólo dígitos y comparar por los **últimos 10 dígitos** (maneja `+54`, `549`, sufijos `@s.whatsapp.net`).

### Propiedades

- CRUD vive en `propiedadesService` (tabla `propiedades`).
- Búsqueda semántica usa `documents` (con embeddings).
- `properties.json` es **legacy** — no extender.

### Seguimientos

1. `programarSeguimiento()` crea/actualiza en `cola_seguimientos`.
2. Plantillas: `toque_X_frio` (lead frío, `seguimientos_count = X`), `toque_X_tibio` (lead tibio, `seguimientos_count = X + 8`).
3. Al llegar a `toque_2_*`, el mensaje migra a `cola_seguimientos_dos` via `moverMensajeEntreTablas()`.
4. **n8n ejecuta los envíos** leyendo las filas con `estado='pendiente'` y `fecha_programada <= now()`.

### Asistente IA (RAG)

1. UI en `/asistente` usa `/api/ai-chat`.
2. Por cada mensaje:
   - Embedding de la query (`text-embedding-3-small`, 1536 dims).
   - RPC `match_ai_knowledge_chunks(query_embedding, match_count, match_assistant_id)` → top-k chunks por similitud coseno, filtrados por `assistant_id` (default `'tasador'`).
   - Se construye prompt con los chunks como contexto + últimos 40 mensajes de la conversación.
   - Llamada a `chat.completions.create()` (modelo configurable, default `gpt-4o-mini`).
   - Se persisten mensajes user + assistant en `ai_messages`.
3. Carga de conocimiento en `/conocimiento` → `POST /api/ai-knowledge` (chunking 1000/200 + embeddings).

---

## 11. Convenciones

### Idioma
Todo el código, UI, enums, nombres de tabla y columnas están en **español**. Mantener la convención al editar.

### Path alias
```ts
"@/*": ["./src/*"]
```
Uso típico: `import { supabase } from '@/lib/supabase'`, `import { Button } from '@/components/ui/button'`.

### Cliente Supabase
- Cada servicio tiene su propio `getSupabase()` singleton interno.
- Las queries usan `(supabase as any)` porque **no hay `database.types.ts` generado** — es intencional.
- `src/lib/supabase.ts` exporta un cliente general, pero la mayoría de servicios no lo usan (sólo `/api/agent-status`).

### Archivos .js vs .tsx
- TypeScript para todo lo nuevo.
- Los hooks de chat (`useChats`, `useChatMessages`, `useChatStatus`, `useAgents`) y algunas rutas API (`/api/chats/*`, `/api/agents`) están en `.js` — legacy, no vale la pena migrarlos aisladamente.

### Teléfonos
Helpers como `extractNumericPhone()` quitan `@s.whatsapp.net`, `WAID:`, `+`. **Siempre comparar por los últimos 10 dígitos**.

### Campos independientes
`lead.estado` (Kanban) y `lead.estado_chat` (canal activo) son **ortogonales**. No mezclar.

---

## 12. Integraciones externas

### Chatwoot
- Headers: `api_access_token: <CHATWOOT_API_TOKEN>`.
- Endpoints: `/api/v1/accounts/:id/conversations`, `.../messages`, `/agents`.
- Response shape: `{ data: { payload: [...], meta: {...} } }`.

### n8n
- **Host**: `https://mia-n8n.w9weud.easypanel.host` (self-hosted community, Hostinger + EasyPanel).
- **Webhooks frontend**: `POST /webhook/agregar-jid`, `POST /webhook/eliminar-jid`.
- **API REST pública**: habilitada en Settings → n8n API. Header de auth: `X-N8N-API-KEY`.
- **Workflow principal versionado**: `Team ali - agente` (id `ejW2YR1lNj3dYsGc`). El JSON vive en `workflows/` y se sincroniza con la instancia via `npm run sync:n8n` o el GitHub Action. Detalles en §13.
- **Funciones que ejecuta n8n (no el frontend)**: calificación de leads (cuenta mensajes en Chatwoot), envío de seguimientos, escritura en Redis.

### OpenAI
- Modelo chat: `OPENAI_MODEL` (default `gpt-4o-mini`).
- Embeddings: `OPENAI_EMBEDDING_MODEL` (default `text-embedding-3-small`, 1536 dims).
- Se usa el SDK oficial `openai` v6.

---

## 13. Sincronización de workflows n8n

El proyecto versiona el workflow principal de n8n como JSON en `workflows/` y lo sincroniza contra la instancia remota mediante la REST API de n8n. El repo es la fuente de verdad: un `git push` a `main` dispara un GitHub Action que aplica los cambios en el server.

### Archivos involucrados

| Path | Rol |
|---|---|
| `workflows/*.json` | Exports de workflows n8n (fuente de verdad) |
| `scripts/sync-n8n.mjs` | Script Node puro (sin deps) que hace `PUT /api/v1/workflows/:id` |
| `.github/workflows/sync-n8n.yml` | GitHub Action que ejecuta el script en push a `main` |
| `package.json` → `sync:n8n` | Atajo local para correr el script |

### Workflow versionado

Actualmente **un solo** workflow está en sync:

| Nombre | Id | Archivo |
|---|---|---|
| Team ali - agente | `ejW2YR1lNj3dYsGc` | `workflows/Team ali - agente (14).json` |

El sufijo `(14)` del nombre de archivo refleja la versión exportada desde n8n. Al reemplazarlo con uno nuevo (ej. `(15).json`), borrar el viejo del mismo folder para evitar que el script intente sincronizar ambos.

### Flujo de edición local → producción

**Opción A — editar en n8n UI** (recomendado para cambios visuales):

```
1. Abrir workflow en https://mia-n8n.w9weud.easypanel.host
2. Editar en el canvas visual
3. ⋮ → Download → guarda el JSON actualizado
4. Reemplazar workflows/<archivo> con el nuevo export
5. git add + git commit + git push
6. El GH Action sincroniza automáticamente (~15s después)
```

**Opción B — editar JSON localmente** (útil para cambios programáticos desde Claude Code / scripts):

```
1. Editar workflows/<archivo>.json
2. npm run sync:n8n   # sincroniza inmediatamente contra n8n (~2s)
3. Verificar el cambio en el UI de n8n
4. Si todo ok: commit + push para versionar
```

### Campos que el sync NO toca

- **Credenciales** (API keys de nodos): n8n las omite del export. Se configuran una vez en el UI.
- **Estado `active`**: el script no activa ni desactiva workflows — eso se controla desde el UI.
- **Ejecuciones históricas**: son del server, no del repo.

### Campos que el script filtra antes de enviar

n8n rechaza campos de sólo-lectura o internos del UI. El script strippea:

- **Top-level**: `id`, `createdAt`, `updatedAt`, `versionId`, `meta`, `triggerCount`, `tags`, `pinData`, `shared`, `active`.
- **Dentro de `settings`**: `binaryMode`, `callerPolicy`, `timeSavedMode`, `availableInMCP` (internos del UI). Sólo se mandan los 8 campos aceptados por la API: `saveExecutionProgress`, `saveManualExecutions`, `saveDataErrorExecution`, `saveDataSuccessExecution`, `executionTimeout`, `errorWorkflow`, `timezone`, `executionOrder`.

### Casos especiales que el script maneja

- **Workflow archivado en n8n** → lo saltea con warning (la API no permite actualizarlos), no rompe el sync.
- **`id` del JSON no existe en n8n** (workflow borrado) → hace POST para crear uno nuevo y loguea el nuevo id para que se actualice en el archivo.
- **`settings` con campos extra** → los filtra antes del PUT.

### Qué hacer si querés revertir cambios

El sync sobrescribe el server en cada PUT. Para volver a un estado anterior:

1. **Desde n8n UI**: abrir workflow → ⋮ → Workflow history → elegir versión → Restore. (n8n guarda historial internamente.)
2. **Desde git**: `git log -- workflows/<archivo>` → checkout al commit deseado → `npm run sync:n8n`.

### Configuración inicial (una vez)

1. En n8n: **Settings → n8n API → Create an API Key** → copiar.
2. Agregar a `.env.local`:
   ```
   N8N_BASE_URL=https://mia-n8n.w9weud.easypanel.host
   N8N_API_KEY=<la-key>
   ```
3. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**:
   - `N8N_BASE_URL` = la misma URL.
   - `N8N_API_KEY` = la misma key.

El Action se dispara automáticamente en push a `main` cuando cambian `workflows/**` o `scripts/sync-n8n.mjs`. También se puede correr manualmente desde **Actions → Sync n8n workflows → Run workflow**.

---

## 14. Notas operativas

- **Migraciones**: aplicar en orden los archivos de `supabase/migrations/`. Requiere habilitar `vector` (pgvector) antes de `20260413123000_ai_knowledge_chunks.sql`.
- **Toggle del agente**: `/api/agent-status` tiene fallback en memoria si Supabase no responde; el estado se pierde al reiniciar el server. En n8n, consultar `SELECT is_active FROM agent_status WHERE id = 1;` al inicio del workflow.
- **Scripts SQL sueltos (`SUPABASE_*.sql` en la raíz)**: son parches históricos (columnas agregadas, colores Kanban, etc.). Ejecutar manualmente si la BD no los tiene aún.
- **Workflow JSONs viejos en la raíz** (`Team ali - agente (7).json`, `Team ali - agente1.json`, `My workflow 2 (8).json`): exports históricos que quedaron por compatibilidad. Los vigentes viven en `workflows/` (ver §13).

---

## 15. Referencias internas

- **`CLAUDE.md`** — guía condensada de arquitectura para agentes de IA.
- **`AGENT.md`** — mapa exhaustivo de componentes, servicios, flujos y particularidades.
- **`AGENT_SETUP.md`** — setup paso a paso del toggle del agente.
- **`README.md`** — descripción corta original del proyecto.
- Los `*.md` restantes en la raíz son notas históricas de fixes/features (no vigentes como guía, útiles como contexto).
