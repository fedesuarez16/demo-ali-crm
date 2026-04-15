import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dims

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function chunkText(input: string, opts?: { chunkSize?: number; overlap?: number }) {
  const chunkSize = opts?.chunkSize ?? 1000;
  const overlap = opts?.overlap ?? 200;
  const text = input.replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize);
    const slice = text.slice(start, end).trim();
    if (slice) chunks.push(slice);
    if (end >= text.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 503 });
  }

  const assistantId = request.nextUrl.searchParams.get('assistantId');

  let q = supabase.from('ai_knowledge_chunks').select('id', { count: 'exact', head: true });
  if (assistantId) q = q.eq('assistant_id', assistantId);

  const { count, error } = await q;

  if (error) {
    return NextResponse.json(
      { error: 'No se pudo leer ai_knowledge_chunks. ¿Ejecutaste la migración de conocimiento?' },
      { status: 500 }
    );
  }

  return NextResponse.json({ chunksCount: count ?? 0 });
}

/**
 * POST /api/ai-knowledge
 * Body: { text: string, assistantId: string, chunkSize?: number, overlap?: number }
 * Inserta chunks con embeddings en ai_knowledge_chunks.
 */
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
    return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 503 });
  }

  let body: { text?: string; assistantId?: string; chunkSize?: number; overlap?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'El campo text no puede estar vacío.' }, { status: 400 });
  }

  const assistantId = typeof body.assistantId === 'string' ? body.assistantId.trim() : '';
  if (!assistantId) {
    return NextResponse.json({ error: 'El campo assistantId es requerido.' }, { status: 400 });
  }

  const chunks = chunkText(text, { chunkSize: body.chunkSize, overlap: body.overlap });
  if (chunks.length === 0) {
    return NextResponse.json({ error: 'No se pudieron generar chunks.' }, { status: 400 });
  }

  const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;

  try {
    // Embeddings por batch (OpenAI soporta array de strings).
    const emb = await openai.embeddings.create({
      model: embeddingModel,
      input: chunks,
    });

    const rows = chunks.map((content, i) => ({
      content,
      // pgvector via PostgREST acepta array numérico como vector
      embedding: emb.data[i]?.embedding,
      assistant_id: assistantId,
    }));

    const { error } = await supabase.from('ai_knowledge_chunks').insert(rows);
    if (error) {
      console.error('ai-knowledge insert:', error);
      return NextResponse.json(
        { error: 'No se pudo guardar el conocimiento. ¿Está creada la tabla ai_knowledge_chunks?' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, inserted: rows.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    console.error('ai-knowledge POST:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

