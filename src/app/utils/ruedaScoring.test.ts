import { describe, it, expect } from 'vitest';
import type { RuedaNormalizado } from '@/app/types';
import { DEFAULT_RUEDA_CONFIG, mergeConfig, scorePair } from './ruedaScoring';

// ───────────── Fixtures (formas reales ya normalizadas) ─────────────

const norm = (over: Partial<RuedaNormalizado> = {}): RuedaNormalizado => ({
  v: 1,
  fuente: 'llm',
  confianza: 0.9,
  moneda: 'USD',
  precio_min: null,
  precio_max: null,
  tipos: [],
  zonas: [],
  zonas_cercanas: [],
  dorm_min: null,
  dorm_max: null,
  banos_min: null,
  m2_min: null,
  m2_max: null,
  lote_m2_min: null,
  amenities: [],
  formas_pago: [],
  requisitos: [],
  ...over,
});

/** Búsqueda: presupuesto máx USD 180.000 ('180000' sin moneda -> USD), 2+ dorm, 100+ m². */
const busqueda = (over: Partial<RuedaNormalizado> = {}) =>
  norm({
    precio_max: 180000,
    tipos: ['casa'],
    zonas: ['City Bell'],
    zonas_cercanas: ['Gonnet'],
    dorm_min: 2,
    m2_min: 100,
    amenities: ['cochera'],
    formas_pago: ['apto_credito'],
    requisitos: ['apto mascotas'],
    ...over,
  });

/** Propiedad que cumple todo (min = max). */
const propiedad = (over: Partial<RuedaNormalizado> = {}) =>
  norm({
    precio_min: 170000,
    precio_max: 170000,
    tipos: ['casa'],
    zonas: ['City Bell'],
    dorm_min: 3,
    dorm_max: 3,
    m2_min: 120,
    m2_max: 120,
    amenities: ['cochera', 'patio'],
    formas_pago: ['apto_credito'],
    requisitos: ['apto mascotas'],
    ...over,
  });

const conPrecio = (usd: number) => propiedad({ precio_min: usd, precio_max: usd });
const motivo = (r: ReturnType<typeof scorePair>, criterio: string) =>
  r.motivos.find((m) => m.criterio === criterio)!;

const cfg = DEFAULT_RUEDA_CONFIG;

// ───────────── Config ─────────────

describe('DEFAULT_RUEDA_CONFIG / mergeConfig', () => {
  it('trae los defaults acordados (incluye reconciliación)', () => {
    expect(cfg.pesos).toEqual({
      precio: 25, zona: 25, tipo: 10, dormitorios: 10,
      m2: 10, caracteristicas: 10, forma_pago: 5, necesidades: 5,
    });
    expect(cfg.precio_tolerancia).toBe(0.1);
    expect(cfg.precio_fuera_tolerancia_elimina).toBe(true);
    expect(cfg.zona_mismatch_multiplicador).toBe(0.7);
    expect(cfg.zona_cercana_credito).toBe(0.6);
    expect(cfg.umbral).toBe(50);
    expect(cfg.peso_minimo_evaluado).toBe(35);
    expect(cfg.moneda_default).toBe('USD');
  });

  it('S6.4: fila inexistente/inválida (null, undefined, string) -> defaults', () => {
    expect(mergeConfig(null)).toEqual(cfg);
    expect(mergeConfig(undefined)).toEqual(cfg);
    expect(mergeConfig('basura')).toEqual(cfg);
  });

  it('mezcla parcial: pesos se combinan por clave y el resto queda en default', () => {
    const m = mergeConfig({ pesos: { precio: 40 }, umbral: 70 });
    expect(m.pesos.precio).toBe(40);
    expect(m.pesos.zona).toBe(25);
    expect(m.umbral).toBe(70);
    expect(m.precio_tolerancia).toBe(0.1);
  });

  it('R6.5: valores inválidos caen al default por clave', () => {
    const m = mergeConfig({
      umbral: 150,
      precio_tolerancia: 'abc',
      zona_cercana_credito: 2,
      pesos: { zona: -5, tipo: 'x', m2: 12 },
    });
    expect(m.umbral).toBe(50);
    expect(m.precio_tolerancia).toBe(0.1);
    expect(m.zona_cercana_credito).toBe(0.6);
    expect(m.pesos.zona).toBe(25);
    expect(m.pesos.tipo).toBe(10);
    expect(m.pesos.m2).toBe(12);
  });

  it('pesos todos en 0 -> vuelve a los pesos default (S6.3 defensivo)', () => {
    const m = mergeConfig({
      pesos: { precio: 0, zona: 0, tipo: 0, dormitorios: 0, m2: 0, caracteristicas: 0, forma_pago: 0, necesidades: 0 },
    });
    expect(m.pesos).toEqual(cfg.pesos);
  });

  it('no muta ni comparte referencias con DEFAULT_RUEDA_CONFIG', () => {
    const m = mergeConfig({});
    m.pesos.precio = 999;
    expect(cfg.pesos.precio).toBe(25);
  });
});

