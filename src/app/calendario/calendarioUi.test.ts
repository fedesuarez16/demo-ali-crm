import { describe, expect, it } from 'vitest';
import { diasDeSemana, horarioATextos, inicioDeSemana, textosAHorario } from './calendarioUi';

describe('horarioATextos / textosAHorario', () => {
  it('convierte el horario a texto editable por día', () => {
    expect(horarioATextos({ '1': [['09:00', '13:00'], ['15:00', '19:00']], '6': [['10:00', '13:00']] })).toEqual({
      '1': '09:00-13:00, 15:00-19:00',
      '2': '',
      '3': '',
      '4': '',
      '5': '',
      '6': '10:00-13:00',
      '7': '',
    });
  });

  it('parsea el texto, tolerando espacios y horas de un dígito', () => {
    expect(textosAHorario({ '1': ' 9:00 - 13:00 ,15:00-19:30', '2': '', '7': '10-12' })).toEqual({
      ok: true,
      horario: { '1': [['09:00', '13:00'], ['15:00', '19:30']], '7': [['10:00', '12:00']] },
    });
  });

  it('informa el día con error', () => {
    const r = textosAHorario({ '3': '9 a 13' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('Miércoles');
  });
});

describe('inicioDeSemana / diasDeSemana', () => {
  it('lleva cualquier día al lunes de esa semana (fecha local)', () => {
    expect(inicioDeSemana('2026-11-20')).toBe('2026-11-16'); // viernes -> lunes
    expect(inicioDeSemana('2026-11-22')).toBe('2026-11-16'); // domingo -> lunes anterior
    expect(inicioDeSemana('2026-11-16')).toBe('2026-11-16');
  });
  it('devuelve los 7 días desde el lunes', () => {
    expect(diasDeSemana('2026-11-30')).toEqual([
      '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06',
    ]);
  });
});
