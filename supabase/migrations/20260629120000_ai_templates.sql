-- Plantillas de documentos del asistente "modelos".
-- A diferencia de ai_knowledge_chunks (RAG/embeddings), acá el texto se guarda
-- ENTERO y se inyecta verbatim en el prompt: es para reproducir documentos
-- legales palabra por palabra, no para búsqueda semántica.

create table if not exists public.ai_templates (
  id uuid primary key default gen_random_uuid(),
  assistant_id text not null default 'modelos',
  name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_templates_assistant_id_idx
  on public.ai_templates (assistant_id);

create index if not exists ai_templates_updated_at_idx
  on public.ai_templates (updated_at desc);

alter table public.ai_templates enable row level security;

drop policy if exists "ai_templates_all" on public.ai_templates;
create policy "ai_templates_all" on public.ai_templates
  for all using (true) with check (true);

grant select, insert, update, delete on table public.ai_templates to anon, authenticated;
