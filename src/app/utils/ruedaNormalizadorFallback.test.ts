import { describe, it, expect } from 'vitest';
import { buildHashInput, parseNumber, parserFallback } from './ruedaNormalizadorFallback';

// Filas con las formas reales de producción (texto libre, valores sucios).
const filaPropiedad = (over: Record<string, string | number | null | undefined> = {}) => ({
  tipo_de_propiedad: 'Casa',
  direccion: 'Calle 13 1234',
  zona: 'City Bell',
  valor: '330.000 USD ',
  dormitorios: '3',
  banos: '2',
  patio_parque: 'SI',
  garage: 'SI / 1',
  mts_const: '120',
  lote: '300',
  piso: '-',
  columna_1: '',
  apto_banco: 'SI',
  notas: '',
  link: 'https://remax.com.ar/x',
  '.': 'basura',
  lat: -34.9,
  lng: -57.9,
  alternativa_menor_1: 'USD 90.000 casa Tolosa https://x',
  alterniva_menor_4: 'ruido',
  alternativa_mayor: 'USD 900.000 casa Palermo',
  ...over,
});

describe('parseNumber', () => {
  it('miles con punto estilo es-AR: "330.000" -> 330000', () => {
    expect(parseNumber('330.000 USD ')).toBe(330000);
    expect(parseNumber('USD 1.090.000')).toBe(1090000);
  });

  it('número plano y decimales', () => {
    expect(parseNumber('180000')).toBe(180000);
    expect(parseNumber('2,5')).toBe(2.5);
    expect(parseNumber('120.5')).toBe(120.5);
    expect(parseNumber('1.250,75')).toBe(1250.75);
  });

  it('valores basura -> null sin error', () => {
    expect(parseNumber('-')).toBeNull();
    expect(parseNumber('NO.')).toBeNull();
    expect(parseNumber('')).toBeNull();
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
  });
});

describe('parserFallback — precio y moneda', () => {
  it("S1.1: '330.000 USD ' (propiedad) -> 330000 USD, min=max", () => {
    const n = parserFallback(filaPropiedad(), 'propiedad');
    expect(n.precio_max).toBe(330000);
    expect(n.precio_min).toBe(330000);
    expect(n.moneda).toBe('USD');
  });

  it("'USD 1.090.000' -> 1090000 USD", () => {
    const n = parserFallback(filaPropiedad({ valor: 'USD 1.090.000' }), 'propiedad');
    expect(n.precio_max).toBe(1090000);
    expect(n.moneda).toBe('USD');
  });

  it("S1.2: '180000' sin moneda -> monto 180000 y moneda null (el default lo aplica el caller)", () => {
    const n = parserFallback(filaPropiedad({ valor: '180000' }), 'busqueda');
    expect(n.precio_max).toBe(180000);
    expect(n.moneda).toBeNull();
  });

  it('búsqueda: valor es el máximo, precio_min queda null', () => {
    const n = parserFallback(filaPropiedad({ valor: '180000' }), 'busqueda');
    expect(n.precio_min).toBeNull();
  });

  it('detecta variantes USD (U$S, US$, dólares) y ARS ($, pesos, ARS)', () => {
    expect(parserFallback(filaPropiedad({ valor: 'U$S 150.000' }), 'propiedad').moneda).toBe('USD');
    expect(parserFallback(filaPropiedad({ valor: 'US$ 150.000' }), 'propiedad').moneda).toBe('USD');
    expect(parserFallback(filaPropiedad({ valor: '150.000 dólares' }), 'propiedad').moneda).toBe('USD');
    expect(parserFallback(filaPropiedad({ valor: '$ 90.000.000' }), 'propiedad').moneda).toBe('ARS');
    expect(parserFallback(filaPropiedad({ valor: '90.000.000 pesos' }), 'propiedad').moneda).toBe('ARS');
    expect(parserFallback(filaPropiedad({ valor: 'ARS 90000000' }), 'propiedad').moneda).toBe('ARS');
  });
});

