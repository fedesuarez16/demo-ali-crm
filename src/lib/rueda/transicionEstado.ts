// Reglas puras del PATCH /api/rueda/matches/[id].
import type { EstadoOrigen, MatchEstado } from '@/app/types';

export const ESTADOS: MatchEstado[] = ['nuevo', 'revisado', 'contactado', 'pendiente', 'interesado', 'descartado'];
const MAX_NOTAS = 5000;

export interface PedidoPatch {
  estado?: unknown;
  notas?: unknown;
  via?: unknown;
}

export interface CambiosMatch {
  estado?: MatchEstado;
  estado_origen?: EstadoOrigen;
  notas?: string | null;
}

export type ResultadoTransicion = { ok: true; cambios: CambiosMatch } | { ok: false; error: string };

export function transicionarEstado(
  actual: { estado: MatchEstado; estado_origen: EstadoOrigen },
  pedido: PedidoPatch,
): ResultadoTransicion {
  const cambios: CambiosMatch = {};
  const { estado, notas, via } = pedido;

  if (via !== undefined && via !== 'apertura' && via !== 'restaurar') {
    return { ok: false, error: 'via inválida (apertura | restaurar)' };
  }

  if (notas !== undefined) {
    if (notas !== null && typeof notas !== 'string') return { ok: false, error: 'notas debe ser texto o null' };
    if (typeof notas === 'string' && notas.length > MAX_NOTAS) return { ok: false, error: 'notas demasiado largas' };
    cambios.notas = notas as string | null;
  }

  if (via === 'apertura') {
    if (estado !== undefined) return { ok: false, error: 'apertura no acepta estado' };
    // Solo nuevo -> revisado, conservando estado_origen (no cuenta como acción del usuario)
    if (actual.estado === 'nuevo') cambios.estado = 'revisado';
    return { ok: true, cambios };
  }

  if (via === 'restaurar') {
    if (estado !== undefined) return { ok: false, error: 'restaurar no acepta estado' };
    if (actual.estado !== 'descartado') return { ok: false, error: 'Solo se puede restaurar un match descartado' };
    return { ok: true, cambios: { ...cambios, estado: 'revisado', estado_origen: 'usuario' } };
  }

  if (estado !== undefined) {
    if (typeof estado !== 'string' || !ESTADOS.includes(estado as MatchEstado)) {
      return { ok: false, error: `estado inválido (${ESTADOS.join(' | ')})` };
    }
    cambios.estado = estado as MatchEstado;
    cambios.estado_origen = 'usuario';
    return { ok: true, cambios };
  }

  if (notas === undefined) return { ok: false, error: 'Nada para actualizar' };
  return { ok: true, cambios };
}
