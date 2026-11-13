// Módulo PURO: "casi matches" = pares bajo el umbral pero sobre un piso, calculados en vivo (sin LLM ni DB).
import type { Motivo, RuedaConfig, RuedaNormalizado } from '../types';
import { scorePair } from './ruedaScoring';

export interface Candidato { id: number; normalizado: RuedaNormalizado }
export interface Cercano { id: number; score: number; motivos: Motivo[] }
export interface OpcionesCercanos { n?: number; piso?: number; excluirIds?: Set<number> }

export const CERCANOS_N_DEFAULT = 3;
export const CERCANOS_PISO_DEFAULT = 30;

function elegir(
  candidatos: Candidato[],
  puntuar: (c: RuedaNormalizado) => ReturnType<typeof scorePair>,
  cfg: RuedaConfig,
  { n = CERCANOS_N_DEFAULT, piso = CERCANOS_PISO_DEFAULT, excluirIds }: OpcionesCercanos,
): Cercano[] {
  const out: Cercano[] = [];
  for (const c of candidatos) {
    if (excluirIds?.has(c.id)) continue;
    const r = puntuar(c.normalizado);
    // eliminado o sin peso evaluado suficiente => no es candidato (con umbral 0 persistible solo mira eso)
    if (!r.persistible) continue;
    if (r.score >= cfg.umbral || r.score < piso) continue;
    out.push({ id: c.id, score: r.score, motivos: r.motivos });
  }
  return out.sort((a, b) => b.score - a.score || a.id - b.id).slice(0, n);
}

/** Propiedades que casi coinciden con una búsqueda. */
export function cercanosParaBusqueda(
  busqueda: RuedaNormalizado, propiedades: Candidato[], cfg: RuedaConfig, opts: OpcionesCercanos = {},
): Cercano[] {
  const sinUmbral = { ...cfg, umbral: 0 };
  return elegir(propiedades, (p) => scorePair(busqueda, p, sinUmbral), cfg, opts);
}

/** Búsquedas que casi coinciden con una propiedad. */
export function cercanosParaPropiedad(
  propiedad: RuedaNormalizado, busquedas: Candidato[], cfg: RuedaConfig, opts: OpcionesCercanos = {},
): Cercano[] {
  const sinUmbral = { ...cfg, umbral: 0 };
  return elegir(busquedas, (b) => scorePair(b, propiedad, sinUmbral), cfg, opts);
}
