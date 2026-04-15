import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `Eres un asistente de IA integrado en un CRM inmobiliario (Team Ali). 
Respondes en el mismo idioma que el usuario (por defecto español).
Sé conciso y útil: listas cuando ayuden, sin relleno.
Si no sabes algo sobre datos concretos del negocio que no te fueron dados, dilo con honestidad.`;

const MAX_CONTEXT_MESSAGES = 40;
const TITLE_MAX = 72;
const KNOWLEDGE_MATCH_COUNT = 10;
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dims

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

async function getKnowledgeContext(openai: OpenAI, supabase: any, query: string, assistantId: string) {
  const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  const matchCount = Number(process.env.AI_KNOWLEDGE_MATCH_COUNT || KNOWLEDGE_MATCH_COUNT);

  const emb = await openai.embeddings.create({
    model: embeddingModel,
    input: query,
  });

  const queryEmbedding = emb.data[0]?.embedding;
  if (!queryEmbedding) return { context: '', used: [] as { id: string; similarity: number }[] };

  // RPC a la función SQL match_ai_knowledge_chunks (pgvector)
  const { data, error } = await (supabase as any).rpc('match_ai_knowledge_chunks', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    match_assistant_id: assistantId,
  });

  if (error || !Array.isArray(data)) {
    if (error) console.warn('ai-chat knowledge rpc error:', error);
    return { context: '', used: [] as { id: string; similarity: number }[] };
  }

  const used = data
    .map((row: any) => ({
      id: String(row.id),
      similarity: typeof row.similarity === 'number' ? row.similarity : Number(row.similarity),
      content: String(row.content ?? ''),
    }))
    .filter((r: any) => r.content);

  if (used.length === 0) return { context: '', used: [] as { id: string; similarity: number }[] };

  const context = used
    .map((r: any, i: number) => `Fuente ${i + 1} (chunk_id=${r.id}, sim=${Number(r.similarity).toFixed(3)}):\n${r.content}`)
    .join('\n\n---\n\n');

  return { context, used: used.map(({ id, similarity }: any) => ({ id, similarity })) };
}

/** GET: lista conversaciones, o mensajes si ?conversationId= */
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase no está configurado.' },
      { status: 503 }
    );
  }

  const conversationId = request.nextUrl.searchParams.get('conversationId');

  try {
    if (conversationId) {
      const { data: messages, error } = await supabase
        .from('ai_messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('ai-chat GET messages:', error);
        return NextResponse.json(
          { error: 'No se pudieron cargar los mensajes. ¿Ejecutaste el SQL de ai_chat en Supabase?' },
          { status: 500 }
        );
      }

      return NextResponse.json({ messages: messages ?? [] });
    }

    const { data: conversations, error } = await supabase
      .from('ai_conversations')
      .select('id, title, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('ai-chat GET conversations:', error);
      return NextResponse.json(
        { error: 'No se pudieron cargar las conversaciones.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversations: conversations ?? [] });
  } catch (e) {
    console.error('ai-chat GET:', e);
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 });
  }
}

/** POST: envía mensaje del usuario y devuelve respuesta del asistente (persistido en Supabase). */
export async function POST(request: NextRequest) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json(
      { error: 'Falta OPENAI_API_KEY en el entorno del servidor.' },
      { status: 503 }
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase no está configurado.' },
      { status: 503 }
    );
  }

  let body: { conversationId?: string | null; content?: string; assistantId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) {
    return NextResponse.json({ error: 'El mensaje no puede estar vacío.' }, { status: 400 });
  }

  const assistantId = typeof body.assistantId === 'string' && body.assistantId.trim().length > 0 ? body.assistantId.trim() : 'tasador';

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  let conversationId =
    typeof body.conversationId === 'string' && body.conversationId.length > 0
      ? body.conversationId
      : null;

  try {
    if (!conversationId) {
      const title =
        content.length > TITLE_MAX ? `${content.slice(0, TITLE_MAX)}…` : content;
      const { data: conv, error: convErr } = await supabase
        .from('ai_conversations')
        .insert({ title })
        .select('id')
        .single();

      if (convErr || !conv) {
        console.error('ai-chat create conversation:', convErr);
        return NextResponse.json(
          { error: 'No se pudo crear la conversación.' },
          { status: 500 }
        );
      }
      conversationId = conv.id as string;
    } else {
      const { data: existing, error: existErr } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('id', conversationId)
        .maybeSingle();

      if (existErr || !existing) {
        return NextResponse.json(
          { error: 'Conversación no encontrada.' },
          { status: 404 }
        );
      }
    }

    const { error: userMsgErr } = await supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content,
    });

    if (userMsgErr) {
      console.error('ai-chat insert user:', userMsgErr);
      return NextResponse.json(
        { error: 'No se pudo guardar el mensaje.' },
        { status: 500 }
      );
    }

    const { data: rows, error: histErr } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(MAX_CONTEXT_MESSAGES);

    if (histErr || !rows) {
      console.error('ai-chat history:', histErr);
      return NextResponse.json(
        { error: 'No se pudo leer el historial.' },
        { status: 500 }
      );
    }

    const tail = rows.slice(-MAX_CONTEXT_MESSAGES);

    // RAG: buscar contexto relevante desde ai_knowledge_chunks (si existe)
    let knowledgeContext = '';
    try {
      const k = await getKnowledgeContext(openai, supabase, content, assistantId);
      knowledgeContext = k.context;
    } catch (e) {
      console.warn('ai-chat knowledge lookup failed:', e);
    }

    const ragInstruction = knowledgeContext
      ? `\n\nIMPORTANTE: Tenés acceso a \"Fuentes internas\" (texto de la empresa) debajo. Para cotizar o afirmar datos del negocio, basate en esas fuentes. Si la pregunta requiere datos que no aparecen en las fuentes, pedí la info faltante antes de cotizar. No inventes números.\n\nFuentes internas:\n${knowledgeContext}`
      : `\n\nNota: No hay \"Fuentes internas\" cargadas todavía (ai_knowledge_chunks). Si el usuario pide una cotización que requiera datos propios del negocio, pedí los datos necesarios o explicá qué falta.`;

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: `${SYSTEM_PROMPT}${ragInstruction}` },
      ...tail
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
    ];

    const completion = await openai.chat.completions.create({
      model,
      messages: openaiMessages,
      temperature: 0.7,
    });

    const assistantText = completion.choices[0]?.message?.content?.trim() || '';
    if (!assistantText) {
      return NextResponse.json(
        { error: 'El modelo no devolvió texto.' },
        { status: 502 }
      );
    }

    const { data: assistantRow, error: asstErr } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantText,
      })
      .select('id, role, content, created_at')
      .single();

    if (asstErr || !assistantRow) {
      console.error('ai-chat insert assistant:', asstErr);
      return NextResponse.json(
        { error: 'No se pudo guardar la respuesta del asistente.' },
        { status: 500 }
      );
    }

    await supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return NextResponse.json({
      conversationId,
      message: assistantRow,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    console.error('ai-chat POST:', e);
    if (msg.includes('429')) {
      return NextResponse.json(
        { error: 'Límite de uso de OpenAI alcanzado. Intenta más tarde.' },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
