import { NextRequest, NextResponse } from 'next/server';
import { requireCrmSession } from '@/lib/requireCrmSession';
import { getSupabase } from '@/lib/rueda/supabase';
import { loadConfig } from '@/lib/rueda/config';
import { cercanosParaBusqueda, cercanosParaPropiedad } from '@/app/utils/ruedaCercanos';
import type { RuedaNormalizado } from '@/app/types';

const PAGINA = 1000;

async function normalizadosDe(supabase: any, tabla: 'propiedad' | 'busqueda') {
  const out: Array<{ id: number; normalizado: RuedaNormalizado }> = [];
  for (let from = 0; ; from += PAGINA) {
    const { data, error } = await supabase
      .from('rueda_normalizados').select('fila_id,normalizado').eq('tabla', tabla).order('fila_id').range(from, from + PAGINA - 1);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) out.push({ id: r.fila_id, normalizado: r.normalizado });
    if (!data || data.length < PAGINA) break;
  }
  return out;
}

/** "Casi matches" en vivo: sin LLM y sin escrituras. Usa solo los normalizados ya cacheados. */
async function cercanos(busquedaId: number | null, propiedadId: number | null) {
  const supabase = getSupabase() as any;
  const cfg = await loadConfig(supabase);
  const ladoBusqueda = busquedaId !== null;
  const ancla = ladoBusqueda ? busquedaId : propiedadId;
  const { data: filaAncla, error: e1 } = await supabase
    .from('rueda_normalizados').select('normalizado').eq('tabla', ladoBusqueda ? 'busqueda' : 'propiedad').eq('fila_id', ancla).maybeSingle();
  if (e1) throw new Error(e1.message);
  if (!filaAncla) return { cercanos: [], umbral: cfg.umbral };

  const colAncla = ladoBusqueda ? 'busqueda_id' : 'propiedad_id';
  const colOtro = ladoBusqueda ? 'propiedad_id' : 'busqueda_id';
  const { data: existentes, error: e2 } = await supabase
    .from('rueda_matches').select(colOtro).eq(colAncla, ancla).eq('bajo_umbral', false);
  if (e2) throw new Error(e2.message);
  const excluirIds = new Set<number>((existentes ?? []).map((r: any) => r[colOtro]));

  const candidatos = await normalizadosDe(supabase, ladoBusqueda ? 'propiedad' : 'busqueda');
  const top = ladoBusqueda
    ? cercanosParaBusqueda(filaAncla.normalizado, candidatos, cfg, { excluirIds })
    : cercanosParaPropiedad(filaAncla.normalizado, candidatos, cfg, { excluirIds });
  if (top.length === 0) return { cercanos: [], umbral: cfg.umbral };

  const { data: filas, error: e3 } = await supabase
    .from(ladoBusqueda ? 'propiedades' : 'propiedad_busquedas').select('*').in('id', top.map((t) => t.id));
  if (e3) throw new Error(e3.message);
  const porId = new Map<number, any>((filas ?? []).map((f: any) => [f.id, f]));
  const ahora = new Date().toISOString();
  // Forma de RuedaMatch (id negativo = no persistido) para reutilizar MatchCard.
  const items = top
    .filter((t) => porId.has(t.id))
    .map((t) => ({
      id: -t.id,
      busqueda_id: ladoBusqueda ? ancla : t.id,
      propiedad_id: ladoBusqueda ? t.id : ancla,
      score: t.score,
      motivos: t.motivos,
      estado: 'revisado',
      estado_origen: 'sistema',
      bajo_umbral: true,
      notas: null,
      first_seen_at: ahora,
      estado_updated_at: ahora,
      score_updated_at: ahora,
      ...(ladoBusqueda ? { propiedad: porId.get(t.id) } : { busqueda: porId.get(t.id) }),
    }));
  return { cercanos: items, umbral: cfg.umbral };
}

/**
 * GET /api/rueda/matches?busquedaId=|propiedadId=|estado=nuevo&incluirDescartados=1
 * Matches visibles (bajo_umbral=false) con propiedad y búsqueda embebidas.
 * Orden: score desc, first_seen_at desc.
 * Con cercanos=1 (+ busquedaId o propiedadId): { cercanos, umbral } con los 3 "casi matches" calculados en vivo.
 */
export async function GET(request: NextRequest) {
  const noAuth = await requireCrmSession(request);
  if (noAuth) return noAuth;

  const sp = request.nextUrl.searchParams;
  const entero = (k: string) => {
    const v = sp.get(k);
    if (v === null || v === '') return null;
    const n = Number(v);
    return Number.isInteger(n) ? n : NaN;
  };
  const busquedaId = entero('busquedaId');
  const propiedadId = entero('propiedadId');
  if (Number.isNaN(busquedaId) || Number.isNaN(propiedadId)) {
    return NextResponse.json({ error: 'busquedaId/propiedadId inválidos' }, { status: 400 });
  }
  const estado = sp.get('estado');
  const incluirDescartados = sp.get('incluirDescartados') === '1' || sp.get('incluirDescartados') === 'true';

  try {
    if (sp.get('cercanos') === '1') {
      if ((busquedaId === null) === (propiedadId === null)) {
        return NextResponse.json({ error: 'cercanos requiere busquedaId o propiedadId (solo uno)' }, { status: 400 });
      }
      return NextResponse.json(await cercanos(busquedaId, propiedadId));
    }
    let q = getSupabase()
      .from('rueda_matches')
      .select('*, propiedad:propiedades(*), busqueda:propiedad_busquedas(*)')
      .eq('bajo_umbral', false)
      .order('score', { ascending: false })
      .order('first_seen_at', { ascending: false })
      .limit(1000);
    if (busquedaId !== null) q = q.eq('busqueda_id', busquedaId);
    if (propiedadId !== null) q = q.eq('propiedad_id', propiedadId);
    if (estado) q = q.eq('estado', estado);
    else if (!incluirDescartados) q = q.neq('estado', 'descartado');

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return NextResponse.json({ matches: data ?? [] });
  } catch (err: any) {
    console.error('rueda/matches GET:', err);
    return NextResponse.json({ error: err?.message || 'Error inesperado' }, { status: 500 });
  }
}