// ───────────── Precio ─────────────

describe('precio', () => {
  it('S2.1: 5% sobre el máximo -> s=0.75, score 94 (93.75 half-up), match', () => {
    const r = scorePair(busqueda(), conPrecio(189000), cfg);
    expect(r.eliminado).toBe(false);
    expect(r.score).toBe(94);
    expect(r.persistible).toBe(true);
    const m = motivo(r, 'precio');
    expect(m.estado).toBe('parcial');
    expect(m.texto).toBe('Precio USD 189.000, 5% sobre el presupuesto (tolerancia 10%)');
  });

  it('S2.2: por debajo del máximo siempre ok -> 100', () => {
    const r = scorePair(busqueda(), conPrecio(170000), cfg);
    expect(r.score).toBe(100);
    const m = motivo(r, 'precio');
    expect(m.estado).toBe('ok');
    expect(m.texto).toBe('Precio USD 170.000 dentro del presupuesto (hasta USD 180.000)');
  });

  it('exactamente en el máximo (r=1) es ok', () => {
    const r = scorePair(busqueda(), conPrecio(180000), cfg);
    expect(r.score).toBe(100);
    expect(motivo(r, 'precio').estado).toBe('ok');
  });

  it('S2.3: r=1.10 exacto -> s=0.5, score 88 (87.5 half-up)', () => {
    const r = scorePair(busqueda(), conPrecio(198000), cfg);
    expect(r.eliminado).toBe(false);
    expect(r.score).toBe(88);
    expect(motivo(r, 'precio').estado).toBe('parcial');
  });

  it('S2.4: r=1.111 -> eliminado (default), falla, no persistible', () => {
    const r = scorePair(busqueda(), conPrecio(200000), cfg);
    expect(r.eliminado).toBe(true);
    expect(r.persistible).toBe(false);
    expect(r.motivoEliminacion).toBe('Supera el presupuesto en 11,1%');
    const m = motivo(r, 'precio');
    expect(m.estado).toBe('falla');
    expect(m.texto).toBe('Supera el presupuesto en 11,1%');
  });

  it('S2.4 (flag off): s=0, score 75 y sigue siendo match', () => {
    const c = mergeConfig({ precio_fuera_tolerancia_elimina: false });
    const r = scorePair(busqueda(), conPrecio(200000), c);
    expect(r.eliminado).toBe(false);
    expect(r.score).toBe(75);
    expect(r.persistible).toBe(true);
    expect(motivo(r, 'precio').estado).toBe('falla');
  });

  it('texto de exceso formatea es-AR con coma decimal (27,8%)', () => {
    const c = mergeConfig({ precio_fuera_tolerancia_elimina: false });
    const r = scorePair(busqueda(), conPrecio(230000), c);
    expect(motivo(r, 'precio').texto).toBe('Supera el presupuesto en 27,8%');
  });

  it('S2.10: monedas distintas sin tipo de cambio -> neutral y fuera del denominador', () => {
    const r = scorePair(busqueda(), propiedad({ moneda: 'ARS', precio_min: 170000000, precio_max: 170000000 }), cfg);
    const m = motivo(r, 'precio');
    expect(m.estado).toBe('sin_dato');
    expect(m.texto).toBe('Monedas distintas');
    expect(r.eliminado).toBe(false);
    expect(r.score).toBe(100); // resto perfecto, denominador 75
  });

  it('monedas distintas con ars_por_usd convierte y compara', () => {
    const c = mergeConfig({ ars_por_usd: 1000 });
    const r = scorePair(
      busqueda(),
      propiedad({ moneda: 'ARS', precio_min: 170000000, precio_max: 170000000 }),
      c,
    );
    expect(motivo(r, 'precio').estado).toBe('ok');
  });

  it('moneda null se interpreta como moneda_default (USD)', () => {
    const r = scorePair(busqueda({ moneda: null }), conPrecio(170000), cfg);
    expect(motivo(r, 'precio').estado).toBe('ok');
  });

  it('sin precio en la propiedad -> neutral', () => {
    const r = scorePair(busqueda(), propiedad({ precio_min: null, precio_max: null }), cfg);
    expect(motivo(r, 'precio').estado).toBe('sin_dato');
    expect(motivo(r, 'precio').texto).toBe('Sin dato de precio');
  });
});

