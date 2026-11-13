import { describe, expect, it } from 'vitest';
import { planificarSync, type FilaExistente, type ParEvaluado } from './syncPlan';
import type { Motivo } from '@/app/types';

const m = (texto: string): Motivo => ({ criterio: 'precio', estado: 'ok', texto });

const par = (b: number, p: number, score: number, persistible = true, motivos: Motivo[] = [m('a')]): ParEvaluado => ({
  busqueda_id: b, propiedad_id: p, score, motivos, persistible,
});

const fila = (over: Partial<FilaExistente> & { id: number }): FilaExistente => ({
  busqueda_id: 1, propiedad_id: 1, score: 80, motivos: [m('a')],
  estado: 'nuevo', estado_origen: 'sistema', bajo_umbral: false, ...over,
});

describe('planificarSync', () => {
  it('par nuevo persistible -> insertar', () => {
    const plan = planificarSync([], [par(1, 1, 94)]);
    expect(plan.insertar).toEqual([{ busqueda_id: 1, propiedad_id: 1, score: 94, motivos: [m('a')] }]);
    expect(plan.actualizar).toEqual([]);
    expect(plan.eliminar).toEqual([]);
  });

  it('par nuevo no persistible -> nada', () => {
    const plan = planificarSync([], [par(1, 1, 30, false)]);
    expect(plan.insertar).toEqual([]);
    expect(plan.sinCambios).toBe(0);
  });

  it('existente con mismo score y motivos -> sin_cambios', () => {
    const plan = planificarSync([fila({ id: 7 })], [par(1, 1, 80)]);
    expect(plan.sinCambios).toBe(1);
    expect(plan.actualizar).toEqual([]);
    expect(plan.insertar).toEqual([]);
  });

  it('existente contactado con score distinto -> actualiza score/motivos, sin tocar estado', () => {
    const plan = planificarSync(
      [fila({ id: 7, estado: 'contactado', estado_origen: 'usuario' })],
      [par(1, 1, 88, true, [m('b')])],
    );
    expect(plan.actualizar).toEqual([{ id: 7, score: 88, motivos: [m('b')], bajo_umbral: false, scoreCambio: true }]);
    expect(plan.actualizar[0]).not.toHaveProperty('estado');
  });

  it('solo cambian motivos -> actualizar con scoreCambio', () => {
    const plan = planificarSync([fila({ id: 7 })], [par(1, 1, 80, true, [m('otro')])]);
    expect(plan.actualizar[0].scoreCambio).toBe(true);
  });

  it('descartado nunca se toca (ni con mejor score ni bajo umbral)', () => {
    const d = fila({ id: 7, estado: 'descartado', estado_origen: 'usuario' });
    const a = planificarSync([d], [par(1, 1, 99)]);
    const b = planificarSync([d], [par(1, 1, 10, false)]);
    for (const plan of [a, b]) {
      expect(plan.actualizar).toEqual([]);
      expect(plan.eliminar).toEqual([]);
      expect(plan.ocultar).toEqual([]);
      expect(plan.sinCambios).toBe(1);
    }
  });

  it('bajo umbral y origen sistema -> eliminar', () => {
    const plan = planificarSync([fila({ id: 7, estado: 'revisado' })], [par(1, 1, 40, false)]);
    expect(plan.eliminar).toEqual([7]);
  });

  it('bajo umbral y origen usuario -> ocultar (bajo_umbral=true) con score/motivos nuevos', () => {
    const plan = planificarSync(
      [fila({ id: 7, estado: 'interesado', estado_origen: 'usuario' })],
      [par(1, 1, 40, false, [m('x')])],
    );
    expect(plan.ocultar).toEqual([{ id: 7, score: 40, motivos: [m('x')] }]);
    expect(plan.eliminar).toEqual([]);
  });

  it('usuario ya oculto y sigue bajo umbral sin cambios -> sin_cambios', () => {
    const plan = planificarSync(
      [fila({ id: 7, estado: 'interesado', estado_origen: 'usuario', bajo_umbral: true, score: 40, motivos: [m('x')] })],
      [par(1, 1, 40, false, [m('x')])],
    );
    expect(plan.sinCambios).toBe(1);
    expect(plan.ocultar).toEqual([]);
  });

  it('usuario ya oculto con score distinto -> actualizar manteniendo bajo_umbral=true', () => {
    const plan = planificarSync(
      [fila({ id: 7, estado: 'interesado', estado_origen: 'usuario', bajo_umbral: true, score: 40 })],
      [par(1, 1, 45, false)],
    );
    expect(plan.actualizar).toEqual([{ id: 7, score: 45, motivos: [m('a')], bajo_umbral: true, scoreCambio: true }]);
  });

  it('par oculto que se recupera -> actualizar bajo_umbral=false', () => {
    const plan = planificarSync(
      [fila({ id: 7, estado: 'interesado', estado_origen: 'usuario', bajo_umbral: true, score: 80 })],
      [par(1, 1, 80)],
    );
    expect(plan.actualizar).toEqual([{ id: 7, score: 80, motivos: [m('a')], bajo_umbral: false, scoreCambio: false }]);
  });

  it('fila existente que no fue evaluada se deja intacta', () => {
    const plan = planificarSync([fila({ id: 7, propiedad_id: 99 })], [par(1, 1, 80)]);
    expect(plan.sinCambios).toBe(0);
    expect(plan.eliminar).toEqual([]);
    expect(plan.insertar).toHaveLength(1);
  });

  it('es idempotente: aplicar el resultado y re-planificar da todo sin_cambios', () => {
    const evaluados = [par(1, 1, 90), par(1, 2, 70), par(2, 1, 20, false)];
    const p1 = planificarSync([], evaluados);
    const existentes: FilaExistente[] = p1.insertar.map((r, i) => fila({ ...r, id: i + 1 }));
    const p2 = planificarSync(existentes, evaluados);
    expect(p2.insertar).toEqual([]);
    expect(p2.actualizar).toEqual([]);
    expect(p2.sinCambios).toBe(2);
  });

  it('resumen cuenta cada categoría', () => {
    const plan = planificarSync(
      [
        fila({ id: 1, propiedad_id: 1 }),
        fila({ id: 2, propiedad_id: 2 }),
        fila({ id: 3, propiedad_id: 3, estado_origen: 'usuario', estado: 'pendiente' }),
      ],
      [par(1, 1, 80), par(1, 2, 10, false), par(1, 3, 10, false), par(1, 4, 95)],
    );
    expect(plan.resumen).toEqual({ creados: 1, actualizados: 0, ocultos: 1, eliminados: 1, sin_cambios: 1 });
  });
});