describe('parserFallback — dormitorios, baños, m2', () => {
  it("'MONOAMBIENTE' -> 0", () => {
    const n = parserFallback(filaPropiedad({ dormitorios: 'MONOAMBIENTE' }), 'propiedad');
    expect(n.dorm_min).toBe(0);
    expect(n.dorm_max).toBe(0);
  });

  it("'2' -> propiedad min=max=2; búsqueda min=2, max null", () => {
    const p = parserFallback(filaPropiedad({ dormitorios: '2' }), 'propiedad');
    expect([p.dorm_min, p.dorm_max]).toEqual([2, 2]);
    const b = parserFallback(filaPropiedad({ dormitorios: '2' }), 'busqueda');
    expect([b.dorm_min, b.dorm_max]).toEqual([2, null]);
  });

  it('banos, mts_const y lote se parsean', () => {
    const n = parserFallback(filaPropiedad({ banos: '2', mts_const: '120 m2', lote: '300' }), 'propiedad');
    expect(n.banos_min).toBe(2);
    expect(n.m2_min).toBe(120);
    expect(n.m2_max).toBe(120);
    expect(n.lote_m2_min).toBe(300);
  });

  it("'-' y '' -> null sin error (S1.4)", () => {
    const n = parserFallback(filaPropiedad({ dormitorios: '-', banos: '', mts_const: 'NO.', lote: '-' }), 'propiedad');
    expect(n.dorm_min).toBeNull();
    expect(n.banos_min).toBeNull();
    expect(n.m2_min).toBeNull();
    expect(n.lote_m2_min).toBeNull();
  });
});

describe('parserFallback — amenities y forma de pago', () => {
  it("garage 'SI / 1' -> cochera (S1.4)", () => {
    const n = parserFallback(filaPropiedad({ garage: 'SI / 1', patio_parque: '-' }), 'propiedad');
    expect(n.amenities).toContain('cochera');
  });

  it("garage '2' -> cochera; 'NO.' y '-' -> sin cochera", () => {
    expect(parserFallback(filaPropiedad({ garage: '2', patio_parque: '-' }), 'propiedad').amenities).toEqual(['cochera']);
    expect(parserFallback(filaPropiedad({ garage: 'NO.', patio_parque: '-' }), 'propiedad').amenities).toEqual([]);
    expect(parserFallback(filaPropiedad({ garage: '-', patio_parque: '-' }), 'propiedad').amenities).toEqual([]);
  });

  it('patio_parque afirmativo -> patio; "jardín" -> jardin', () => {
    expect(parserFallback(filaPropiedad({ garage: '-', patio_parque: 'SI' }), 'propiedad').amenities).toEqual(['patio']);
    expect(parserFallback(filaPropiedad({ garage: '-', patio_parque: 'jardín grande' }), 'propiedad').amenities).toEqual(['jardin']);
    expect(parserFallback(filaPropiedad({ garage: '-', patio_parque: 'NO.' }), 'propiedad').amenities).toEqual([]);
  });

  it('keywords en notas (pileta, quincho) suman; "sin pileta" no', () => {
    const con = parserFallback(filaPropiedad({ garage: '-', patio_parque: '-', notas: 'Casa con pileta y quincho' }), 'propiedad');
    expect(con.amenities).toEqual(expect.arrayContaining(['pileta', 'quincho']));
    const sin = parserFallback(filaPropiedad({ garage: '-', patio_parque: '-', notas: 'sin pileta, con quincho' }), 'propiedad');
    expect(sin.amenities).toEqual(['quincho']);
  });

  it("apto_banco 'SI' -> apto_credito; 'NO.' -> nada", () => {
    expect(parserFallback(filaPropiedad({ apto_banco: 'SI' }), 'propiedad').formas_pago).toEqual(['apto_credito']);
    expect(parserFallback(filaPropiedad({ apto_banco: 'NO.' }), 'propiedad').formas_pago).toEqual([]);
  });
});

describe('parserFallback — tipo y zona', () => {
  it.each([
    ['Casa', ['casa']],
    ['Departamento 2 amb', ['departamento']],
    ['depto', ['departamento']],
    ['PH', ['ph']],
    ['Dúplex', ['duplex']],
    ['Terreno', ['terreno']],
    ['Casa / PH', ['casa', 'ph']],
    ['Galpón', ['galpon']],
  ])('tipo %s -> %j', (txt, esperado) => {
    expect(parserFallback(filaPropiedad({ tipo_de_propiedad: txt }), 'busqueda').tipos).toEqual(esperado);
  });

  it('tipo desconocido o vacío -> [] (neutral, nunca "otro")', () => {
    expect(parserFallback(filaPropiedad({ tipo_de_propiedad: 'algo raro' }), 'busqueda').tipos).toEqual([]);
    expect(parserFallback(filaPropiedad({ tipo_de_propiedad: '-' }), 'busqueda').tipos).toEqual([]);
  });

  it('zona: separa por coma/barra y descarta placeholders', () => {
    expect(parserFallback(filaPropiedad({ zona: 'City Bell, Gonnet' }), 'busqueda').zonas).toEqual(['City Bell', 'Gonnet']);
    expect(parserFallback(filaPropiedad({ zona: 'NO.' }), 'busqueda').zonas).toEqual([]);
    expect(parserFallback(filaPropiedad({ zona: '' }), 'busqueda').zonas).toEqual([]);
  });
});

