# AGENT.md — CRM Inmobiliaria

## Descripción General

CRM inmobiliario construido con **Next.js 15** (App Router), **TypeScript**, **Tailwind CSS** y **Supabase** como backend. Integra **Chatwoot** para gestión de conversaciones WhatsApp y **n8n** para automatizaciones/webhooks. La UI usa componentes **shadcn/ui** (Radix UI) + **Lucide React** para iconos.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15.3.6 (App Router, `src/app/`) |
| Lenguaje | TypeScript + JavaScript (archivos `.js` para chat/hooks) |
| Estilos | Tailwind CSS 3.4 + tailwindcss-animate |
| UI Components | shadcn/ui (Radix UI), Lucide React, Heroicons |
| Base de datos | Supabase (PostgreSQL) |
| Chat | Chatwoot API (WhatsApp) |
| Automatización | n8n (webhooks) |
| Drag & Drop | react-beautiful-dnd |
| Gráficos | Recharts |

---

## Variables de Entorno Requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Chatwoot
CHATWOOT_URL=              # ej: https://chatwoot.goflip.lat
CHATWOOT_ACCOUNT_ID=       # ej: 2
CHATWOOT_API_TOKEN=        # Token de acceso API
```

---

## Estructura del Proyecto

```
src/
├── app/
│   ├── page.tsx                    # Dashboard principal (estadísticas de leads)
│   ├── layout.tsx                  # Root layout (Inter font, metadata CRM)
│   ├── globals.css                 # Tailwind + CSS variables shadcn
│   │
│   ├── api/                        # API Routes (Next.js Route Handlers)
│   │   ├── agent-status/route.ts   # GET/POST estado del agente IA (tabla agent_status)
│   │   ├── agents/route.js         # GET agentes de Chatwoot
│   │   ├── chats/
│   │   │   ├── route.js            # GET conversaciones de Chatwoot (paginadas, filtradas)
│   │   │   ├── search/route.js     # POST búsqueda exhaustiva de chat por teléfono
│   │   │   └── [id]/messages/      # GET/POST mensajes de una conversación
│   │   │       ├── route.js
│   │   │       └── [messageId]/    # Attachments de mensajes
│   │   ├── pautas/route.ts         # CRUD pautas (instrucciones para el agente IA)
│   │   └── redis-jids/route.ts     # Gestión de JIDs en Redis vía n8n webhooks
│   │
│   ├── components/                 # Componentes de la app
│   │   ├── AppLayout.tsx           # Layout con Sidebar
│   │   ├── Sidebar.tsx             # Navegación lateral colapsable
│   │   ├── AgentStatusToggle.tsx   # Toggle activar/desactivar agente IA
│   │   ├── ChatList.js             # Lista de chats WhatsApp (con búsqueda server-side)
│   │   ├── ChatConversation.js     # Vista de conversación individual
│   │   ├── WhatsAppView.js         # Orquestador ChatList + ChatConversation
│   │   ├── LeadDetailSidebar.tsx   # Sidebar detalle de lead (perfil, acciones)
│   │   ├── LeadEditSidebar.tsx     # Sidebar edición de lead
│   │   ├── LeadFilter.tsx          # Filtros para leads
│   │   ├── LeadTable.tsx           # Tabla de leads
│   │   ├── LeadCards.tsx           # Cards de leads (Kanban)
│   │   ├── PropiedadCards.tsx      # Cards de propiedades (Kanban)
│   │   ├── PropiedadEditSidebar.tsx # Sidebar edición de propiedad
│   │   ├── PropertyDocFilter.tsx   # Filtros para documentos/propiedades
│   │   ├── DocumentCards.tsx       # Cards de documentos
│   │   ├── RedisJidManager.tsx     # Gestión visual de JIDs en Redis
│   │   └── automation/             # Componentes del editor de automatizaciones
│   │       ├── WorkflowEditor.tsx
│   │       ├── Node.tsx
│   │       ├── NodePanel.tsx
│   │       ├── NodeProperties.tsx
│   │       └── Connection.tsx
│   │
│   ├── services/                   # Lógica de negocio y acceso a datos
│   │   ├── leadService.ts          # CRUD leads + filtrado + calificación automática
│   │   ├── propiedadesService.ts   # CRUD propiedades (tabla "propiedades")
│   │   ├── documentService.ts      # Lectura documentos (tabla "documents")
│   │   ├── propertyService.ts      # Propiedades estáticas (JSON local, legacy)
│   │   ├── columnService.ts        # Columnas Kanban personalizables (tabla "kanban_columns")
│   │   ├── mensajeService.ts       # Seguimientos y mensajes programados
│   │   ├── matchingService.ts      # Matching leads ↔ propiedades
│   │   └── automationService.ts    # Workflows de automatización (datos de ejemplo)
│   │
│   ├── types/index.ts              # Todas las interfaces TypeScript
│   ├── utils/exportUtils.ts        # Exportación a CSV
│   ├── data/                       # Datos estáticos JSON (legacy)
│   │   ├── leads.json
│   │   └── properties.json
│   │
│   ├── leads/
│   │   ├── page.tsx                # Vista Kanban de leads
│   │   └── tabla/page.tsx          # Vista tabla de leads
│   ├── chat/page.tsx               # Vista de chats WhatsApp
│   ├── propiedades/
│   │   ├── page.tsx                # Kanban de propiedades
│   │   ├── nueva/page.tsx          # Crear propiedad
│   │   └── [id]/editar/page.tsx    # Editar propiedad
│   ├── campanas-activas/page.tsx   # Campañas activas (propiedad_interes)
│   ├── mensajes-programados/page.tsx # Cola de seguimientos
│   ├── dashboard/page.tsx          # Dashboard con gráficos
│   ├── redis-manager/page.tsx      # Gestión de Redis JIDs
│   └── automatizaciones/           # Editor visual de automatizaciones
│       ├── page.tsx
│       ├── nueva/page.tsx
│       └── [id]/page.tsx
│
├── components/ui/                  # Componentes shadcn/ui
│   ├── button.tsx, input.tsx, label.tsx, select.tsx
│   ├── card.tsx, badge.tsx, skeleton.tsx
│   ├── sheet.tsx, separator.tsx, tooltip.tsx
│   ├── scroll-area.tsx, sidebar.tsx, breadcrumb.tsx
│   └── chart.tsx, chart-area-interactive.tsx
│
├── hooks/                          # Custom hooks
│   ├── useChats.js                 # Fetch y paginación de chats Chatwoot
│   ├── useChatMessages.js          # Mensajes de una conversación
│   ├── useChatStatus.js            # Estado de chat por teléfono
│   ├── useAgents.js                # Agentes de Chatwoot
│   └── use-mobile.tsx              # Detección de mobile
│
└── lib/
    ├── supabase.ts                 # Cliente Supabase singleton
    └── utils.ts                    # Utilidad cn() para clases
