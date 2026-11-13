// Cliente (browser) de la Rueda de Negocios: wrappers de fetch sobre /api/rueda/**.
// dispararRueda es fire-and-forget: nunca lanza ni bloquea el guardado que lo invoca.
import type { MatchEstado, RuedaConfig, RuedaMatch } from '../types';

export const RUEDA_EVENTO = 'rueda:actualizada';
const CHUNK_IDS = 10;

export interface ResumenRecalculo {
  creados: number;
  actualizados: number;
  ocultos: number;
  eliminados: number;
  sin_cambios: number;
  errores: number;
  normalizacion?: { normalizados: number; omitidos: number; fallidos: number };
  stale_restantes: number;
  huerfanos_limpiados?: number;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.error || `Error ${res.status}`);
    err.status = res.status;
    err.errores = data?.errores;
    throw err;
  }
  return data as T;
}

const emitirActualizacion = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(RUEDA_EVENTO));
};

const trozos = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

const aIds = (v?: Array<number | string>): number[] =>
  (v ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0);

/**
 * Dispara el recálculo tras guardar una fila. Chunks de 10 ids por request, secuenciales.
 * NUNCA lanza: si falla, el guardado ya terminó y el backfill recupera lo omitido.
 */
export async function dispararRueda(params: { busquedaIds?: Array<number | string>; propiedadIds?: Array<number | string> }): Promise<void> {
  try {
    const busquedaIds = aIds(params.busquedaIds);
    const propiedadIds = aIds(params.propiedadIds);
    for (const ch of trozos(propiedadIds, CHUNK_IDS)) {
      await api('/api/rueda/recalcular', { method: 'POST', body: JSON.stringify({ propiedadIds: ch }) });
    }
    for (const ch of trozos(busquedaIds, CHUNK_IDS)) {
      await api('/api/rueda/recalcular', { method: 'POST', body: JSON.stringify({ busquedaIds: ch }) });
    }
  } catch (e) {
    console.warn('dispararRueda: no se pudo recalcular (el backfill lo recupera)', e);
  } finally {
    emitirActualizacion();
  }
}

export async function recalcularRueda(body: { busquedaIds?: number[]; propiedadIds?: number[]; all?: boolean }): Promise<ResumenRecalculo> {
  return api<ResumenRecalculo>('/api/rueda/recalcular', { method: 'POST', body: JSON.stringify(body) });
}

export async function normalizarRueda(body: { tabla: 'propiedad' | 'busqueda'; ids?: number[]; force?: boolean }) {
  return api<{ normalizados: number; omitidos: number; fallidos: number; stale_restantes: number }>(
    '/api/rueda/normalizar',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export interface FiltrosMatches {
  busquedaId?: number | string;
  propiedadId?: number | string;
  estado?: MatchEstado;
  incluirDescartados?: boolean;
}

export async function listMatches(filtros: FiltrosMatches = {}): Promise<RuedaMatch[]> {
  const sp = new URLSearchParams();
  if (filtros.busquedaId !== undefined) sp.set('busquedaId', String(filtros.busquedaId));
  if (filtros.propiedadId !== undefined) sp.set('propiedadId', String(filtros.propiedadId));
  if (filtros.estado) sp.set('estado', filtros.estado);
  if (filtros.incluirDescartados) sp.set('incluirDescartados', '1');
  const data = await api<{ matches: RuedaMatch[] }>(`/api/rueda/matches?${sp.toString()}`);
  return data.matches;
}

/** "Casi matches" (bajo el umbral, sobre el piso) calculados en vivo. No persisten ni llaman al LLM. */
export async function listCercanos(
  filtro: { busquedaId: number | string } | { propiedadId: number | string },
): Promise<{ cercanos: RuedaMatch[]; umbral: number }> {
  const sp = new URLSearchParams({ cercanos: '1' });
  if ('busquedaId' in filtro) sp.set('busquedaId', String(filtro.busquedaId));
  else sp.set('propiedadId', String(filtro.propiedadId));
  return api<{ cercanos: RuedaMatch[]; umbral: number }>(`/api/rueda/matches?${sp.toString()}`);
}

export async function patchMatch(
  id: number,
  cambios: { estado?: MatchEstado; notas?: string | null; via?: 'apertura' | 'restaurar' },
): Promise<RuedaMatch> {
  const data = await api<{ match: RuedaMatch }>(`/api/rueda/matches/${id}`, { method: 'PATCH', body: JSON.stringify(cambios) });
  emitirActualizacion();
  return data.match;
}

export async function getNuevosCount(): Promise<number> {
  const data = await api<{ count: number }>('/api/rueda/nuevos/count');
  return data.count;
}

export async function getConfig(): Promise<RuedaConfig> {
  return (await api<{ config: RuedaConfig }>('/api/rueda/config')).config;
}

/** Lanza Error con .errores (lista) si la validación del server falla. `recalcular:false` evita el recálculo automático. */
export async function putConfig(config: Partial<RuedaConfig>, opts: { recalcular?: boolean } = {}) {
  const data = await api<{ config: RuedaConfig; recalculo: ResumenRecalculo | null }>('/api/rueda/config', {
    method: 'PUT',
    body: JSON.stringify({ ...config, recalcular: opts.recalcular }),
  });
  emitirActualizacion();
  return data;
}

export interface ProgresoBackfill {
  pasada: number;
  stale_restantes: number;
  acumulado: Pick<ResumenRecalculo, 'creados' | 'actualizados' | 'ocultos' | 'eliminados' | 'sin_cambios' | 'errores'>;
}

/**
 * Backfill: repite recalcular(all) (cada pasada normaliza hasta 25 filas con LLM) hasta que no queden
 * obsoletas, deja de bajar el número (LLM caído) o se alcanza maxPasadas. Devuelve el acumulado.
 */
export async function backfillRueda(
  onProgreso?: (p: ProgresoBackfill) => void,
  maxPasadas = 30,
): Promise<ProgresoBackfill> {
  const acumulado: ProgresoBackfill['acumulado'] = { creados: 0, actualizados: 0, ocultos: 0, eliminados: 0, sin_cambios: 0, errores: 0 };
  let ultimo = Infinity;
  let progreso: ProgresoBackfill = { pasada: 0, stale_restantes: 0, acumulado };

  for (let pasada = 1; pasada <= maxPasadas; pasada++) {
    const r = await recalcularRueda({ all: true });
    acumulado.creados += r.creados;
    acumulado.actualizados += r.actualizados;
    acumulado.ocultos += r.ocultos;
    acumulado.eliminados += r.eliminados;
    acumulado.errores += r.errores;
    // sin_cambios del último pase es el estado final; el acumulado de pases previos no suma información
    acumulado.sin_cambios = r.sin_cambios;
    progreso = { pasada, stale_restantes: r.stale_restantes, acumulado: { ...acumulado } };
    onProgreso?.(progreso);
    if (r.stale_restantes === 0 || r.stale_restantes >= ultimo) break;
    ultimo = r.stale_restantes;
  }
  emitirActualizacion();
  return progreso;
}
