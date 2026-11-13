import { describe, expect, it } from 'vitest';
import { postprocesarLLM } from './postprocesarLLM';

const base = {
  confianza: 0.9, moneda: 'USD', precio_min: null, precio_max: 180000, tipos: ['casa'],
  zonas: ['City Bell'], zonas_cercanas: ['Gonnet'], dorm_min: 2, dorm_max: null, banos_min: 1,
  m2_min: 100, m2_max: null, lote_m2_min: null, amenities: ['cochera'], formas_pago: ['apto_credito'], requisitos: ['luminoso'],
};

describe('postprocesarLLM', () => {
  it('marca v=1 y fuente=llm', () => {
    const r = postprocesarLLM(base, 'busqueda', 'USD');
    expect(r.v).toBe(1);
    expect(r.fuente).toBe('llm');
    expect(r.zonas_cercanas).toEqual(['Gonnet']);
    expect(r.precio_max).toBe(180000);
  });

  it('aplica moneda_default cuando hay precio y moneda es null', () => {
    expect(postprocesarLLM({ ...base, moneda: null }, 'busqueda', 'USD').moneda).toBe('USD');
    expect(postprocesarLLM({ ...base, moneda: null }, 'busqueda', 'ARS').moneda).toBe('ARS');
  });

  it('deja moneda null si no hay precio', () => {
    expect(postprocesarLLM({ ...base, moneda: null, precio_max: null }, 'busqueda', 'USD').moneda).toBeNull();
  });

  it('descarta enums inválidos y duplica nada', () => {
    const r = postprocesarLLM({ ...base, tipos: ['casa', 'castillo', 'casa'], amenities: ['pileta', 'helipuerto'], formas_pago: ['permuta', 'trueque'] }, 'busqueda', 'USD');
    expect(r.tipos).toEqual(['casa']);
    expect(r.amenities).toEqual(['pileta']);
    expect(r.formas_pago).toEqual(['permuta']);
  });

  it('números negativos/no finitos pasan a null', () => {
    const r = postprocesarLLM({ ...base, precio_max: -5, m2_min: NaN, dorm_min: '3' }, 'busqueda', 'USD');
    expect(r.precio_max).toBeNull();
    expect(r.m2_min).toBeNull();
    expect(r.dorm_min).toBeNull();
  });

  it('dorm 0 (monoambiente) es válido', () => {
    expect(postprocesarLLM({ ...base, dorm_min: 0 }, 'busqueda', 'USD').dorm_min).toBe(0);
  });

  it('propiedad: min=max, un solo tipo, sin zonas_cercanas', () => {
    const r = postprocesarLLM({ ...base, tipos: ['casa', 'ph'], precio_min: null, precio_max: 170000, dorm_min: null, dorm_max: 3, m2_min: null, m2_max: 120 }, 'propiedad', 'USD');
    expect(r.precio_min).toBe(170000);
    expect(r.precio_max).toBe(170000);
    expect(r.dorm_min).toBe(3);
    expect(r.dorm_max).toBe(3);
    expect(r.m2_min).toBe(120);
    expect(r.m2_max).toBe(120);
    expect(r.tipos).toEqual(['casa']);
    expect(r.zonas_cercanas).toEqual([]);
  });

  it('confianza se acota a [0,1] y por defecto 0.5', () => {
    expect(postprocesarLLM({ ...base, confianza: 7 }, 'busqueda', 'USD').confianza).toBe(1);
    expect(postprocesarLLM({ ...base, confianza: 'x' }, 'busqueda', 'USD').confianza).toBe(0.5);
  });

  it('strings se recortan, sin vacíos ni duplicados', () => {
    const r = postprocesarLLM({ ...base, zonas: [' City Bell ', '', 'City Bell'], requisitos: [' a ', 5] }, 'busqueda', 'USD');
    expect(r.zonas).toEqual(['City Bell']);
    expect(r.requisitos).toEqual(['a']);
  });

  it('entrada no objeto lanza error', () => {
    expect(() => postprocesarLLM(null, 'busqueda', 'USD')).toThrow();
    expect(() => postprocesarLLM('x', 'busqueda', 'USD')).toThrow();
  });
});
