import { NextRequest, NextResponse } from 'next/server';
import { requireCrmSession } from '@/lib/requireCrmSession';
import { getSupabase } from '@/lib/rueda/supabase';
import { transicionarEstado } from '@/lib/rueda/transicionEstado';

/**
 * PATCH /api/rueda/matches/[id] { estado?, notas?, via?: 'apertura' | 'restaurar' }
 * - estado (acción del usuario): lo setea y marca estado_origen='usuario'.
 * - via 'apertura': solo nuevo -> revisado, conserva estado_origen.
 * - via 'restaurar': descartado -> revisado con estado_origen='usuario'.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const noAuth = await requireCrmSession(request);
  if (noAuth) return noAuth;

  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'id inválido' }, { status: 400 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const { data: actual, error } = await supabase
      .from('rueda_matches').select('id, estado, estado_origen').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!actual) return NextResponse.json({ error: 'Match no encontrado' }, { status: 404 });

    const r = transicionarEstado(actual, { estado: body?.estado, notas: body?.notas, via: body?.via });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });

    const cambios: Record<string, unknown> = { ...r.cambios };
    if (r.cambios.estado !== undefined && r.cambios.estado !== actual.estado) {
      cambios.estado_updated_at = new Date().toISOString();
    }
    if (Object.keys(cambios).length === 0) {
      const { data } = await supabase.from('rueda_matches').select('*').eq('id', id).single();
      return NextResponse.json({ match: data });
    }

    const { data, error: updError } = await supabase
      .from('rueda_matches').update(cambios).eq('id', id).select('*').single();
    if (updError) throw new Error(updError.message);
    return NextResponse.json({ match: data });
  } catch (err: any) {
    console.error('rueda/matches PATCH:', err);
    return NextResponse.json({ error: err?.message || 'Error inesperado' }, { status: 500 });
  }
}