```

---

## Tablas de Supabase

### `leads`
Tabla principal de leads/contactos. Campos clave:
- `id` (serial PK)
- `whatsapp_id` (text, UNIQUE) — número de teléfono
- `nombre` (text)
- `estado` (text) — `'frío'`, `'tibio'`, `'caliente'`, `'llamada'`, `'visita'` u otros personalizados
- `presupuesto`, `zona`, `tipo_propiedad`, `forma_pago`, `intencion`
- `caracteristicas_buscadas`, `caracteristicas_venta`
- `propiedades_mostradas`, `propiedad_interes` — campaña/propiedad asociada
- `seguimientos_count` (int), `notas` (text)
- `estado_chat` (int) — 1=activo, 0=inactivo (independiente del estado del lead)
- `chatwoot_conversation_id` (int) — ID de conversación en Chatwoot
- `created_at`, `updated_at`, `ultima_interaccion`

**Nota:** `getAllLeads()` trae los últimos 1000 leads ordenados por `created_at DESC`.

### `propiedades`
Propiedades inmobiliarias. Campos:
- `id`, `tipo_de_propiedad`, `direccion`, `zona`, `valor`
- `dormitorios`, `banos`, `patio_parque`, `garage`, `mts_const`, `lote`, `piso`
- `link`, `columna_1`, `apto_banco`, `notas`
- `alternativa_menor_1..5`, `alternativa_mayor..5` — propiedades alternativas

### `documents`
Tabla de documentos de propiedades (con embeddings para búsqueda semántica):
- Mismos campos que propiedades + `embedding` (vector), `metadata` (jsonb), `content`, `descripcion`

### `kanban_columns`
Configuración de columnas del Kanban:
- `custom_columns` (text[]), `visible_columns` (text[])
- `column_colors` (jsonb) — mapeo columna → color hex

### `agent_status`
Estado del agente IA (una sola fila, id=1):
- `is_active` (boolean)

### `pautas`
Instrucciones/pautas para el agente IA:
- `id`, `texto` (text), `created_at`

### `cola_seguimientos` / `cola_seguimientos_dos`
Colas de mensajes de seguimiento programados:
- `remote_jid`, `session_id`, `mensaje`, `fecha_programada`
- `estado` (`'pendiente'`, `'enviado'`)
- `tipo_lead`, `seguimientos_count`, `chatwoot_conversation_id`
- `plantilla` — nombre de plantilla de toque (ej: `'toque_1_frio'`, `'toque_2_tibio'`)

---

## Flujos de Datos Clave

### Leads
1. **Fetch**: `leadService.getAllLeads()` → Supabase `leads` table → `mapLeadRow()` normaliza campos
2. **Estados**: Los estados se normalizan (`'Fríos'` → `'frío'`). Estados inválidos (`'activo'`, `'inicial'`) se corrigen a `'frío'`
3. **Calificación automática**: Basada en cantidad de mensajes en Chatwoot (`calificarLead()`):
   - ≤2 mensajes → `'frío'`
   - 3-15 mensajes → `'tibio'`
   - >15 mensajes → `'caliente'`
   - **Nota**: La calificación principal se maneja desde n8n, no desde el frontend
4. **Campañas**: `propiedad_interes` agrupa leads por campaña. Se agrupan campañas similares con `stringSimilarity()` (threshold 65%)
5. **Kanban**: Columnas personalizables vía `columnService.ts`, persistidas en tabla `kanban_columns`

### Chat (WhatsApp vía Chatwoot)
1. **Lista de chats**: `useChats` hook → `/api/chats` → Chatwoot API conversations
2. **Filtrado WhatsApp**: Se enriquecen conversaciones extrayendo teléfonos de múltiples fuentes:
   - `meta.sender.phone_number` / `meta.sender.identifier`
   - `last_non_activity_message.sender.identifier` (contiene `@s.whatsapp.net`)
   - `last_non_activity_message.source_id` (prefijo `WAID:`)
   - `additional_attributes.wa_id`
3. **Búsqueda de chat por teléfono**: `ChatList.js` primero busca en chats locales, si no encuentra hace POST a `/api/chats/search` que pagina exhaustivamente por Chatwoot
4. **Normalización de teléfonos**: Se extraen solo dígitos, se comparan últimos 10 dígitos para manejar variaciones de formato (+54, 549, etc.)
5. **Respuesta de Chatwoot**: La estructura es `data.data.payload` (array de conversaciones). Chatwoot ignora `per_page` y devuelve ~25 por página

### Propiedades
1. **Dos fuentes**: 
   - `propiedadesService.ts` → tabla `propiedades` de Supabase (CRUD completo)
   - `documentService.ts` → tabla `documents` de Supabase (solo lectura, con embeddings)
   - `propertyService.ts` → datos estáticos de `properties.json` (legacy)
2. **Kanban de propiedades**: Agrupadas por `zona`

### Seguimientos
1. **Programación**: `mensajeService.programarSeguimiento()` crea/actualiza en `cola_seguimientos`
2. **Plantillas de toque**: `toque_X_frio` (seguimientos_count = X), `toque_X_tibio` (seguimientos_count = X+8)
3. **Dos tablas**: `cola_seguimientos` y `cola_seguimientos_dos` — mensajes se mueven entre tablas según la plantilla (`toque_2_frio` → `cola_seguimientos_dos`)
4. **Ejecución**: Los mensajes son enviados por n8n, no por el frontend

---

## Navegación (Sidebar)

| Sección | Ruta | Descripción |
|---|---|---|
| Dashboard | `/dashboard` | Gráficos y estadísticas |
| Leads (Kanban) | `/leads` | Tablero Kanban drag & drop |
| Leads (Tabla) | `/leads/tabla` | Vista tabla con filtros y búsqueda |
| Chats | `/chat` | WhatsApp vía Chatwoot |
| Propiedades | `/propiedades` | Kanban de propiedades |
| Campañas activas | `/campanas-activas` | Leads agrupados por campaña |
| Mensajes Programados | `/mensajes-programados` | Cola de seguimientos |
| Gestión Redis | `/redis-manager` | JIDs de WhatsApp en Redis |

---

## Patrones y Convenciones

### Servicios
- Cada servicio crea su propio cliente Supabase con `getSupabase()` (singleton por módulo)
- Los servicios usan `(getSupabase() as any)` para evitar problemas de tipado sin tipos generados
- Cache en memoria (`cachedLeads`, `cachedDocuments`) para filtrado client-side

### Componentes
- Archivos `.tsx` para componentes TypeScript, `.js` para componentes de chat (legacy)
- Sidebars de detalle/edición como componentes separados (ej: `LeadDetailSidebar`, `LeadEditSidebar`)
- UI components de shadcn/ui en `src/components/ui/`
- Componentes de la app en `src/app/components/`

### API Routes
- Archivos `.ts` para rutas tipadas, `.js` para rutas de chat
- Todas las rutas de Chatwoot validan `CHATWOOT_URL`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_API_TOKEN`
- Normalización de teléfonos: `extractNumericPhone()` — quita `@s.whatsapp.net`, `WAID:`, `+`, deja solo dígitos

