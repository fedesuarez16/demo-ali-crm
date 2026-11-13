// Lógica pura de presentación de la Rueda de Negocios (sin React): tonos, iconos, orden, agrupado.
import type { MatchEstado, MotivoEstado, RuedaMatch } from '../types';
import { textoAZonas, zonasATexto } from './ruedaZonas';

export type ScoreTono = 'verde' | 'ambar' | 'gris';
export type MotivoIconoId = 'check' | 'alerta' | 'x' | 'interrogacion';

export const scoreTono = (score: number): ScoreTono => (score >= 80 ? 'verde' : score >= 65 ? 'ambar' : 'gris');

export const motivoIcono = (estado: MotivoEstado): MotivoIconoId =>
  estado === 'ok' ? 'check' : estado === 'parcial' ? 'alerta' : estado === 'falla' ? 'x' : 'interrogacion';

const ESTADOS_ACCION: MatchEstado[] = ['contactado', 'pendiente', 'interesado', 'descartado'];

/** Acciones del usuario para un match. Descartado solo se restaura; el resto oculta su estado actual. */
export function accionesDisponibles(estado: MatchEstado): { estados: MatchEstado[]; restaurar: boolean } {
  if (estado === 'descartado') return { estados: [], restaurar: true };
  return { estados: ESTADOS_ACCION.filter((e) => e !== estado), restaurar: false };
}

/** score desc, first_seen_at desc. No muta. */
export const ordenarMatches = (matches: RuedaMatch[]): RuedaMatch[] =>
  [...matches].sort(
    (a, b) => b.score - a.score || Date.parse(b.first_seen_at) - Date.parse(a.first_seen_at),
  );

export const matchEsNuevo = (m: Pick<RuedaMatch, 'estado'>): boolean => m.estado === 'nuevo';

export function resumenBadge(matches: RuedaMatch[]): { total: number; mejor: number; nuevos: number } {
  return {
    total: matches.length,
    mejor: matches.reduce((acc, m) => Math.max(acc, m.score), 0),
    nuevos: matches.filter(matchEsNuevo).length,
  };
}

export function agruparPorBusqueda(matches: RuedaMatch[]): Map<number, RuedaMatch[]> {
  const map = new Map<number, RuedaMatch[]>();
  for (const m of matches) {
    const arr = map.get(m.busqueda_id);
    if (arr) arr.push(m);
    else map.set(m.busqueda_id, [m]);
  }
  return map;
}

export function etiquetaResumenRecalculo(r: { creados: number; actualizados: number; ocultos: number; eliminados: number }): string {
  const p = (n: number, s: string, pl: string) => `${n} ${n === 1 ? s : pl}`;
  return [
    p(r.creados, 'creado', 'creados'),
    p(r.actualizados, 'actualizado', 'actualizados'),
    p(r.ocultos, 'oculto', 'ocultos'),
    p(r.eliminados, 'eliminado', 'eliminados'),
  ].join(' · ');
}

// ───────── Formulario de configuración (strings <-> RuedaConfig) ─────────
import type { RuedaConfig } from '../types';

/** '' -> null, '0,1' -> 0.1, basura -> NaN. */
export function parseNumeroForm(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (t === '') return null;
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

export interface ConfigForm {
  pesos: Record<keyof RuedaConfig['pesos'], string>;
  precio_tolerancia: string; // en %
  zona_cercana_credito: string; // en %
  zona_mismatch_multiplicador: string; // en %
  zonas: string; // una por línea: nombre | alias, alias | vecina, vecina
  umbral: string;
  peso_minimo_evaluado: string;
  ars_por_usd: string;
  moneda_default: 'USD' | 'ARS';
  precio_fuera_tolerancia_elimina: boolean;
  tipo_eliminatorio: boolean;
}

const pct = (f: number) => String(Math.round(f * 10000) / 100);
const aFraccion = (s: string): number => {
  const n = parseNumeroForm(s);
  return n === null ? NaN : n / 100;
};

export function configAForm(c: RuedaConfig): ConfigForm {
  return {
    pesos: Object.fromEntries(Object.entries(c.pesos).map(([k, v]) => [k, String(v)])) as ConfigForm['pesos'],
    precio_tolerancia: pct(c.precio_tolerancia),
    zona_cercana_credito: pct(c.zona_cercana_credito),
    zona_mismatch_multiplicador: pct(c.zona_mismatch_multiplicador),
    zonas: zonasATexto(c.zonas),
    umbral: String(c.umbral),
    peso_minimo_evaluado: String(c.peso_minimo_evaluado),
    ars_por_usd: c.ars_por_usd === null ? '' : String(c.ars_por_usd),
    moneda_default: c.moneda_default,
    precio_fuera_tolerancia_elimina: c.precio_fuera_tolerancia_elimina,
    tipo_eliminatorio: c.tipo_eliminatorio,
  };
}

/** Convierte el form a RuedaConfig. Campos inválidos/vacíos quedan NaN (los rechaza validarConfig). */
export function formAConfig(f: ConfigForm): RuedaConfig {
  const num = (s: string) => {
    const n = parseNumeroForm(s);
    return n === null ? NaN : n;
  };
  return {
    pesos: Object.fromEntries(Object.entries(f.pesos).map(([k, v]) => [k, num(v)])) as RuedaConfig['pesos'],
    precio_tolerancia: aFraccion(f.precio_tolerancia),
    zona_cercana_credito: aFraccion(f.zona_cercana_credito),
    zona_mismatch_multiplicador: aFraccion(f.zona_mismatch_multiplicador),
    zonas: textoAZonas(f.zonas),
    umbral: num(f.umbral),
    peso_minimo_evaluado: num(f.peso_minimo_evaluado),
    ars_por_usd: parseNumeroForm(f.ars_por_usd),
    moneda_default: f.moneda_default,
    precio_fuera_tolerancia_elimina: f.precio_fuera_tolerancia_elimina,
    tipo_eliminatorio: f.tipo_eliminatorio,
  };
}
