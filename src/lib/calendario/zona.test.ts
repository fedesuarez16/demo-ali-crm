import { describe, expect, it } from 'vitest';
import { formatearSlot, partesEnZona, sumarDias, zonaAUtc } from './zona';

const AR = 'America/Argentina/Buenos_Aires';

describe('zonaAUtc', () => {
  it('convierte hora local de Argentina (UTC-3) a UTC', () => {
    expect(zonaAUtc('2026-11-23', '09:00', AR).toISOString()).toBe('2026-11-23T12:00:00.000Z');
    expect(zonaAUtc('2026-11-23', '22:30', AR).toISOString()).toBe('2026-11-24T01:30:00.000Z');
  });
  it('respeta el horario de verano de zonas con DST', () => {
    expect(zonaAUtc('2026-07-01', '10:00', 'Europe/Madrid').toISOString()).toBe('2026-07-01T08:00:00.000Z');
    expect(zonaAUtc('2026-01-15', '10:00', 'Europe/Madrid').toISOString()).toBe('2026-01-15T09:00:00.000Z');
  });
});

describe('partesEnZona', () => {
  it('devuelve fecha, hora y día ISO (1 = lunes) en la zona pedida', () => {
    // 2026-11-24T01:30Z es lunes 23 a las 22:30 en Argentina
    expect(partesEnZona(new Date('2026-11-24T01:30:00Z'), AR)).toEqual({
      fecha: '2026-11-23',
      hora: '22:30',
      diaSemana: 1,
    });
    // domingo -> 7
    expect(partesEnZona(new Date('2026-11-22T15:00:00Z'), AR).diaSemana).toBe(7);
  });
});

describe('sumarDias', () => {
  it('suma días a una fecha YYYY-MM-DD cruzando mes', () => {
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('formatearSlot', () => {
  it('formatea en español con día, fecha y hora local', () => {
    expect(formatearSlot(new Date('2026-11-23T18:30:00Z'), AR)).toBe('lunes 23/11 15:30');
  });
});
