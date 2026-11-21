// Helpers puros para lo que ve el bot: pocas opciones bien repartidas y matching de teléfonos.

import type { Intervalo } from './disponibilidad';
import { partesEnZona } from './zona';

/**
 * Elige hasta `max` turnos repartidos: primero uno por franja (día + mañana/tarde), en orden;
 * si sobran lugares, completa con los turnos más tempranos restantes. Resultado cronológico.
 */
export function distribuirSlots<T extends Intervalo>(slots: T[], max: number, tz: string): T[] {
  const elegidos = new Set<T>();
  const franjas = new Set<string>();
  for (const s of slots) {
    if (elegidos.size >= max) break;
    const { fecha, hora } = partesEnZona(s.inicio, tz);
    const franja = `${fecha}-${hora < '13:00' ? 'm' : 't'}`;
    if (!franjas.has(franja)) {
      franjas.add(franja);
      elegidos.add(s);
    }
  }
  for (const s of slots) {
    if (elegidos.size >= max) break;
    elegidos.add(s);
  }
  return slots.filter((s) => elegidos.has(s));
}

/** Convención del CRM para comparar teléfonos: solo dígitos, últimos 10 */
export function ultimos10(valor: string | null | undefined): string | null {
  const digitos = (valor ?? '').replace(/\D/g, '');
  return digitos.length >= 10 ? digitos.slice(-10) : null;
}
