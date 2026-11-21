import { describe, expect, it } from 'vitest';
import { calcularSlots, haySolapamiento, validarHorario, type ParamsSlots } from './disponibilidad';

const AR = 'America/Argentina/Buenos_Aires';
// Domingo 22/11/2026 20:00 en Argentina
const AHORA = new Date('2026-11-22T23:00:00Z');

function base(extra: Partial<ParamsSlots> = {}): ParamsSlots {
  return {
    horario: { '1': [['09:00', '11:00']] }, // lunes 9 a 11
    duracionMin: 30,
    bufferMin: 0,
    anticipacionMin: 0,
    ventanaDias: 7,
    ocupados: [],
    ahora: AHORA,
    zonaHoraria: AR,
    ...extra,
  };
}

const iso = (slots: { inicio: Date }[]) => slots.map((s) => s.inicio.toISOString());

describe('calcularSlots', () => {
  it('genera turnos dentro del horario del día, que terminan antes del cierre', () => {
    const slots = calcularSlots(base());
    expect(iso(slots)).toEqual([
      '2026-11-23T12:00:00.000Z',
      '2026-11-23T12:30:00.000Z',
      '2026-11-23T13:00:00.000Z',
      '2026-11-23T13:30:00.000Z',
    ]);
    expect(slots[3].fin.toISOString()).toBe('2026-11-23T14:00:00.000Z');
  });

  it('un turno de 60 min con paso de 30 no se pasa del cierre', () => {
    const slots = calcularSlots(base({ duracionMin: 60 }));
    expect(iso(slots)).toEqual([
      '2026-11-23T12:00:00.000Z',
      '2026-11-23T12:30:00.000Z',
      '2026-11-23T13:00:00.000Z',
    ]);
  });

  it('excluye turnos que se solapan con eventos ocupados', () => {
    const slots = calcularSlots(
      base({ ocupados: [{ inicio: new Date('2026-11-23T12:15:00Z'), fin: new Date('2026-11-23T12:45:00Z') }] }),
    );
    expect(iso(slots)).toEqual(['2026-11-23T13:00:00.000Z', '2026-11-23T13:30:00.000Z']);
  });

  it('aplica el buffer alrededor de los eventos ocupados', () => {
    const slots = calcularSlots(
      base({
        bufferMin: 30,
        ocupados: [{ inicio: new Date('2026-11-23T13:00:00Z'), fin: new Date('2026-11-23T13:30:00Z') }],
      }),
    );
    // ocupado 10:00-10:30 local; con buffer bloquea 9:30-11:00
    expect(iso(slots)).toEqual(['2026-11-23T12:00:00.000Z']);
  });

  it('respeta la anticipación mínima', () => {
    // ahora = lunes 9:10 local; anticipación 60 min -> primer turno posible 10:10 -> 10:30
    const slots = calcularSlots(base({ ahora: new Date('2026-11-23T12:10:00Z'), anticipacionMin: 60 }));
    expect(iso(slots)).toEqual(['2026-11-23T13:30:00.000Z']);
  });

  it('no ofrece días sin horario configurado y recorre la ventana', () => {
    const slots = calcularSlots(base({ ventanaDias: 14, horario: { '3': [['10:00', '10:30']] } }));
    // miércoles 25/11 y 02/12
    expect(iso(slots)).toEqual(['2026-11-25T13:00:00.000Z', '2026-12-02T13:00:00.000Z']);
  });

  it('corta en maxSlots', () => {
    expect(calcularSlots(base({ maxSlots: 2 }))).toHaveLength(2);
  });

  it('soporta varios rangos por día', () => {
    const slots = calcularSlots(
      base({ horario: { '1': [['09:00', '09:30'], ['15:00', '15:30']] } }),
    );
    expect(iso(slots)).toEqual(['2026-11-23T12:00:00.000Z', '2026-11-23T18:00:00.000Z']);
  });

  it('desde posterga el inicio de la búsqueda', () => {
    const slots = calcularSlots(base({ ventanaDias: 14, desde: new Date('2026-11-24T00:00:00Z') }));
    expect(iso(slots)[0]).toBe('2026-11-30T12:00:00.000Z');
  });
});

describe('haySolapamiento', () => {
  const a = { inicio: new Date('2026-11-23T12:00:00Z'), fin: new Date('2026-11-23T12:30:00Z') };
  it('detecta solapamiento y trata los bordes como no solapados', () => {
    expect(haySolapamiento(a, [{ inicio: new Date('2026-11-23T12:29:00Z'), fin: new Date('2026-11-23T13:00:00Z') }], 0)).toBe(true);
    expect(haySolapamiento(a, [{ inicio: new Date('2026-11-23T12:30:00Z'), fin: new Date('2026-11-23T13:00:00Z') }], 0)).toBe(false);
  });
  it('el buffer agranda los ocupados', () => {
    expect(haySolapamiento(a, [{ inicio: new Date('2026-11-23T12:40:00Z'), fin: new Date('2026-11-23T13:00:00Z') }], 15)).toBe(true);
  });
});

describe('validarHorario', () => {
  it('acepta un horario válido y descarta claves vacías', () => {
    expect(validarHorario({ '1': [['09:00', '13:00']], '2': [] })).toEqual({ ok: true, horario: { '1': [['09:00', '13:00']] } });
  });
  it('rechaza días fuera de 1-7, horas mal formadas y rangos invertidos', () => {
    expect(validarHorario({ '8': [['09:00', '10:00']] }).ok).toBe(false);
    expect(validarHorario({ '1': [['9', '10:00']] }).ok).toBe(false);
    expect(validarHorario({ '1': [['11:00', '10:00']] }).ok).toBe(false);
    expect(validarHorario('x').ok).toBe(false);
  });
});