// ───────────── Tipo ─────────────

describe('tipo', () => {
  it('S2.5: casa vs departamento -> eliminado aunque el resto matchee', () => {
    const r = scorePair(busqueda(), propiedad({ tipos: ['departamento'] }), cfg);
    expect(r.eliminado).toBe(true);
    expect(r.persistible).toBe(false);
    expect(r.motivoEliminacion).toContain('departamento');
    expect(motivo(r, 'tipo').estado).toBe('falla');
  });

  it('búsqueda con varios tipos: alcanza que intersecte', () => {
    const r = scorePair(busqueda({ tipos: ['casa', 'ph'] }), propiedad({ tipos: ['ph'] }), cfg);
    expect(r.eliminado).toBe(false);
    expect(motivo(r, 'tipo').texto).toBe('Tipo ph coincide');
  });

  it('tipo faltante en un lado -> neutral, no elimina', () => {
    const r = scorePair(busqueda(), propiedad({ tipos: [] }), cfg);
    expect(r.eliminado).toBe(false);
    expect(motivo(r, 'tipo').estado).toBe('sin_dato');
  });

  it('con tipo_eliminatorio=false el mismatch da s=0 sin eliminar', () => {
    const c = mergeConfig({ tipo_eliminatorio: false });
    const r = scorePair(busqueda(), propiedad({ tipos: ['departamento'] }), c);
    expect(r.eliminado).toBe(false);
    expect(r.score).toBe(90);
  });
});

// ───────────── Zona ─────────────

describe('zona', () => {
  it('coincide ignorando tildes y mayúsculas', () => {
    const r = scorePair(busqueda({ zonas: ['City Bell'] }), propiedad({ zonas: ['city  bell'] }), cfg);
    expect(motivo(r, 'zona').estado).toBe('ok');
    expect(motivo(r, 'zona').texto).toBe('Zona City Bell coincide');
  });

  it('zona cercana da crédito 0.6 -> 90', () => {
    const r = scorePair(busqueda(), propiedad({ zonas: ['Gonnet'] }), cfg);
    expect(r.score).toBe(90); // (15 + 75) / 100
    const m = motivo(r, 'zona');
    expect(m.estado).toBe('parcial');
    expect(m.texto).toBe('Zona Manuel B. Gonnet vecina de City Bell'); // fix-zonas: ahora lo resuelve la tabla
  });

  it('S2.6 reconciliada: zona fuera, precio exacto -> s=0 y score x0.7 = 52.5 -> 53', () => {
    const r = scorePair(busqueda(), propiedad({ zonas: ['Tolosa'] }), cfg);
    expect(r.eliminado).toBe(false);
    expect(r.score).toBe(53);
    expect(r.persistible).toBe(true);
    const m = motivo(r, 'zona');
    expect(m.estado).toBe('falla');
    expect(m.texto).toBe('Zona Tolosa fuera de lo buscado (City Bell)');
  });

  it('S2.6 reconciliada: zona fuera + precio 5% sobre -> 68.75 x0.7 = 48.1 -> 48, bajo umbral', () => {
    const r = scorePair(busqueda(), propiedad({ zonas: ['Tolosa'], precio_min: 189000, precio_max: 189000 }), cfg);
    expect(r.score).toBe(48);
    expect(r.persistible).toBe(false);
    expect(r.eliminado).toBe(false);
  });

  it('el multiplicador es configurable', () => {
    const c = mergeConfig({ zona_mismatch_multiplicador: 0.5 });
    const r = scorePair(busqueda(), propiedad({ zonas: ['Tolosa'] }), c);
    expect(r.score).toBe(38); // 75 * 0.5 = 37.5 half-up
  });

  it('zona faltante -> neutral y sin multiplicador', () => {
    const r = scorePair(busqueda(), propiedad({ zonas: [] }), cfg);
    expect(motivo(r, 'zona').estado).toBe('sin_dato');
    expect(r.score).toBe(100);
  });
});

