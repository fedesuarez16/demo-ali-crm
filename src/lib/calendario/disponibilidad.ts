// Cálculo puro de turnos libres: horario de atención (hora local) - eventos ocupados (Google freeBusy).

import { partesEnZona, sumarDias, zonaAUtc } from './zona';

export type DiaSemana = '1' | '2' | '3' | '4' | '5' | '6' | '7'; // 1 = lunes
export type Rango = [string, string]; // ["09:00", "13:00"] hora local
export type Horario = Partial<Record<DiaSemana, Rango[]>>;

export interface Intervalo {
  inicio: Date;
  fin: Date;
}

export interface ParamsSlots {
  horario: Horario;
  duracionMin: number;
  bufferMin: number;
  /** Minutos mínimos entre "ahora" y el inicio del turno */
  anticipacionMin: number;
  ventanaDias: number;
  ocupados: Intervalo[];
  ahora: Date;
  zonaHoraria: string;
  /** Granularidad de inicio de turnos (default 30) */
  pasoMin?: number;
  /** Buscar a partir de este instante (si es posterior a ahora + anticipación) */
  desde?: Date;
  maxSlots?: number;
}

const MIN = 60_000;

export function haySolapamiento(slot: Intervalo, ocupados: Intervalo[], bufferMin: number): boolean {
  const b = bufferMin * MIN;
  const ini = slot.inicio.getTime();
  const fin = slot.fin.getTime();
  return ocupados.some((o) => ini < o.fin.getTime() + b && fin > o.inicio.getTime() - b);
}

function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function aHora(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export function calcularSlots(p: ParamsSlots): Intervalo[] {
  const paso = p.pasoMin ?? 30;
  const max = p.maxSlots ?? Infinity;
  const minimo = Math.max(p.ahora.getTime() + p.anticipacionMin * MIN, p.desde?.getTime() ?? 0);
  const hoy = partesEnZona(p.ahora, p.zonaHoraria).fecha;
  const slots: Intervalo[] = [];

  for (let d = 0; d < p.ventanaDias && slots.length < max; d++) {
    const fecha = sumarDias(hoy, d);
    // Mediodía local para obtener el día de semana sin ambigüedad de zona
    const dia = String(partesEnZona(zonaAUtc(fecha, '12:00', p.zonaHoraria), p.zonaHoraria).diaSemana) as DiaSemana;
    const rangos = [...(p.horario[dia] ?? [])].sort((a, b) => aMinutos(a[0]) - aMinutos(b[0]));

    for (const [desde, hasta] of rangos) {
      const fin = aMinutos(hasta);
      for (let t = aMinutos(desde); t + p.duracionMin <= fin && slots.length < max; t += paso) {
        const inicio = zonaAUtc(fecha, aHora(t), p.zonaHoraria);
        if (inicio.getTime() < minimo) continue;
        const slot = { inicio, fin: new Date(inicio.getTime() + p.duracionMin * MIN) };
        if (!haySolapamiento(slot, p.ocupados, p.bufferMin)) slots.push(slot);
      }
    }
  }
  return slots;
}

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validarHorario(input: unknown): { ok: true; horario: Horario } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'horario debe ser un objeto { "1": [["09:00","13:00"]], ... }' };
  }
  const horario: Horario = {};
  for (const [dia, rangos] of Object.entries(input as Record<string, unknown>)) {
    if (!/^[1-7]$/.test(dia)) return { ok: false, error: `día inválido: ${dia} (1 = lunes ... 7 = domingo)` };
    if (!Array.isArray(rangos)) return { ok: false, error: `rangos del día ${dia} deben ser un array` };
    const validos: Rango[] = [];
    for (const r of rangos) {
      if (!Array.isArray(r) || r.length !== 2 || !HORA_RE.test(r[0]) || !HORA_RE.test(r[1])) {
        return { ok: false, error: `rango inválido en día ${dia}: usar ["HH:MM","HH:MM"]` };
      }
      if (aMinutos(r[0]) >= aMinutos(r[1])) return { ok: false, error: `rango invertido en día ${dia}: ${r[0]}-${r[1]}` };
      validos.push([r[0], r[1]]);
    }
    if (validos.length) horario[dia as DiaSemana] = validos;
  }
  return { ok: true, horario };
}
