-- Multi-asistente: aislar base de conocimiento por assistant_id (texto)

alter table public.ai_knowledge_chunks
  add column if not exists assistant_id text not null default 'tasador';

create index if not exists ai_knowledge_chunks_assistant_id_idx
  on public.ai_knowledge_chunks (assistant_id);

-- Actualizar función de matching para filtrar por assistant_id
create or replace function public.match_ai_knowledge_chunks(
  query_embedding vector(1536),
  match_count int default 8,
  match_assistant_id text default 'tasador'
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
  where c.assistant_id = match_assistant_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Permisos (dejar explícito para la nueva firma)
grant execute on function public.match_ai_knowledge_chunks(vector, int, text) to anon, authenticated;

