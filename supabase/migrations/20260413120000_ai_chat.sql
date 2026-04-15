-- Asistente IA: conversaciones y mensajes (ejecutar en Supabase SQL Editor si no usas migraciones CLI)

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Nueva conversación',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_messages_conversation_id_created_at_idx
  ON public.ai_messages (conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS ai_conversations_updated_at_idx
  ON public.ai_conversations (updated_at DESC);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- CRM interno con anon key: políticas abiertas (ajusta cuando tengas auth por usuario)
DROP POLICY IF EXISTS "ai_conversations_all" ON public.ai_conversations;
CREATE POLICY "ai_conversations_all" ON public.ai_conversations
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ai_messages_all" ON public.ai_messages;
CREATE POLICY "ai_messages_all" ON public.ai_messages
  FOR ALL USING (true) WITH CHECK (true);
