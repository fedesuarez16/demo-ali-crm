// Helpers puros de presentación del calendario (sin React).

import type { DiaSemana, Horario, Rango } from '@/lib/calendario/disponibilidad';

export const DIAS_SEMANA: { clave: DiaSemana; nombre: string; corto: string }[] = [
  { clave: '1', nombre: 'Lunes', corto: 'Lun' },
  { clave: '2', nombre: 'Martes', corto: 'Mar' },
  { clave: '3', nombre: 'Miércoles', corto: 'Mié' },
  { clave: '4', nombre: 'Jueves', corto: 'Jue' },
  { clave: '5', nombre: 'Viernes', corto: 'Vie' },
  { clave: '6', nombre: 'Sábado', corto: 'Sáb' },
  { clave: '7', nombre: 'Domingo', corto: 'Dom' },
];

export type HorarioTextos = Record<DiaSemana, string>;

export function horarioATextos(horario: Horario): HorarioTextos {
  const out = {} as HorarioTextos;
  for (const { clave } of DIAS_SEMANA) out[clave] = (horario[clave] ?? []).map(([a, b]) => `${a}-${b}`).join(', ');
  return out;
}

function normalizarHora(h: string): string | null {
  const m = h.trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2] ?? '0');
  if (hh > 23 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function textosAHorario(textos: Partial<HorarioTextos>): { ok: true; horario: Horario } | { ok: false; error: string } {
  const horario: Horario = {};
  for (const { clave, nombre } of DIAS_SEMANA) {
    const texto = (textos[clave] ?? '').trim();
    if (!texto) continue;
    const rangos: Rango[] = [];
    for (const parte of texto.split(',')) {
      const [a, b, ...resto] = parte.split('-');
      const desde = a !== undefined ? normalizarHora(a) : null;
      const hasta = b !== undefined ? normalizarHora(b) : null;
      if (!desde || !hasta || resto.length) return { ok: false, error: `${nombre}: usá rangos como "09:00-13:00, 15:00-19:00"` };
      if (desde >= hasta) return { ok: false, error: `${nombre}: el rango ${desde}-${hasta} está invertido` };
      rangos.push([desde, hasta]);
    }
    horario[clave] = rangos;
  }
  return { ok: true, horario };
}

function aFecha(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Lunes de la semana de `fecha` (YYYY-MM-DD) */
export function inicioDeSemana(fecha: string): string {
  const d = aFecha(fecha);
  const dia = d.getUTCDay() || 7; // 1 = lunes ... 7 = domingo
  d.setUTCDate(d.getUTCDate() - (dia - 1));
  return d.toISOString().slice(0, 10);
}

export function diasDeSemana(lunes: string): string[] {
  const d = aFecha(lunes);
  return Array.from({ length: 7 }, (_, i) => new Date(d.getTime() + i * 86_400_000).toISOString().slice(0, 10));
}
