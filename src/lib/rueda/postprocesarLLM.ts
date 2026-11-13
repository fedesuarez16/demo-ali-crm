// Módulo PURO: sanea la salida del LLM y la convierte en RuedaNormalizado.
// El LLM puede devolver basura aunque el schema sea estricto; acá se filtra, se acota y se aplica moneda_default.
import type { Amenity, FormaPago, RuedaNormalizado, TipoCanonico } from '@/app/types';
import type { RolNormalizacion } from '@/app/utils/ruedaNormalizadorFallback';

export const TIPOS_CANONICOS: TipoCanonico[] = [
  'departamento', 'casa', 'ph', 'duplex', 'terreno', 'local', 'oficina', 'cochera', 'galpon', 'quinta', 'otro',
];
export const AMENITIES: Amenity[] = [
  'cochera', 'patio', 'jardin', 'pileta', 'quincho', 'parrilla', 'balcon', 'terraza', 'ascensor', 'amenities',
];
export const FORMAS_PAGO: FormaPago[] = ['apto_credito', 'permuta', 'contado', 'financiacion'];

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

const enumList = <T extends string>(v: unknown, permitidos: readonly T[]): T[] => {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is T => typeof x === 'string' && (permitidos as readonly string[]).includes(x)))];
};

const strList = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  const limpios = v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean);
  return [...new Set(limpios)];
};

export function postprocesarLLM(raw: unknown, rol: RolNormalizacion, monedaDefault: 'USD' | 'ARS'): RuedaNormalizado {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Respuesta del LLM inválida');
  const r = raw as Record<string, unknown>;
  const esProp = rol === 'propiedad';

  let precio_min = num(r.precio_min);
  let precio_max = num(r.precio_max);
  let dorm_min = num(r.dorm_min);
  let dorm_max = num(r.dorm_max);
  let m2_min = num(r.m2_min);
  let m2_max = num(r.m2_max);

  if (esProp) {
    // Una propiedad tiene valores puntuales: min = max
    precio_min = precio_max = precio_max ?? precio_min;
    dorm_min = dorm_max = dorm_max ?? dorm_min;
    m2_min = m2_max = m2_max ?? m2_min;
  }

  const moneda = r.moneda === 'USD' || r.moneda === 'ARS' ? r.moneda : null;
  const hayPrecio = precio_min !== null || precio_max !== null;
  const tipos = enumList(r.tipos, TIPOS_CANONICOS);

  return {
    v: 1,
    fuente: 'llm',
    confianza: typeof r.confianza === 'number' && Number.isFinite(r.confianza) ? Math.min(1, Math.max(0, r.confianza)) : 0.5,
    moneda: moneda ?? (hayPrecio ? monedaDefault : null),
    precio_min,
    precio_max,
    tipos: esProp ? tipos.slice(0, 1) : tipos,
    zonas: strList(r.zonas),
    zonas_cercanas: esProp ? [] : strList(r.zonas_cercanas),
    dorm_min,
    dorm_max,
    banos_min: num(r.banos_min),
    m2_min,
    m2_max,
    lote_m2_min: num(r.lote_m2_min),
    amenities: enumList(r.amenities, AMENITIES),
    formas_pago: enumList(r.formas_pago, FORMAS_PAGO),
    requisitos: strList(r.requisitos),
  };
}
