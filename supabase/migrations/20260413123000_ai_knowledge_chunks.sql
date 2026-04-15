-- Conocimiento del asistente (solo chunks) + búsqueda semántica (pgvector)
-- Nota: requiere habilitar la extensión vector (pgvector) en Supabase.

create extension if not exists vector;

create table if not exists public.ai_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_knowledge_chunks_created_at_idx
  on public.ai_knowledge_chunks (created_at desc);

-- Índice para similitud (cosine). Requiere pgvector.
create index if not exists ai_knowledge_chunks_embedding_idx
  on public.ai_knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Función de matching: devuelve chunks más relevantes por similitud.
create or replace function public.match_ai_knowledge_chunks(
  query_embedding vector(1536),
  match_count int default 8
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.ai_knowledge_chunks c
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.ai_knowledge_chunks enable row level security;

drop policy if exists "ai_knowledge_chunks_all" on public.ai_knowledge_chunks;
create policy "ai_knowledge_chunks_all" on public.ai_knowledge_chunks
  for all using (true) with check (true);

-- Permisos para PostgREST (supabase-js con anon key)
grant select, insert, update, delete on table public.ai_knowledge_chunks to anon, authenticated;
grant execute on function public.match_ai_knowledge_chunks(vector, int) to anon, authenticated;

