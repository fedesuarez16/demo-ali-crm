import { describe, expect, it } from 'vitest';
import { distribuirSlots, ultimos10 } from './sugerencias';

const AR = 'America/Argentina/Buenos_Aires';
const s = (iso: string) => ({ inicio: new Date(iso), fin: new Date(new Date(iso).getTime() + 30 * 60_000) });

describe('distribuirSlots', () => {
  const slots = [
    s('2026-11-23T12:00:00Z'), // lun 09:00 mañana
    s('2026-11-23T12:30:00Z'), // lun 09:30 mañana
    s('2026-11-23T18:00:00Z'), // lun 15:00 tarde
    s('2026-11-23T18:30:00Z'), // lun 15:30 tarde
    s('2026-11-24T12:00:00Z'), // mar 09:00 mañana
    s('2026-11-24T18:00:00Z'), // mar 15:00 tarde
  ];

  it('toma el primer turno de cada franja (día + mañana/tarde) antes de repetir', () => {
    const r = distribuirSlots(slots, 3, AR).map((x) => x.inicio.toISOString());
    expect(r).toEqual(['2026-11-23T12:00:00.000Z', '2026-11-23T18:00:00.000Z', '2026-11-24T12:00:00.000Z']);
  });

  it('si faltan franjas completa con los restantes, en orden cronológico', () => {
    const r = distribuirSlots(slots, 5, AR).map((x) => x.inicio.toISOString());
    expect(r).toEqual([
      '2026-11-23T12:00:00.000Z',
      '2026-11-23T12:30:00.000Z',
      '2026-11-23T18:00:00.000Z',
      '2026-11-24T12:00:00.000Z',
      '2026-11-24T18:00:00.000Z',
    ]);
  });

  it('devuelve vacío sin slots', () => {
    expect(distribuirSlots([], 3, AR)).toEqual([]);
  });
});

describe('ultimos10', () => {
  it('normaliza los formatos de WhatsApp a los últimos 10 dígitos', () => {
    expect(ultimos10('+5492215735321')).toBe('2215735321');
    expect(ultimos10('549221573532 1@s.whatsapp.net')).toBe('2215735321');
    expect(ultimos10('WAID:5492215735321')).toBe('2215735321');
  });
  it('devuelve null si hay menos de 10 dígitos', () => {
    expect(ultimos10('12345')).toBeNull();
    expect(ultimos10(undefined)).toBeNull();
  });
});