// ───────────── Dormitorios ─────────────

describe('dormitorios', () => {
  it('S2.9: pide 3, tiene 2 -> 0.5 parcial; tiene 1 -> 0 falla', () => {
    const b = busqueda({ dorm_min: 3 });
    const r2 = scorePair(b, propiedad({ dorm_min: 2, dorm_max: 2 }), cfg);
    expect(motivo(r2, 'dormitorios').estado).toBe('parcial');
    expect(r2.score).toBe(95); // 100 - 10*0.5
    const r1 = scorePair(b, propiedad({ dorm_min: 1, dorm_max: 1 }), cfg);
    expect(motivo(r1, 'dormitorios').estado).toBe('falla');
    expect(r1.score).toBe(90);
  });

  it('cumple el mínimo -> ok con texto', () => {
    const r = scorePair(busqueda(), propiedad(), cfg);
    expect(motivo(r, 'dormitorios').estado).toBe('ok');
    expect(motivo(r, 'dormitorios').texto).toBe('3 dormitorios (busca 2 o más)');
  });

  it('por encima del máximo pedido -> 0.8', () => {
    const r = scorePair(busqueda({ dorm_min: 1, dorm_max: 2 }), propiedad({ dorm_min: 4, dorm_max: 4 }), cfg);
    expect(motivo(r, 'dormitorios').estado).toBe('parcial');
    expect(r.score).toBe(98); // 100 - 10*0.2
  });

  it('MONOAMBIENTE (0) frente a pedido de 1 -> un dormitorio menos = 0.5', () => {
    const r = scorePair(busqueda({ dorm_min: 1 }), propiedad({ dorm_min: 0, dorm_max: 0 }), cfg);
    expect(motivo(r, 'dormitorios').estado).toBe('parcial');
    expect(motivo(r, 'dormitorios').texto).toBe('Monoambiente (busca 1 o más)');
  });

  it('sin dato de dormitorios en la propiedad -> neutral', () => {
    const r = scorePair(busqueda(), propiedad({ dorm_min: null, dorm_max: null }), cfg);
    expect(motivo(r, 'dormitorios').estado).toBe('sin_dato');
  });
});

// ───────────── m2 ─────────────

describe('m2', () => {
  const b = busqueda({ m2_min: 100 });
  const con = (m2: number) => propiedad({ m2_min: m2, m2_max: m2 });

  it('>= mínimo -> 1', () => {
    const r = scorePair(b, con(100), cfg);
    expect(motivo(r, 'm2').estado).toBe('ok');
    expect(motivo(r, 'm2').texto).toBe('100 m² (busca desde 100 m²)');
  });

  it('>= 90% del mínimo -> 0.7 (score 97)', () => {
    const r = scorePair(b, con(92), cfg);
    expect(motivo(r, 'm2').estado).toBe('parcial');
    expect(r.score).toBe(97);
  });

  it('>= 80% del mínimo -> 0.4 (score 94)', () => {
    const r = scorePair(b, con(85), cfg);
    expect(r.score).toBe(94);
  });

  it('< 80% -> 0 (score 90)', () => {
    const r = scorePair(b, con(70), cfg);
    expect(motivo(r, 'm2').estado).toBe('falla');
    expect(r.score).toBe(90);
  });

  it('> 120% del máximo pedido -> 0.7', () => {
    const r = scorePair(busqueda({ m2_min: 100, m2_max: 150 }), con(200), cfg);
    expect(motivo(r, 'm2').estado).toBe('parcial');
    expect(r.score).toBe(97);
  });
});

