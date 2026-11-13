import { describe, expect, it } from 'vitest';
import { validarConfig } from './validarConfig';
import { DEFAULT_RUEDA_CONFIG } from '@/app/utils/ruedaScoring';

const pesos = (over: Record<string, number> = {}) => ({ ...DEFAULT_RUEDA_CONFIG.pesos, ...over });

describe('validarConfig', () => {
  it('acepta un cuerpo vacío y devuelve la base', () => {
    const r = validarConfig({});
    expect(r).toEqual({ ok: true, config: DEFAULT_RUEDA_CONFIG });
  });

  it('rechaza cuerpo no objeto', () => {
    expect(validarConfig(null).ok).toBe(false);
    expect(validarConfig('x').ok).toBe(false);
    expect(validarConfig([1]).ok).toBe(false);
  });

  it('rechaza pesos todos en 0 (S6.3)', () => {
    const r = validarConfig({ pesos: { precio: 0, zona: 0, tipo: 0, dormitorios: 0, m2: 0, caracteristicas: 0, forma_pago: 0, necesidades: 0 } });
    expect(r.ok).toBe(false);
  });

  it('rechaza peso negativo o no numérico', () => {
    expect(validarConfig({ pesos: pesos({ precio: -1 }) }).ok).toBe(false);
    expect(validarConfig({ pesos: pesos({ precio: 'x' as any }) }).ok).toBe(false);
  });

  it('acepta pesos con al menos uno > 0 (aunque no sumen 100)', () => {
    const r = validarConfig({ pesos: { precio: 40, zona: 0, tipo: 0, dormitorios: 0, m2: 0, caracteristicas: 0, forma_pago: 0, necesidades: 0 } });
    expect(r.ok).toBe(true);
  });

  it('fusiona pesos parciales sobre la base', () => {
    const r = validarConfig({ pesos: { precio: 40 } });
    expect(r.ok && r.config.pesos).toEqual({ ...DEFAULT_RUEDA_CONFIG.pesos, precio: 40 });
  });

  it('tolerancia en [0,1]', () => {
    expect(validarConfig({ precio_tolerancia: 0 }).ok).toBe(true);
    expect(validarConfig({ precio_tolerancia: 1 }).ok).toBe(true);
    expect(validarConfig({ precio_tolerancia: 1.01 }).ok).toBe(false);
    expect(validarConfig({ precio_tolerancia: -0.1 }).ok).toBe(false);
  });

  it('umbral en [0,100]', () => {
    expect(validarConfig({ umbral: 0 }).ok).toBe(true);
    expect(validarConfig({ umbral: 100 }).ok).toBe(true);
    expect(validarConfig({ umbral: 101 }).ok).toBe(false);
    expect(validarConfig({ umbral: -1 }).ok).toBe(false);
    expect(validarConfig({ umbral: NaN }).ok).toBe(false);
  });

  it('multiplicador y crédito de zona en [0,1]; peso mínimo >= 0', () => {
    expect(validarConfig({ zona_mismatch_multiplicador: 2 }).ok).toBe(false);
    expect(validarConfig({ zona_cercana_credito: -1 }).ok).toBe(false);
    expect(validarConfig({ peso_minimo_evaluado: -5 }).ok).toBe(false);
  });

  it('booleans, moneda y ars_por_usd', () => {
    expect(validarConfig({ tipo_eliminatorio: 'si' }).ok).toBe(false);
    expect(validarConfig({ precio_fuera_tolerancia_elimina: false }).ok).toBe(true);
    expect(validarConfig({ moneda_default: 'EUR' }).ok).toBe(false);
    expect(validarConfig({ ars_por_usd: null }).ok).toBe(true);
    expect(validarConfig({ ars_por_usd: 0 }).ok).toBe(false);
    expect(validarConfig({ ars_por_usd: 1200 }).ok).toBe(true);
  });

  it('acumula todos los errores y los reporta en español', () => {
    const r = validarConfig({ umbral: 500, precio_tolerancia: 5 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores).toHaveLength(2);
  });

  it('usa la base provista para campos ausentes', () => {
    const base = { ...DEFAULT_RUEDA_CONFIG, umbral: 70 };
    const r = validarConfig({ precio_tolerancia: 0.2 }, base);
    expect(r.ok && r.config.umbral).toBe(70);
  });
});

describe('validarConfig zonas', () => {
  it('acepta una tabla válida', () => {
    const zonas = [{ nombre: 'A', alias: ['a'], vecinas: ['B'] }, { nombre: 'B', alias: [], vecinas: [] }];
    const r = validarConfig({ zonas });
    expect(r.ok && r.config.zonas).toEqual(zonas);
  });
  it('rechaza forma inválida', () => {
    expect(validarConfig({ zonas: 'x' }).ok).toBe(false);
    expect(validarConfig({ zonas: [{ nombre: '', alias: [], vecinas: [] }] }).ok).toBe(false);
    expect(validarConfig({ zonas: [{ nombre: 'A', alias: [1], vecinas: [] }] }).ok).toBe(false);
    expect(validarConfig({ zonas: [{ nombre: 'A', alias: [], vecinas: 'B' }] }).ok).toBe(false);
  });
});