### Imports
- Path alias: `@/*` → `./src/*` (configurado en tsconfig.json)
- Ejemplo: `import { supabase } from '@/lib/supabase'`
- Componentes UI: `import { Button } from '@/components/ui/button'`

---

## Integraciones Externas

### Chatwoot
- **URL base**: Variable `CHATWOOT_URL` (ej: `https://chatwoot.goflip.lat`)
- **Endpoints usados**:
  - `GET /api/v1/accounts/{id}/conversations` — listar conversaciones
  - `GET /api/v1/accounts/{id}/conversations/{id}/messages` — mensajes
  - `POST /api/v1/accounts/{id}/conversations/{id}/messages` — enviar mensaje
  - `GET /api/v1/accounts/{id}/agents` — listar agentes
- **Autenticación**: Header `api_access_token`
- **Particularidades**: 
  - Ignora `per_page`, siempre devuelve ~25 por página
  - Estructura de respuesta: `{ data: { payload: [...conversations], meta: {...} } }`
  - No tiene campo `contact` directo en conversaciones; info de contacto está en `meta.sender`

### n8n
- **URL base**: `https://mia-n8n.w9weud.easypanel.host`
- **Webhooks**:
  - `POST /webhook/agregar-jid` — agregar JID a Redis
  - `POST /webhook/eliminar-jid` — eliminar JID de Redis