// ───────────── Características / forma de pago / necesidades ─────────────

describe('caracteristicas', () => {
  it('fracción de lo pedido que se cumple, con texto tiene/falta', () => {
    const b = busqueda({ amenities: ['cochera', 'patio', 'pileta'] });
    const r = scorePair(b, propiedad({ amenities: ['cochera', 'patio'] }), cfg);
    const m = motivo(r, 'caracteristicas');
    expect(m.estado).toBe('parcial');
    expect(m.texto).toBe('Tiene cochera y patio; falta pileta');
    expect(r.score).toBe(97); // 10 * (1 - 2/3) = 3.33 perdido -> 96.67
  });

  it('todo cumplido -> ok', () => {
    const r = scorePair(busqueda(), propiedad(), cfg);
    expect(motivo(r, 'caracteristicas').estado).toBe('ok');
  });

  it('banos_min y lote cuentan como requeridos', () => {
    const b = busqueda({ amenities: ['cochera'], banos_min: 2, lote_m2_min: 300 });
    const r = scorePair(b, propiedad({ banos_min: 2, lote_m2_min: 200 }), cfg);
    // 3 requeridos: cochera ok, baños ok, lote falta -> 2/3
    expect(motivo(r, 'caracteristicas').estado).toBe('parcial');
  });

  it('S2.7: sin datos de características ni m2 en la propiedad -> neutral, denominador 80, score 100', () => {
    const r = scorePair(busqueda(), propiedad({ m2_min: null, m2_max: null, amenities: [] }), cfg);
    expect(motivo(r, 'm2').estado).toBe('sin_dato');
    expect(motivo(r, 'caracteristicas').estado).toBe('sin_dato');
    expect(r.score).toBe(100);
    expect(r.persistible).toBe(true);
  });

  it('búsqueda sin características pedidas -> neutral', () => {
    const r = scorePair(busqueda({ amenities: [] }), propiedad(), cfg);
    expect(motivo(r, 'caracteristicas').estado).toBe('sin_dato');
  });
});

describe('forma_pago', () => {
  it('apto crédito pedido y ofrecido -> ok', () => {
    const r = scorePair(busqueda(), propiedad(), cfg);
    expect(motivo(r, 'forma_pago').estado).toBe('ok');
    expect(motivo(r, 'forma_pago').texto).toBe('Apto crédito');
  });

  it('pedido pero no ofrecido (apto_banco NO.) -> falla con texto', () => {
    const r = scorePair(busqueda(), propiedad({ formas_pago: ['contado'] }), cfg);
    expect(motivo(r, 'forma_pago').estado).toBe('falla');
    expect(motivo(r, 'forma_pago').texto).toBe('No figura apto crédito');
    expect(r.score).toBe(95);
  });

  it('propiedad sin formas de pago -> sin_dato', () => {
    const r = scorePair(busqueda(), propiedad({ formas_pago: [] }), cfg);
    expect(motivo(r, 'forma_pago').estado).toBe('sin_dato');
  });
});

describe('necesidades', () => {
  it('requisito cumple si >=60% de sus tokens aparecen en la propiedad', () => {
    const b = busqueda({ requisitos: ['apto mascotas', 'luminoso', 'cerca escuelas'] });
    // 'apto mascotas' -> ambos tokens; 'luminoso' -> no; 'cerca escuelas' -> 1/2=50% no cumple
    const r = scorePair(b, propiedad({ requisitos: ['Apto mascotas', 'cerca del centro'] }), cfg);
    const m = motivo(r, 'necesidades');
    expect(m.estado).toBe('parcial');
    expect(m.texto).toBe('Cumple 1 de 3 requisitos');
  });

  it('3 tokens con 2 presentes (66%) cuenta como cumplido', () => {
    const b = busqueda({ requisitos: ['cochera cubierta amplia'] });
    const r = scorePair(b, propiedad({ requisitos: ['cochera cubierta'], amenities: ['cochera'] }), cfg);
    expect(motivo(r, 'necesidades').estado).toBe('ok');
    expect(motivo(r, 'necesidades').texto).toBe('Cumple 1 de 1 requisito');
  });

  it('sin requisitos pedidos -> neutral', () => {
    const r = scorePair(busqueda({ requisitos: [] }), propiedad(), cfg);
    expect(motivo(r, 'necesidades').estado).toBe('sin_dato');
  });
});

