import { describe, it, expect } from 'vitest';
import {
  scoreTono,
  motivoIcono,
  accionesDisponibles,
  ordenarMatches,
  matchEsNuevo,
  resumenBadge,
  agruparPorBusqueda,
  etiquetaResumenRecalculo,
} from './ruedaUi';
import type { RuedaMatch } from '../types';

const m = (over: Partial<RuedaMatch>): RuedaMatch =>
  ({
    id: 1, busqueda_id: 1, propiedad_id: 1, score: 70, motivos: [], estado: 'nuevo',
    estado_origen: 'sistema', bajo_umbral: false, notas: null,
    first_seen_at: '2026-01-01T00:00:00Z', estado_updated_at: '', score_updated_at: '', ...over,
  }) as RuedaMatch;

describe('scoreTono', () => {
  it('verde desde 80', () => { expect(scoreTono(80)).toBe('verde'); expect(scoreTono(100)).toBe('verde'); });
  it('ambar entre 65 y 79', () => { expect(scoreTono(65)).toBe('ambar'); expect(scoreTono(79)).toBe('ambar'); });
  it('gris por debajo de 65', () => { expect(scoreTono(64)).toBe('gris'); expect(scoreTono(0)).toBe('gris'); });
});

describe('motivoIcono', () => {
  it('mapea cada estado', () => {
    expect(motivoIcono('ok')).toBe('check');
    expect(motivoIcono('parcial')).toBe('alerta');
    expect(motivoIcono('falla')).toBe('x');
    expect(motivoIcono('sin_dato')).toBe('interrogacion');
  });
});

describe('accionesDisponibles', () => {
  it('ofrece los cuatro estados de acción y no restaurar si no es descartado', () => {
    const a = accionesDisponibles('nuevo');
    expect(a.estados).toEqual(['contactado', 'pendiente', 'interesado', 'descartado']);
    expect(a.restaurar).toBe(false);
  });
  it('oculta el estado actual', () => {
    expect(accionesDisponibles('contactado').estados).not.toContain('contactado');
  });
  it('descartado solo ofrece restaurar', () => {
    const a = accionesDisponibles('descartado');
    expect(a.estados).toEqual([]);
    expect(a.restaurar).toBe(true);
  });
});

describe('ordenarMatches', () => {
  it('score desc y luego first_seen_at desc, sin mutar', () => {
    const arr = [
      m({ id: 1, score: 70, first_seen_at: '2026-01-01T00:00:00Z' }),
      m({ id: 2, score: 90, first_seen_at: '2026-01-01T00:00:00Z' }),
      m({ id: 3, score: 70, first_seen_at: '2026-02-01T00:00:00Z' }),
    ];
    expect(ordenarMatches(arr).map((x) => x.id)).toEqual([2, 3, 1]);
    expect(arr.map((x) => x.id)).toEqual([1, 2, 3]);
  });
});

describe('matchEsNuevo / resumenBadge', () => {
  it('detecta nuevo', () => {
    expect(matchEsNuevo(m({ estado: 'nuevo' }))).toBe(true);
    expect(matchEsNuevo(m({ estado: 'revisado' }))).toBe(false);
  });
  it('resumen: mejor score, total y nuevos', () => {
    const r = resumenBadge([m({ score: 60, estado: 'nuevo' }), m({ id: 2, score: 85, estado: 'revisado' })]);
    expect(r).toEqual({ total: 2, mejor: 85, nuevos: 1 });
  });
  it('resumen vacío', () => {
    expect(resumenBadge([])).toEqual({ total: 0, mejor: 0, nuevos: 0 });
  });
});

describe('agruparPorBusqueda', () => {
  it('agrupa por busqueda_id preservando el orden', () => {
    const g = agruparPorBusqueda([m({ id: 1, busqueda_id: 5 }), m({ id: 2, busqueda_id: 6 }), m({ id: 3, busqueda_id: 5 })]);
    expect(g.get(5)!.map((x) => x.id)).toEqual([1, 3]);
    expect(g.get(6)!.map((x) => x.id)).toEqual([2]);
  });
});

describe('etiquetaResumenRecalculo', () => {
  it('formatea el resumen', () => {
    expect(etiquetaResumenRecalculo({ creados: 3, actualizados: 2, ocultos: 1, eliminados: 0 }))
      .toBe('3 creados · 2 actualizados · 1 oculto · 0 eliminados');
  });
  it('singulares', () => {
    expect(etiquetaResumenRecalculo({ creados: 1, actualizados: 1, ocultos: 2, eliminados: 1 }))
      .toBe('1 creado · 1 actualizado · 2 ocultos · 1 eliminado');
  });
});

import { parseNumeroForm, configAForm, formAConfig } from './ruedaUi';
import { DEFAULT_RUEDA_CONFIG } from './ruedaScoring';

describe('parseNumeroForm', () => {
  it('acepta coma decimal y punto', () => {
    expect(parseNumeroForm('0,1')).toBe(0.1);
    expect(parseNumeroForm(' 25 ')).toBe(25);
    expect(parseNumeroForm('0.6')).toBe(0.6);
  });
  it('vacío es null y basura es NaN', () => {
    expect(parseNumeroForm('')).toBeNull();
    expect(parseNumeroForm('   ')).toBeNull();
    expect(Number.isNaN(parseNumeroForm('abc') as number)).toBe(true);
  });
});

describe('configAForm / formAConfig', () => {
  it('roundtrip de la config por defecto', () => {
    expect(formAConfig(configAForm(DEFAULT_RUEDA_CONFIG))).toEqual(DEFAULT_RUEDA_CONFIG);
  });
  it('tolerancia y multiplicadores se muestran en % y vuelven a fracción', () => {
    const f = configAForm(DEFAULT_RUEDA_CONFIG);
    expect(f.precio_tolerancia).toBe('10');
    f.precio_tolerancia = '15';
    expect(formAConfig(f).precio_tolerancia).toBeCloseTo(0.15);
  });
  it('ars_por_usd vacío es null; campo inválido queda NaN para que validarConfig lo rechace', () => {
    const f = configAForm(DEFAULT_RUEDA_CONFIG);
    f.ars_por_usd = '';
    expect(formAConfig(f).ars_por_usd).toBeNull();
    f.umbral = 'x';
    expect(Number.isNaN(formAConfig(f).umbral as number)).toBe(true);
  });
});

describe('config form: zonas', () => {
  it('el form lleva zonas como texto y se convierte de vuelta', () => {
    const f = configAForm(DEFAULT_RUEDA_CONFIG);
    expect(typeof f.zonas).toBe('string');
    expect(formAConfig({ ...f, zonas: 'A | a | B\nB' }).zonas).toEqual([
      { nombre: 'A', alias: ['a'], vecinas: ['B'] },
      { nombre: 'B', alias: [], vecinas: [] },
    ]);
  });
});
