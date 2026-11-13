// Orquestación del recálculo: normaliza lo obsoleto, puntúa pares (scorePair, puro), y sincroniza
// rueda_matches según planificarSync (puro). Nunca escribe en propiedades/propiedad_busquedas.
import type { RuedaNormalizado } from '@/app/types';
import { scorePair } from '@/app/utils/ruedaScoring';
import { loadConfig } from './config';
import { MAX_LLM_POR_REQUEST, normalizarFilas, type ResultadoFila } from './normalizador';
import { planificarSync, type FilaExistente, type ParEvaluado } from './syncPlan';
import { getSupabase } from './supabase';

export interface PedidoRecalcular {
  busquedaIds?: number[];
  propiedadIds?: number[];
  all?: boolean;
}

export interface ResumenRecalculo {
  creados: number;
  actualizados: number;
  ocultos: number;
  eliminados: number;
  sin_cambios: number;
  errores: number;
  normalizacion: { normalizados: number; omitidos: number; fallidos: number };
  /** Filas que quedaron con normalizado del parser (obsoletas): el backfill repite mientras baje. */
  stale_restantes: number;
  huerfanos_limpiados: number;
}

const PAGINA = 1000;
const CHUNK = 200;

async function fetchTodo(construir: (from: number, to: number) => any): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += PAGINA) {
    const { data, error } = await construir(from, from + PAGINA - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGINA) break;
  }
  return out;
}

const trozos = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

