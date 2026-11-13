import { describe, expect, it } from 'vitest';
import { transicionarEstado } from './transicionEstado';

const sis = (estado: any) => ({ estado, estado_origen: 'sistema' as const });
const usr = (estado: any) => ({ estado, estado_origen: 'usuario' as const });

describe('transicionarEstado', () => {
  it('apertura: nuevo -> revisado manteniendo estado_origen', () => {
    const r = transicionarEstado(sis('nuevo'), { via: 'apertura' });
    expect(r).toEqual({ ok: true, cambios: { estado: 'revisado' } });
    expect(r.ok && r.cambios).not.toHaveProperty('estado_origen');
  });

  it('apertura sobre estado distinto de nuevo es no-op', () => {
    for (const e of ['revisado', 'contactado', 'pendiente', 'interesado', 'descartado']) {
      expect(transicionarEstado(usr(e), { via: 'apertura' })).toEqual({ ok: true, cambios: {} });
    }
  });

  it('apertura no acepta estado explícito', () => {
    expect(transicionarEstado(sis('nuevo'), { via: 'apertura', estado: 'interesado' }).ok).toBe(false);
  });

  it('acción de usuario setea estado y estado_origen=usuario', () => {
    expect(transicionarEstado(sis('nuevo'), { estado: 'contactado' })).toEqual({
      ok: true, cambios: { estado: 'contactado', estado_origen: 'usuario' },
    });
    expect(transicionarEstado(usr('contactado'), { estado: 'descartado' })).toEqual({
      ok: true, cambios: { estado: 'descartado', estado_origen: 'usuario' },
    });
  });

  it('acepta los 6 estados y rechaza inválidos', () => {
    for (const e of ['nuevo', 'revisado', 'contactado', 'pendiente', 'interesado', 'descartado']) {
      expect(transicionarEstado(sis('nuevo'), { estado: e }).ok).toBe(true);
    }
    expect(transicionarEstado(sis('nuevo'), { estado: 'otro' }).ok).toBe(false);
    expect(transicionarEstado(sis('nuevo'), { estado: 5 as any }).ok).toBe(false);
  });

  it('restaurar: descartado -> revisado con usuario', () => {
    expect(transicionarEstado(usr('descartado'), { via: 'restaurar' })).toEqual({
      ok: true, cambios: { estado: 'revisado', estado_origen: 'usuario' },
    });
  });

  it('restaurar sobre un no descartado es error', () => {
    expect(transicionarEstado(usr('interesado'), { via: 'restaurar' }).ok).toBe(false);
  });

  it('via desconocida es error', () => {
    expect(transicionarEstado(sis('nuevo'), { via: 'magia' as any }).ok).toBe(false);
  });

  it('solo notas: no toca estado', () => {
    expect(transicionarEstado(sis('nuevo'), { notas: 'hola' })).toEqual({ ok: true, cambios: { notas: 'hola' } });
    expect(transicionarEstado(sis('nuevo'), { notas: null })).toEqual({ ok: true, cambios: { notas: null } });
  });

  it('notas inválidas (no string) son error', () => {
    expect(transicionarEstado(sis('nuevo'), { notas: 5 as any }).ok).toBe(false);
  });

  it('pedido vacío es error', () => {
    expect(transicionarEstado(sis('nuevo'), {}).ok).toBe(false);
  });

  it('estado + notas combinados', () => {
    expect(transicionarEstado(sis('nuevo'), { estado: 'pendiente', notas: 'llamar' })).toEqual({
      ok: true, cambios: { estado: 'pendiente', estado_origen: 'usuario', notas: 'llamar' },
    });
  });
});