describe('parserFallback — metadatos', () => {
  it('v=1, fuente parser, confianza 0.3, zonas_cercanas vacías', () => {
    const n = parserFallback(filaPropiedad(), 'propiedad');
    expect(n.v).toBe(1);
    expect(n.fuente).toBe('parser');
    expect(n.confianza).toBe(0.3);
    expect(n.zonas_cercanas).toEqual([]);
  });

  it('fila completamente basura no lanza y devuelve todo null/vacío (S1.4, R1.6)', () => {
    const n = parserFallback(
      { tipo_de_propiedad: '-', zona: 'NO.', valor: '-', dormitorios: 'NO.', banos: '', garage: '-', apto_banco: 'NO.' },
      'propiedad',
    );
    expect(n.precio_max).toBeNull();
    expect(n.dorm_min).toBeNull();
    expect(n.amenities).toEqual([]);
    expect(n.tipos).toEqual([]);
    expect(n.zonas).toEqual([]);
    expect(n.formas_pago).toEqual([]);
  });

  it('R1.7: alternativa_*, link, "." y lat/lng no alteran el resultado', () => {
    const limpia = { ...filaPropiedad() };
    const sucia = filaPropiedad({
      alternativa_menor_1: 'USD 1 pileta quincho casa PH Tolosa',
      alternativa_mayor_5: 'USD 9.999.999 pileta',
      link: 'https://otro',
      '.': 'dormitorios 9',
    });
    expect(parserFallback(sucia, 'propiedad')).toEqual(parserFallback(limpia, 'propiedad'));
  });
});

describe('buildHashInput', () => {
  it('es estable para la misma entrada, sin importar el orden de claves', () => {
    const a = filaPropiedad();
    const reordenada = Object.fromEntries(Object.entries(a).reverse());
    expect(buildHashInput(a)).toBe(buildHashInput(a));
    expect(buildHashInput(reordenada)).toBe(buildHashInput(a));
  });

  it('S1.3: cambia cuando cambia un campo usado (valor, notas, dormitorios)', () => {
    const base = buildHashInput(filaPropiedad());
    expect(buildHashInput(filaPropiedad({ valor: '340.000 USD' }))).not.toBe(base);
    expect(buildHashInput(filaPropiedad({ notas: 'nueva nota' }))).not.toBe(base);
    expect(buildHashInput(filaPropiedad({ dormitorios: 'MONOAMBIENTE' }))).not.toBe(base);
  });

  it('R1.7: NO cambia con alternativa_*, alterniva_menor_4, link, "." ni lat/lng', () => {
    const base = buildHashInput(filaPropiedad());
    const cambiada = filaPropiedad({
      alternativa_menor_1: 'otra', alternativa_menor_5: 'x', alterniva_menor_4: 'y',
      alternativa_mayor_3: 'z', link: 'https://nuevo', '.': 'otro', lat: 1, lng: 2,
    });
    expect(buildHashInput(cambiada)).toBe(base);
  });

  it('null, undefined, "" y espacios finales son equivalentes', () => {
    const a = buildHashInput(filaPropiedad({ notas: null, columna_1: undefined, valor: '330.000 USD ' }));
    const b = buildHashInput(filaPropiedad({ notas: '', columna_1: '', valor: '330.000 USD' }));
    expect(a).toBe(b);
  });

  it('incluye los 14 campos en orden fijo (JSON de array)', () => {
    const parsed = JSON.parse(buildHashInput(filaPropiedad()));
    expect(parsed).toHaveLength(14);
    expect(parsed[0]).toBe('Casa');
    expect(parsed[3]).toBe('330.000 USD');
    expect(parsed[13]).toBe('');
  });
});