- **Funciones**: Calificación automática de leads, envío de seguimientos, gestión de Redis

---

## Comandos

```bash
npm run dev    # Servidor de desarrollo
npm run build  # Build de producción
npm run start  # Servidor de producción
npm run lint   # Linter
```

---

## Notas Importantes para el Modelo

1. **Idioma**: Todo el código, comentarios, UI y nombres de variables están en **español**
2. **Supabase sin tipos generados**: No hay `database.types.ts`. Se usa `as any` para queries
3. **Dos sistemas de propiedades**: `propiedadesService` (Supabase, activo) vs `propertyService` (JSON, legacy)
4. **Teléfonos**: Múltiples formatos coexisten (`+5492215735321`, `5492215735321`, `549221...@s.whatsapp.net`). Siempre normalizar a solo dígitos para comparar
5. **Estados de leads**: Los 5 estados base son `frío`, `tibio`, `caliente`, `llamada`, `visita`. Se permiten estados personalizados via `kanban_columns`
6. **Chat search**: La búsqueda de chat por teléfono tiene dos niveles: local (chats ya cargados) y server-side (`/api/chats/search` que pagina por toda la API de Chatwoot)
7. **Archivos .md en raíz**: Son documentación de features/fixes anteriores. NO son parte del código
8. **SQL files en raíz**: Scripts SQL para crear/modificar tablas en Supabase