// ───────────── Umbral, peso mínimo, config de pesos ─────────────

describe('persistencia', () => {
  const soloPrecioYDorm = mergeConfig({
    pesos: { precio: 50, zona: 0, tipo: 0, dormitorios: 50, m2: 0, caracteristicas: 0, forma_pago: 0, necesidades: 0 },
  });
  // dormitorios 2 menos de lo pedido => s=0; score = 50 * s_precio
  const b = busqueda({ dorm_min: 3 });
  const p = (usd: number) => propiedad({ dorm_min: 1, dorm_max: 1, precio_min: usd, precio_max: usd });

  it('S2.8: 49.6 -> 50 persiste', () => {
    const r = scorePair(b, p(180288), soloPrecioYDorm);
    expect(r.score).toBe(50);
    expect(r.persistible).toBe(true);
  });

  it('S2.8: 49.4 -> 49 no persiste', () => {
    const r = scorePair(b, p(180432), soloPrecioYDorm);
    expect(r.score).toBe(49);
    expect(r.persistible).toBe(false);
    expect(r.eliminado).toBe(false);
  });

  it('el umbral viene de la config (umbral 70 deja afuera un 53)', () => {
    const c = mergeConfig({ umbral: 70 });
    const r = scorePair(busqueda(), propiedad({ zonas: ['Tolosa'] }), c);
    expect(r.score).toBe(53);
    expect(r.persistible).toBe(false);
  });

  it('peso evaluado < 35 -> no persistible aunque el score sea 100', () => {
    // Sólo tipo (10) + forma_pago (5) + necesidades (5) = 20 evaluados
    const r = scorePair(
      busqueda({ precio_max: null, zonas: [], dorm_min: null, m2_min: null, amenities: [] }),
      propiedad(),
      cfg,
    );
    expect(r.score).toBe(100);
    expect(r.persistible).toBe(false);
  });

  it('peso evaluado exactamente 35 sí persiste', () => {
    // tipo 10 + precio 25 = 35
    const r = scorePair(
      busqueda({ zonas: [], dorm_min: null, m2_min: null, amenities: [], formas_pago: [], requisitos: [] }),
      propiedad(),
      cfg,
    );
    expect(r.score).toBe(100);
    expect(r.persistible).toBe(true);
  });

  it('nada evaluable -> score 0 y no persistible', () => {
    const r = scorePair(norm(), norm(), cfg);
    expect(r.score).toBe(0);
    expect(r.persistible).toBe(false);
    expect(r.eliminado).toBe(false);
    expect(r.motivos.every((m) => m.estado === 'sin_dato')).toBe(true);
    expect(r.motivos).toHaveLength(8);
  });

  it('S6.2: peso precio 25 -> 40 con inputs S2.1 => 105/115 = 91', () => {
    const c = mergeConfig({ pesos: { precio: 40 } });
    const r = scorePair(busqueda(), conPrecio(189000), c);
    expect(r.score).toBe(91);
  });
});

// ───────────── Pureza y motivos ─────────────

