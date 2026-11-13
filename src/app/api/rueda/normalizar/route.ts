import { NextRequest, NextResponse } from 'next/server';
import { requireCrmSession } from '@/lib/requireCrmSession';
import { loadConfig } from '@/lib/rueda/config';
import { normalizarFilas } from '@/lib/rueda/normalizador';
import { getSupabase } from '@/lib/rueda/supabase';

export const maxDuration = 60;

/**
 * POST /api/rueda/normalizar { tabla: 'propiedad'|'busqueda', ids?: number[], force?: boolean }
 * -> { normalizados, omitidos, fallidos, stale_restantes, detalle }
 * Cache hit (hash igual y fuente llm) no llama al LLM salvo force. Sin ids: todas las filas de la tabla
 * (el tope de 25 llamadas LLM por request deja el resto con parser; reintentar para completar).
 */
export async function POST(request: NextRequest) {
  const noAuth = await requireCrmSession(request);
  if (noAuth) return noAuth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const tabla = body?.tabla;
  if (tabla !== 'propiedad' && tabla !== 'busqueda') {
    return NextResponse.json({ error: "tabla debe ser 'propiedad' o 'busqueda'" }, { status: 400 });
  }
  const ids: number[] | null = Array.isArray(body?.ids)
    ? [...new Set<number>(body.ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0))]
    : null;

  try {
    const supabase = getSupabase();
    const nombreTabla = tabla === 'propiedad' ? 'propiedades' : 'propiedad_busquedas';
    let query = supabase.from(nombreTabla).select('*').order('id');
    if (ids) query = query.in('id', ids);
    const { data, error } = await query.limit(5000);
    if (error) throw new Error(error.message);

    const cfg = await loadConfig(supabase);
    const res = await normalizarFilas(supabase, tabla, data ?? [], cfg, { force: body?.force === true });
    const n = (e: string) => res.filter((r) => r.estado === e).length;
    return NextResponse.json({
      normalizados: n('normalizado'),
      omitidos: n('omitido'),
      fallidos: n('fallido'),
      stale_restantes: res.filter((r) => r.fuente === 'parser').length,
      detalle: res.map((r) => ({ id: r.id, estado: r.estado, fuente: r.fuente, error: r.error })),
    });
  } catch (err: any) {
    console.error('rueda/normalizar:', err);
    return NextResponse.json({ error: err?.message || 'Error inesperado' }, { status: 500 });
  }
}
