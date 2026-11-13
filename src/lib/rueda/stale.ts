// Hash del input de normalización y detección de obsolescencia del cache (rueda_normalizados).
import { createHash } from 'node:crypto';

export function calcularHash(version: string, hashInput: string): string {
  return createHash('sha256').update(version + hashInput).digest('hex');
}

export interface CacheNormalizado {
  normalizado_hash: string;
  fuente: 'llm' | 'parser';
}

/** Obsoleto si no hay registro, el hash difiere o lo produjo el parser (se reintenta con LLM). */
export function esStale(cache: CacheNormalizado | null | undefined, hashActual: string): boolean {
  if (!cache) return true;
  if (cache.normalizado_hash !== hashActual) return true;
  return cache.fuente === 'parser';
}