describe('pureza y motivos', () => {
  it('mismas entradas -> misma salida y no muta los argumentos', () => {
    const b = Object.freeze(busqueda());
    const p = Object.freeze(conPrecio(189000));
    const a1 = scorePair(b, p, cfg);
    const a2 = scorePair(b, p, cfg);
    expect(a1).toEqual(a2);
    expect(a1.score).toBe(94);
  });

  it('ignora claves alternativa_* aunque vengan en el objeto', () => {
    const sucio = {
      ...conPrecio(189000),
      alternativa_menor_1: 'https://remax/x USD 90.000 casa Tolosa',
      alterniva_menor_4: 'ruido',
      alternativa_mayor: 'ruido',
    } as unknown as RuedaNormalizado;
    expect(scorePair(busqueda(), sucio, cfg)).toEqual(scorePair(busqueda(), conPrecio(189000), cfg));
  });

  it('un motivo por criterio, ordenados por peso desc, con texto en español', () => {
    const r = scorePair(busqueda(), conPrecio(189000), cfg);
    expect(r.motivos.map((m) => m.criterio)).toEqual([
      'precio', 'zona', 'tipo', 'dormitorios', 'm2', 'caracteristicas', 'forma_pago', 'necesidades',
    ]);
    expect(r.motivos.every((m) => m.texto.length > 0)).toBe(true);
  });

  it('formatea miles con punto y decimales con coma (es-AR)', () => {
    const c = mergeConfig({ precio_fuera_tolerancia_elimina: false });
    const r = scorePair(busqueda({ precio_max: 1090000 }), propiedad({ precio_min: 1150000, precio_max: 1150000 }), c);
    expect(motivo(r, 'precio').texto).toBe('Precio USD 1.150.000, 5,5% sobre el presupuesto (tolerancia 10%)');
  });
});

// ───────────── Tabla determinística de zonas (fix-zonas) ─────────────

describe('zona con tabla de zonas', () => {
  it('caso real 1180 vs 145: City Bell busca, propiedad en La Plata (vecina) -> 88 y persistible', () => {
    const b = norm({
      tipos: ['departamento'], zonas: ['City Bell'], precio_max: 200000, moneda: 'USD', dorm_min: 2,
      amenities: ['cochera'], banos_min: 1, formas_pago: ['apto_credito'],
      zonas_cercanas: ['Gonnet', 'Villa Elisa', 'Los Hornos', 'Berisso', 'Ringuelet'],
    });
    const p = norm({
      tipos: ['departamento'], zonas: ['La Plata'], precio_min: 155000, precio_max: 155000, moneda: 'USD',
      dorm_min: 3, dorm_max: 3, m2_min: 87, m2_max: 87, amenities: ['cochera', 'balcon', 'ascensor'], banos_min: 2,
    });
    const r = scorePair(b, p, cfg);
    expect(r.score).toBe(88);
    expect(r.persistible).toBe(true);
    const m = motivo(r, 'zona');
    expect(m.estado).toBe('parcial');
    expect(m.texto).toBe('Zona La Plata vecina de City Bell');
  });

  it('"La Plata - Centro" vs "La Plata" es misma zona', () => {
    const r = scorePair(busqueda({ zonas: ['La Plata'] }), propiedad({ zonas: ['La Plata - Centro'] }), cfg);
    expect(motivo(r, 'zona').estado).toBe('ok');
    expect(r.score).toBe(100);
  });

  it('zonas conocidas y distintas: miss aunque el LLM las liste como cercanas', () => {
    const r = scorePair(busqueda({ zonas_cercanas: ['Tolosa'] }), propiedad({ zonas: ['Tolosa'] }), cfg);
    expect(motivo(r, 'zona').estado).toBe('falla');
    expect(r.score).toBe(53);
  });

  it('zona fuera de la tabla: cae al comportamiento previo (zonas_cercanas del LLM)', () => {
    const b = busqueda({ zonas: ['Marte'], zonas_cercanas: ['Venus'] });
    const r = scorePair(b, propiedad({ zonas: ['Venus'] }), cfg);
    expect(motivo(r, 'zona').estado).toBe('parcial');
    expect(motivo(r, 'zona').texto).toBe('Venus es zona cercana a Marte');
    expect(scorePair(b, propiedad({ zonas: ['Marte'] }), cfg).score).toBe(100);
  });

  it('usa la tabla de la config (editable) y mergeConfig cae a defaults si falta', () => {
    const c = mergeConfig({ zonas: [{ nombre: 'X', alias: [], vecinas: ['Y'] }, { nombre: 'Y', alias: [], vecinas: [] }] });
    const r = scorePair(busqueda({ zonas: ['X'] }), propiedad({ zonas: ['Y'] }), c);
    expect(motivo(r, 'zona').estado).toBe('parcial');
    expect(mergeConfig({}).zonas).toEqual(DEFAULT_RUEDA_CONFIG.zonas);
    expect(mergeConfig({ zonas: 'basura' }).zonas).toEqual(DEFAULT_RUEDA_CONFIG.zonas);
  });
});
