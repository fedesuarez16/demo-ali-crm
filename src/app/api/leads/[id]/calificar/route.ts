import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getChatwoot, findConversationId, digits } from '@/lib/chatwootServer';

// Botón "calificación automática" del sidebar del lead.
// activar = true  → marca leads.calificacion_auto y califica YA con el workflow de n8n
//                   "Team ali - calificador" (webhook calificar-lead), aunque esté en una
//                   columna humana. Desde ahí el calificador lo vuelve a evaluar en cada mensaje.
// activar = false → solo apaga la marca: el lead vuelve a quedar bloqueado si está en una columna humana.

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Faltan variables de entorno de Supabase.' }, { status: 500 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const activar = body?.activar !== false;

  const { data: lead, error } = await (supabase as any).from('leads').select('id, whatsapp_id').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });

  if (!activar) {
    const { error: updError } = await (supabase as any).from('leads').update({ calificacion_auto: false }).eq('id', id);
    if (updError) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
    return NextResponse.json({ status: 'desactivado' });
  }

  const cw = getChatwoot();
  const n8nBase = process.env.N8N_BASE_URL;
  const token = process.env.N8N_CALIFICADOR_TOKEN;
  if (!cw || !n8nBase || !token) {
    return NextResponse.json({ error: 'Faltan variables de entorno (Chatwoot, N8N_BASE_URL o N8N_CALIFICADOR_TOKEN).' }, { status: 500 });
  }

  try {
    const { error: updError } = await (supabase as any).from('leads').update({ calificacion_auto: true }).eq('id', id);
    if (updError) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });

    const phone = digits(lead.whatsapp_id);
    if (phone.length < 10) return NextResponse.json({ status: 'sin_telefono' });

    const conversationId = await findConversationId(cw, phone);
    if (!conversationId) return NextResponse.json({ status: 'sin_conversacion' });

    const res = await fetch(`${n8nBase.replace(/\/$/, '')}/webhook/calificar-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-calificador-token': token },
      body: JSON.stringify({ whatsapp_id: phone, conversation_id: conversationId }),
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) {
      console.error('calificar: n8n respondió', res.status, await res.text().catch(() => ''));
      return NextResponse.json({ error: `El calificador respondió ${res.status}` }, { status: 502 });
    }

    // [fila de lead_calificaciones], o [] si la conversación no tiene mensajes.
    const filas = await res.json().catch(() => []);
    const resultado = Array.isArray(filas) ? filas[0] : filas;
    if (!resultado?.id) return NextResponse.json({ status: 'sin_mensajes', conversationId });

    return NextResponse.json({ status: 'calificado', conversationId, resultado });
  } catch (err: any) {
    console.error('calificar: error', err);
    return NextResponse.json({ error: err?.message || 'Error inesperado' }, { status: 500 });
  }
}
