# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Next.js dev server (localhost:3000)
npm run build    # Production build
npm run start    # Run production build
npm run lint     # next lint
npm run sync:n8n # push workflows/*.json to n8n via REST API
```

There is no test runner configured. Both `package-lock.json` and `pnpm-lock.yaml` exist; `npm` is the documented tooling. TypeScript is `strict: true` with `noEmit: true` — type-check by running `npm run build` (there is no standalone `tsc` script).

## Required environment (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
CHATWOOT_URL
CHATWOOT_ACCOUNT_ID
CHATWOOT_API_TOKEN
OPENAI_API_KEY                 # used by /api/ai-chat and embeddings
OPENAI_EMBEDDING_MODEL         # optional, default text-embedding-3-small (1536 dims)
WHATSAPP_ACCESS_TOKEN          # Meta Cloud API (optional features)
WHATSAPP_PHONE_NUMBER_ID
REDIS_HOST / REDIS_PORT / REDIS_PASSWORD / REDIS_DB
N8N_BASE_URL                   # https://mia-n8n.w9weud.easypanel.host — for sync:n8n
N8N_API_KEY                    # generated in n8n Settings → n8n API
```

Services fail lazily: each service module instantiates its own Supabase client via a `getSupabase()` singleton that throws only on first use if env vars are missing. A missing env var will not break the build — it will throw at request time.

## Architecture (the parts you can't derive from reading one file)

### This is a Spanish-language real-estate CRM

All identifiers, UI copy, comments, enum values (`'frío' | 'tibio' | 'caliente' | 'llamada' | 'visita'`), and table/column names are in Spanish. Preserve Spanish when editing; don't translate existing names.

### Data flows through four external systems, not just Supabase

1. **Supabase (Postgres)** — canonical data: `leads`, `propiedades`, `documents` (pgvector), `kanban_columns`, `agent_status`, `pautas`, `cola_seguimientos`, `cola_seguimientos_dos`, `ai_conversations`, `ai_messages`, `ai_knowledge_chunks`, `propiedad_busquedas`.
2. **Chatwoot** — the source of truth for WhatsApp conversations. The app is a thin UI over Chatwoot's API; messages are *not* stored in Supabase. All chat routes (`/api/chats/**`, `/api/agents`) proxy Chatwoot.
3. **n8n** (`https://mia-n8n.w9weud.easypanel.host`) — owns lead qualification, follow-up sending, and Redis JID writes. The frontend calls n8n webhooks (`/webhook/agregar-jid`, `/webhook/eliminar-jid`); it does NOT talk to Redis directly. Any frontend "lead qualification" code is a fallback — n8n is authoritative.
4. **OpenAI** — `/api/ai-chat` implements RAG: embeds the user query with `text-embedding-3-small`, calls Supabase RPC `match_ai_knowledge_chunks` (pgvector), then sends context + history to chat completions.

### `estado` vs `estado_chat` are independent

`leads.estado` is the Kanban state (frío/tibio/caliente/custom). `leads.estado_chat` is a 0/1 flag for whether the chat is active. They are orthogonal — don't conflate them. `mapLeadRow` in `leadService.ts` defaults `estado_chat` to 1 unless it is explicitly 0/'0'.

### Kanban columns are user-configurable

`kanban_columns` stores `custom_columns`, `visible_columns`, and `column_colors` (jsonb). The `LeadStatus` type is `string` — any string can become a state. Do not hardcode the five base states as an exhaustive list when writing features that iterate over states; read from `columnService.ts`.

### Phone number normalization is load-bearing

The same contact appears as `+5492215735321`, `5492215735321`, `549221...@s.whatsapp.net`, or `WAID:549221...` across Chatwoot payloads. The convention is: strip to digits only, then compare the **last 10 digits**. See `extractNumericPhone()` and related helpers. When adding a lookup by phone, follow this pattern — do not string-equal raw values.

### Two-tier chat search

`ChatList.js` first searches already-loaded chats in memory. On miss, it POSTs to `/api/chats/search`, which paginates exhaustively through Chatwoot (Chatwoot ignores `per_page` and returns ~25 per page; the response shape is `data.data.payload`). Don't "optimize" the local search away — the server-side one is slow.

### Two property data sources coexist

- `propiedadesService.ts` → Supabase `propiedades` (canonical, CRUD).
- `documentService.ts` → Supabase `documents` (has `embedding`, used for semantic search / RAG).
- `propertyService.ts` → static `src/app/data/properties.json` (**legacy**, do not extend).

New property features should use `propiedadesService` unless you specifically need embeddings.

### Follow-up messages split across two tables

`cola_seguimientos` and `cola_seguimientos_dos` hold scheduled follow-ups. Messages move between tables based on the `plantilla` field (e.g. `toque_2_frio` → `cola_seguimientos_dos`). n8n executes the sends; the frontend only schedules.

### Campaign grouping uses fuzzy matching

`leadService.ts` normalizes `propiedad_interes` values (strips accents, common Spanish connective words, punctuation) and groups similar addresses with a similarity threshold of ~65%. If you add filters on `propiedad_interes`, filter against the *group*, not the raw value.

### n8n workflow is versioned in this repo

The main n8n workflow (`Team ali - agente`, id `ejW2YR1lNj3dYsGc`) is stored as a JSON export in `workflows/` and synced to the remote n8n instance via `scripts/sync-n8n.mjs`. Two ways to update it:

- **`npm run sync:n8n`** — pushes local `workflows/*.json` to n8n immediately (~2s). Use this when editing the JSON locally or from Claude Code. No commit needed.
- **`git push` to `main`** — `.github/workflows/sync-n8n.yml` runs the script in CI when `workflows/**` or `scripts/sync-n8n.mjs` changes.

The script strips fields n8n rejects on `PUT` (`id`, `active`, `tags`, `pinData`, `versionId`, `meta`, `triggerCount`, `shared`, and UI-internal keys inside `settings` like `binaryMode`, `callerPolicy`, `timeSavedMode`, `availableInMCP`). It never touches the `active` state — toggle that from the UI. Archived workflows are skipped with a warning. To revert a bad sync, use n8n's UI **Workflow history → Restore**, then re-export and replace the JSON. Full details in `DOCUMENTATION.md` §13.

### RLS is open

All migrations create `FOR ALL USING (true) WITH CHECK (true)` policies — this is intentional for a single-tenant internal CRM using the anon key. Do not add user-scoped policies without coordinating a real auth layer.

## Conventions

- **Path alias**: `@/*` → `./src/*` (e.g. `@/components/ui/button`, `@/lib/utils`).
- **Component locations**: shadcn/ui primitives in `src/components/ui/`; app-specific components in `src/app/components/`.
- **File extensions**: `.tsx`/`.ts` for typed code; some chat-related hooks and API routes are `.js` (legacy, not worth migrating piecemeal).
- **Supabase typing**: no generated `database.types.ts`. Queries use `(supabase as any)` casts — this is deliberate, not a bug to fix.
- **Per-module Supabase client**: each service file owns its own `getSupabase()` singleton rather than importing from `lib/supabase.ts`. Match this pattern in new services.

## Repo hygiene

The root contains many `*.md` files (`CHAT_PHONE_NUMBER_DEBUG.md`, `DRAG_DROP_FIX.md`, etc.) and `SUPABASE_*.sql` scripts. These are historical notes and one-off migration scripts — not part of the build. Real migrations live in `supabase/migrations/`. Large JSON files at the root (`Team ali - agente*.json`, `My workflow 2 (8).json`) are n8n workflow exports, not code.

For a deeper map of components, services, and flows, see `AGENT.md`.
