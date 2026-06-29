import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Plantillas de documentos del asistente "modelos".
// Se guardan ENTERAS (sin chunking ni embeddings): el asistente las reproduce
// verbatim reemplazando los campos entre corchetes. Ver /api/ai-chat.

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

/** GET /api/ai-templates?assistantId=modelos → lista plantillas del asistente. */
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 503 });
  }

  const assistantId = request.nextUrl.searchParams.get('assistantId') || 'modelos';

  const { data, error } = await (supabase as any)
    .from('ai_templates')
    .select('id, name, content, created_at, updated_at')
    .eq('assistant_id', assistantId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('ai-templates GET:', error);
    return NextResponse.json(
      { error: 'No se pudieron listar las plantillas. ¿Corriste la migración ai_templates?' },
      { status: 500 }
    );
  }

  return NextResponse.json({ templates: data ?? [] });
}

/** POST /api/ai-templates  Body: { assistantId?, name, content } → crea una plantilla. */
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 503 });
  }

  let body: { assistantId?: string; name?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const assistantId =
    typeof body.assistantId === 'string' && body.assistantId.trim() ? body.assistantId.trim() : 'modelos';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';

  if (!name) return NextResponse.json({ error: 'El nombre es requerido.' }, { status: 400 });
  if (!content) return NextResponse.json({ error: 'El contenido no puede estar vacío.' }, { status: 400 });

  const { data, error } = await (supabase as any)
    .from('ai_templates')
    .insert({ assistant_id: assistantId, name, content })
    .select('id, name, content, created_at, updated_at')
    .single();

  if (error) {
    console.error('ai-templates POST:', error);
    return NextResponse.json({ error: 'No se pudo crear la plantilla.' }, { status: 500 });
  }

  return NextResponse.json({ template: data });
}

/** PUT /api/ai-templates  Body: { id, name, content } → edita una plantilla. */
export async function PUT(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 503 });
  }

  let body: { id?: string; name?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';

  if (!id) return NextResponse.json({ error: 'id es requerido.' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'El nombre es requerido.' }, { status: 400 });
  if (!content) return NextResponse.json({ error: 'El contenido no puede estar vacío.' }, { status: 400 });

  const { data, error } = await (supabase as any)
    .from('ai_templates')
    .update({ name, content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, content, created_at, updated_at')
    .single();

  if (error) {
    console.error('ai-templates PUT:', error);
    return NextResponse.json({ error: 'No se pudo actualizar la plantilla.' }, { status: 500 });
  }

  return NextResponse.json({ template: data });
}

/** DELETE /api/ai-templates?id=xxx → elimina una plantilla. */
export async function DELETE(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 503 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id es requerido.' }, { status: 400 });

  const { error } = await (supabase as any).from('ai_templates').delete().eq('id', id);

  if (error) {
    console.error('ai-templates DELETE:', error);
    return NextResponse.json({ error: 'No se pudo eliminar la plantilla.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
