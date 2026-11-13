import { describe, it, expect } from 'vitest';
import type { RuedaNormalizado } from '@/app/types';
import { DEFAULT_RUEDA_CONFIG } from './ruedaScoring';
import { cercanosParaBusqueda, cercanosParaPropiedad } from './ruedaCercanos';

const norm = (over: Partial<RuedaNormalizado> = {}): RuedaNormalizado => ({
  v: 1, fuente: 'llm', confianza: 0.9, moneda: 'USD', precio_min: null, precio_max: null, tipos: [],
  zonas: [], zonas_cercanas: [], dorm_min: null, dorm_max: null, banos_min: null, m2_min: null, m2_max: null,
  lote_m2_min: null, amenities: [], formas_pago: [], requisitos: [], ...over,
});

const cfg = DEFAULT_RUEDA_CONFIG;
const busq = norm({ tipos: ['departamento'], zonas: ['City Bell'], precio_max: 200000, dorm_min: 2 });
// misma zona, precio ok, dorm 0 -> bajo (35 < 50 pero >= 30?) se ajusta por caso
const prop = (over: Partial<RuedaNormalizado>) =>
  norm({ tipos: ['departamento'], zonas: ['City Bell'], precio_min: 150000, precio_max: 150000, dorm_min: 2, ...over });

describe('cercanosParaBusqueda', () => {
  it('devuelve los pares bajo umbral y sobre el piso, ordenados por score desc, tope n', () => {
    const cand = [
      { id: 1, normalizado: prop({}) }, // score 100: ya es match, no es "casi"
      { id: 2, normalizado: prop({ zonas: ['Tolosa'], precio_min: 214000, precio_max: 214000 }) }, // 7% sobre
      { id: 3, normalizado: prop({ zonas: ['Tolosa'], precio_min: 210000, precio_max: 210000 }) }, // 5% sobre
      { id: 4, normalizado: prop({ zonas: ['Tolosa'], precio_min: 218000, precio_max: 218000, dorm_min: 1 }) },
    ];
    const r = cercanosParaBusqueda(busq, cand, cfg, { n: 2 });
    expect(r.length).toBeLessThanOrEqual(2);
    for (const x of r) {
      expect(x.score).toBeLessThan(cfg.umbral);
      expect(x.score).toBeGreaterThanOrEqual(30);
    }
    expect(r.map((x) => x.score)).toEqual([...r.map((x) => x.score)].sort((a, b) => b - a));
    expect(r.map((x) => x.id)).not.toContain(1);
  });

  it('excluye eliminados (tipo distinto o precio fuera de tolerancia)', () => {
    const cand = [
      { id: 1, normalizado: prop({ tipos: ['casa'], zonas: ['Tolosa'] }) },
      { id: 2, normalizado: prop({ zonas: ['Tolosa'], precio_min: 400000, precio_max: 400000 }) },
    ];
    expect(cercanosParaBusqueda(busq, cand, cfg)).toEqual([]);
  });

  it('excluye bajo el piso, los de score >= umbral y los ya persistidos', () => {
    const baja = { id: 1, normalizado: prop({ zonas: ['Tolosa'], precio_min: 210000, precio_max: 210000, dorm_min: 0 }) };
    const alta = { id: 2, normalizado: prop({}) };
    const bajoUmbral = { id: 3, normalizado: prop({ zonas: ['Tolosa'], precio_min: 210000, precio_max: 210000 }) };
    const sinPiso = cercanosParaBusqueda(busq, [baja, alta, bajoUmbral], cfg, { piso: 0 });
    expect(sinPiso.map((x) => x.id)).not.toContain(2);
    expect(sinPiso.map((x) => x.id)).toContain(3);
    const conExcl = cercanosParaBusqueda(busq, [baja, alta, bajoUmbral], cfg, { piso: 0, excluirIds: new Set([3]) });
    expect(conExcl.map((x) => x.id)).not.toContain(3);
    const conPiso = cercanosParaBusqueda(busq, [bajoUmbral], cfg, { piso: 99 });
    expect(conPiso).toEqual([]);
  });

  it('incluye motivos y por defecto n=3', () => {
    const cand = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      normalizado: prop({ zonas: ['Tolosa'], precio_min: 210000, precio_max: 210000 }),
    }));
    const r = cercanosParaBusqueda(busq, cand, cfg);
    expect(r).toHaveLength(3);
    expect(r[0].motivos.length).toBeGreaterThan(0);
  });
});

describe('cercanosParaPropiedad', () => {
  it('espejo: puntúa cada búsqueda contra la propiedad', () => {
    const p = prop({ zonas: ['Tolosa'], precio_min: 210000, precio_max: 210000 });
    const r = cercanosParaPropiedad(p, [{ id: 7, normalizado: busq }], cfg);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(7);
    expect(r[0].score).toBeLessThan(cfg.umbral);
  });
});
