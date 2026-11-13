// Módulo PURO (sin I/O): parser determinístico de respaldo y armado del input del hash.
// Se usa cuando el LLM falla / se agota el presupuesto; marca fuente:'parser' (se considera STALE).
import type { Amenity, FormaPago, RuedaNormalizado, TipoCanonico } from '../types';

export type FilaCruda = Record<string, string | number | null | undefined>;
export type RolNormalizacion = 'busqueda' | 'propiedad';

const CONFIANZA_PARSER = 0.3;

/** Campos (en orden) que alimentan el hash. EXCLUYE alternativa_*, alterniva_menor_4, link, '.', lat/lng. */
export const CAMPOS_HASH = [
  'tipo_de_propiedad', 'direccion', 'zona', 'valor', 'dormitorios', 'banos',
  'patio_parque', 'garage', 'mts_const', 'lote', 'piso', 'columna_1', 'apto_banco', 'notas',
] as const;

const texto = (v: string | number | null | undefined): string =>
  v === null || v === undefined ? '' : String(v).trim();

/** Input estable para el hash: JSON de los campos relevantes, en orden fijo y normalizados. */
export function buildHashInput(fila: FilaCruda): string {
  return JSON.stringify(CAMPOS_HASH.map((c) => texto(fila[c])));
}

const slug = (s: string): string =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

const esPlaceholder = (s: string): boolean => /^(-+|no\.?|\.|n\/?a|s\/?d)?$/i.test(s.trim());
const esAfirmativo = (s: string): boolean => /^\s*(s[ií]\b|apto\b|true\b|yes\b)/i.test(s);

/**
 * Copia de busquedaMatching.parseNumber extendida con manejo es-AR de miles:
 * un único separador seguido de exactamente 3 dígitos es separador de miles ('330.000' -> 330000).
 */
export function parseNumber(s: string | number | null | undefined): number | null {
  const raw = texto(s);
  if (!raw) return null;
  // Primer token numérico (evita que el "2" de "120 m2" se pegue al número).
  const token = /\d[\d.,]*/.exec(raw);
  if (!token) return null;
  const cleaned = token[0].replace(/[.,]+$/, '');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? ',' : '.';
    const partes = cleaned.split(sep);
    const milesEstilo = partes.length > 2
      || (partes[1].length === 3 && partes[0].length >= 1 && partes[0] !== '0');
    normalized = milesEstilo ? partes.join('') : `${partes[0]}.${partes[1]}`;
  } else {
    normalized = cleaned;
  }
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? null : n;
}

function detectarMoneda(valor: string): 'USD' | 'ARS' | null {
  if (/USD|U\$S|US\$|d[oó]lar/i.test(valor)) return 'USD';
  if (/\$|ARS|pesos/i.test(valor)) return 'ARS';
  return null;
}

const TIPOS: Array<[RegExp, TipoCanonico]> = [
  [/\b(depto|departamento|dpto|monoambiente)\b/, 'departamento'],
  [/\bcasa\b/, 'casa'],
  [/\bph\b/, 'ph'],
  [/\bduplex\b/, 'duplex'],
  [/\b(terreno|lote)\b/, 'terreno'],
  [/\blocal\b/, 'local'],
  [/\boficina\b/, 'oficina'],
  [/\bcochera\b/, 'cochera'],
  [/\bgalpon\b/, 'galpon'],
  [/\bquinta\b/, 'quinta'],
];

function detectarTipos(valor: string): TipoCanonico[] {
  const s = slug(valor);
  return TIPOS.filter(([re]) => re.test(s)).map(([, t]) => t);
}

const AMENITIES_NOTAS: Array<[RegExp, Amenity]> = [
  [/pileta|piscina/, 'pileta'],
  [/quincho/, 'quincho'],
  [/parrilla/, 'parrilla'],
  [/balcon/, 'balcon'],
  [/terraza/, 'terraza'],
  [/ascensor/, 'ascensor'],
  [/jardin/, 'jardin'],
  [/patio/, 'patio'],
  [/cochera|garage|garaje/, 'cochera'],
];

const tieneKeyword = (s: string, re: RegExp): boolean => {
  const m = re.exec(s);
  if (!m) return false;
  return !new RegExp(`\\bsin\\s+(?:\\w+\\s+)?${re.source}`).test(s);
};

function detectarAmenities(fila: FilaCruda): Amenity[] {
  const out = new Set<Amenity>();

  const garage = texto(fila.garage);
  if (!esPlaceholder(garage)) {
    const n = parseNumber(garage);
    if (esAfirmativo(garage) || (n !== null && n > 0)) out.add('cochera');
  }

  const patio = texto(fila.patio_parque);
  if (!esPlaceholder(patio) && !/^no\b/i.test(patio)) {
    out.add(/jard[ií]n/i.test(patio) ? 'jardin' : 'patio');
  }

  const libre = slug(`${texto(fila.notas)} ${texto(fila.columna_1)}`);
  for (const [re, a] of AMENITIES_NOTAS) if (tieneKeyword(libre, re)) out.add(a);
  return Array.from(out);
}

function detectarFormasPago(fila: FilaCruda): FormaPago[] {
  const out = new Set<FormaPago>();
  if (esAfirmativo(texto(fila.apto_banco))) out.add('apto_credito');
  const libre = slug(texto(fila.notas));
  if (tieneKeyword(libre, /permuta/)) out.add('permuta');
  if (tieneKeyword(libre, /contado/)) out.add('contado');
  return Array.from(out);
}

function detectarZonas(zona: string): string[] {
  if (esPlaceholder(zona)) return [];
  return zona.split(/[,/;]/).map((z) => z.trim()).filter((z) => z && !esPlaceholder(z));
}

function entero(s: string): number | null {
  if (esPlaceholder(s)) return null;
  const m = /\d+/.exec(s);
  return m ? parseInt(m[0], 10) : null;
}

/** Normaliza una fila cruda sin LLM. La moneda queda null si no se detecta (el caller aplica el default). */
export function parserFallback(fila: FilaCruda, rol: RolNormalizacion): RuedaNormalizado {
  const esProp = rol === 'propiedad';

  const valor = texto(fila.valor);
  const monto = esPlaceholder(valor) ? null : parseNumber(valor);

  const dormTxt = texto(fila.dormitorios);
  const dorm = /mono/i.test(dormTxt) ? 0 : entero(dormTxt);

  const m2 = esPlaceholder(texto(fila.mts_const)) ? null : parseNumber(fila.mts_const);
  const lote = esPlaceholder(texto(fila.lote)) ? null : parseNumber(fila.lote);

  return {
    v: 1,
    fuente: 'parser',
    confianza: CONFIANZA_PARSER,
    moneda: monto === null ? null : detectarMoneda(valor),
    precio_min: esProp ? monto : null,
    precio_max: monto,
    tipos: detectarTipos(texto(fila.tipo_de_propiedad)),
    zonas: detectarZonas(texto(fila.zona)),
    zonas_cercanas: [],
    dorm_min: dorm,
    dorm_max: esProp ? dorm : null,
    banos_min: entero(texto(fila.banos)),
    m2_min: m2,
    m2_max: esProp ? m2 : null,
    lote_m2_min: lote,
    amenities: detectarAmenities(fila),
    formas_pago: detectarFormasPago(fila),
    requisitos: [],
  };
}