async function enParalelo<T>(items: T[], limite: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limite, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

const idsValidos = (v: unknown): number[] =>
  Array.isArray(v) ? [...new Set(v.map(Number).filter((n) => Number.isInteger(n) && n > 0))] : [];

export function normalizarPedido(body: any): PedidoRecalcular {
  return { busquedaIds: idsValidos(body?.busquedaIds), propiedadIds: idsValidos(body?.propiedadIds), all: body?.all === true };
}

export async function recalcular(pedido: PedidoRecalcular, opts: { presupuestoLLM?: number } = {}): Promise<ResumenRecalculo> {
  const supabase = getSupabase();
  const cfg = await loadConfig(supabase);
  const all = pedido.all === true;
  const bIds = pedido.busquedaIds ?? [];
  const pIds = pedido.propiedadIds ?? [];
  if (!all && bIds.length === 0 && pIds.length === 0) throw new Error('Nada para recalcular (busquedaIds, propiedadIds o all)');

  // 1) Cargar filas
  const propiedades: any[] = await fetchTodo((f, t) => supabase.from('propiedades').select('*').order('id').range(f, t));
  const busquedas: any[] = await fetchTodo((f, t) => supabase.from('propiedad_busquedas').select('*').order('id').range(f, t));
  const propPorId = new Map(propiedades.map((p) => [Number(p.id), p]));
  const busPorId = new Map(busquedas.map((b) => [Number(b.id), b]));

  // 2) Pares en alcance
  const pares = new Map<string, [number, number]>(); // "b:p" -> [b,p]
  const agregar = (b: number, p: number) => pares.set(`${b}:${p}`, [b, p]);
  if (all) {
    for (const b of busPorId.keys()) for (const p of propPorId.keys()) agregar(b, p);
  } else {
    for (const p of pIds) if (propPorId.has(p)) for (const b of busPorId.keys()) agregar(b, p);
    for (const b of bIds) if (busPorId.has(b)) for (const p of propPorId.keys()) agregar(b, p);
  }

  const busInvolucradas = new Set<number>();
  const propInvolucradas = new Set<number>();
  for (const [b, p] of pares.values()) { busInvolucradas.add(b); propInvolucradas.add(p); }

  // 3) Normalizar (presupuesto de LLM compartido entre ambas tablas; primero los objetivos del pedido)
  let presupuesto = opts.presupuestoLLM ?? MAX_LLM_POR_REQUEST;
  const resultados: ResultadoFila[] = [];
  const ordenar = (ids: Set<number>, prioritarios: number[]) => {
    const pri = new Set(prioritarios);
    return [...ids].sort((a, b) => Number(pri.has(b)) - Number(pri.has(a)));
  };
  const normProp = new Map<number, RuedaNormalizado>();
  const normBus = new Map<number, RuedaNormalizado>();
  for (const [tabla, ids, prioritarios, filas, destino] of [
    ['propiedad', propInvolucradas, pIds, propPorId, normProp],
    ['busqueda', busInvolucradas, bIds, busPorId, normBus],
  ] as const) {
    const orden = ordenar(ids as Set<number>, prioritarios);
    const res = await normalizarFilas(supabase, tabla, orden.map((id) => filas.get(id)), cfg, { presupuestoLLM: presupuesto });
    const usados = res.filter((r) => r.estado !== 'omitido').length;
    presupuesto = Math.max(0, presupuesto - usados);
    for (const r of res) destino.set(r.id, r.normalizado);
    resultados.push(...res);
  }

  // 4) Puntuar
  const evaluados: ParEvaluado[] = [];
  for (const [b, p] of pares.values()) {
    const nb = normBus.get(b);
    const np = normProp.get(p);
    if (!nb || !np) continue;
    const r = scorePair(nb, np, cfg);
    evaluados.push({ busqueda_id: b, propiedad_id: p, score: r.score, motivos: r.motivos, persistible: r.persistible });
  }

  // 5) Existentes en alcance
  const existentesMap = new Map<number, FilaExistente>();
  const cargar = async (columna: 'busqueda_id' | 'propiedad_id', ids: number[]) => {
    for (const ch of trozos(ids, CHUNK)) {
      const filas = await fetchTodo((f, t) =>
        supabase.from('rueda_matches')
          .select('id,busqueda_id,propiedad_id,score,motivos,estado,estado_origen,bajo_umbral')
          .in(columna, ch).order('id').range(f, t));
      for (const r of filas) existentesMap.set(r.id, r);
    }
  };
  if (all) {
    for (const r of await fetchTodo((f, t) =>
      supabase.from('rueda_matches').select('id,busqueda_id,propiedad_id,score,motivos,estado,estado_origen,bajo_umbral').order('id').range(f, t))) {
      existentesMap.set(r.id, r);
    }
  } else {
    await cargar('propiedad_id', pIds);
    await cargar('busqueda_id', bIds);
  }

  // 6) Plan y aplicación
  const plan = planificarSync([...existentesMap.values()], evaluados);
  let errores = 0;
  const ahora = new Date().toISOString();

  for (const ch of trozos(plan.insertar, CHUNK)) {
    // El payload EXCLUYE estado/estado_origen/notas/first_seen_at: si el par ya existe (carrera), no se pisan.
    const { error } = await supabase.from('rueda_matches').upsert(
      ch.map((r) => ({ busqueda_id: r.busqueda_id, propiedad_id: r.propiedad_id, score: r.score, motivos: r.motivos })),
      { onConflict: 'busqueda_id,propiedad_id' },
    );
    if (error) { errores += ch.length; console.warn('rueda recalcular: insert', error.message); }
  }

  for (const ch of trozos(plan.eliminar, CHUNK)) {
    // Guarda contra carreras: solo borra si sigue siendo de origen sistema y no descartado
    const { error } = await supabase.from('rueda_matches').delete()
      .in('id', ch).eq('estado_origen', 'sistema').neq('estado', 'descartado');
    if (error) { errores += ch.length; console.warn('rueda recalcular: delete', error.message); }
  }

  const actualizaciones = [
    ...plan.actualizar.map((a) => ({
      id: a.id,
      cambios: { score: a.score, motivos: a.motivos, bajo_umbral: a.bajo_umbral, ...(a.scoreCambio ? { score_updated_at: ahora } : {}) },
    })),
    ...plan.ocultar.map((o) => ({
      id: o.id,
      cambios: { score: o.score, motivos: o.motivos, bajo_umbral: true, score_updated_at: ahora },
    })),
  ];
  await enParalelo(actualizaciones, 10, async (u) => {
    const { error } = await supabase.from('rueda_matches').update(u.cambios).eq('id', u.id).neq('estado', 'descartado');
    if (error) { errores++; console.warn('rueda recalcular: update', error.message); }
  });

  // 7) Huérfanos de rueda_normalizados (sin triggers sobre las tablas de origen)
  const huerfanos = await limpiarHuerfanos(supabase, all, propPorId, busPorId, pIds, bIds);

  const n = (e: ResultadoFila['estado']) => resultados.filter((r) => r.estado === e).length;
  return {
    ...plan.resumen,
    errores,
    normalizacion: { normalizados: n('normalizado'), omitidos: n('omitido'), fallidos: n('fallido') },
    stale_restantes: resultados.filter((r) => r.fuente === 'parser').length,
    huerfanos_limpiados: huerfanos,
  };
}

async function limpiarHuerfanos(
  supabase: any,
  all: boolean,
  propPorId: Map<number, unknown>,
  busPorId: Map<number, unknown>,
  pIds: number[],
  bIds: number[],
): Promise<number> {
  let borrados = 0;
  try {
    for (const [tabla, existentes, pedidos] of [
      ['propiedad', propPorId, pIds],
      ['busqueda', busPorId, bIds],
    ] as const) {
      let huerfanos: number[];
      if (all) {
        const filas = await fetchTodo((f, t) =>
          supabase.from('rueda_normalizados').select('fila_id').eq('tabla', tabla).order('fila_id').range(f, t));
        huerfanos = filas.map((r) => Number(r.fila_id)).filter((id) => !existentes.has(id));
      } else {
        huerfanos = pedidos.filter((id) => !existentes.has(id));
      }
      for (const ch of trozos(huerfanos, CHUNK)) {
        const { error } = await supabase.from('rueda_normalizados').delete().eq('tabla', tabla).in('fila_id', ch);
        if (!error) borrados += ch.length;
      }
    }
  } catch (err: any) {
    console.warn('rueda recalcular: limpieza de huérfanos', err?.message);
  }
  return borrados;
}
