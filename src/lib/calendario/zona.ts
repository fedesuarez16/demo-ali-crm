// Helpers de zona horaria sin dependencias (Intl). Los horarios de atención se definen en hora
// local de la persona (ej. "09:00" en America/Argentina/Buenos_Aires) y se convierten a UTC.

export const ZONA_DEFAULT = 'America/Argentina/Buenos_Aires';

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DIA_CORTO: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    });
    formatters.set(tz, f);
  }
  return f;
}

function partes(date: Date, tz: string) {
  const p: Record<string, string> = {};
  for (const { type, value } of formatter(tz).formatToParts(date)) p[type] = value;
  return p;
}

export interface PartesLocales {
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  diaSemana: number; // 1 = lunes ... 7 = domingo
}

export function partesEnZona(date: Date, tz: string): PartesLocales {
  const p = partes(date, tz);
  return {
    fecha: `${p.year}-${p.month}-${p.day}`,
    hora: `${p.hour}:${p.minute}`,
    diaSemana: DIA_CORTO[p.weekday],
  };
}

/** Diferencia (ms) entre la hora local de `tz` y UTC en el instante dado */
function offsetMs(instante: number, tz: string): number {
  const p = partes(new Date(instante), tz);
  const comoUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return comoUtc - Math.floor(instante / 1000) * 1000;
}

/** "2026-11-23" + "09:00" en `tz` -> instante UTC */
export function zonaAUtc(fecha: string, hora: string, tz: string): Date {
  const [y, m, d] = fecha.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  const ingenuo = Date.UTC(y, m - 1, d, hh, mm);
  let utc = ingenuo - offsetMs(ingenuo, tz);
  // Segunda pasada por si el offset cambia entre el instante ingenuo y el real (DST)
  utc = ingenuo - offsetMs(utc, tz);
  return new Date(utc);
}

export function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** "lunes 23/11 15:30" — formato que el bot puede leerle al cliente */
export function formatearSlot(date: Date, tz: string): string {
  const { fecha, hora, diaSemana } = partesEnZona(date, tz);
  const [, mes, dia] = fecha.split('-');
  return `${DIAS[diaSemana - 1]} ${dia}/${mes} ${hora}`;
}
