import type { PropiedadBusqueda, SupabasePropiedad } from '../types';

export interface PropiedadMatch {
  propiedad: SupabasePropiedad;
  score: number;
  matchedFields: string[];
}

export interface BusquedaMatchResult {
  matches: PropiedadMatch[]; // sólo con score > 0, ordenadas desc por score
  topScore: number;
  totalCount: number;        // cantidad de propiedades con al menos 1 coincidencia
  criteriaCount: number;     // cantidad de columnas con valor en la búsqueda (denominador del score)
}

const norm = (s: string): string =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

const isEmpty = (s: string | null | undefined): boolean => !s || !String(s).trim();

const parseNumber = (s: string | null | undefined): number | null => {
  if (isEmpty(s)) return null;
  const cleaned = String(s).replace(/[^\d,.\-]/g, '');
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized: string;
  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = cleaned.replace(/,/g, '');
  }
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
};

const textMatch = (busqueda: string, propiedad: string): boolean => {
  const b = norm(busqueda);
  const p = norm(propiedad);
  if (!b || !p) return false;
  return p.includes(b) || b.includes(p);
};

const numericGte = (busqueda: string, propiedad: string): boolean => {
  const b = parseNumber(busqueda);
  const p = parseNumber(propiedad);
  if (b == null || p == null) return false;
  return p >= b;
};

const numericLte = (busqueda: string, propiedad: string): boolean => {
  const b = parseNumber(busqueda);
  const p = parseNumber(propiedad);
  if (b == null || p == null) return false;
  return p <= b;
};

type Comparator = (busquedaVal: string, propiedadVal: string) => boolean;

interface FieldRule {
  busquedaKey: keyof PropiedadBusqueda;
  propiedadKey: keyof SupabasePropiedad;
  label: string;
  cmp: Comparator;
}

const RULES: FieldRule[] = [
  { busquedaKey: 'tipo_de_propiedad', propiedadKey: 'tipo_de_propiedad', label: 'Tipo', cmp: textMatch },
  { busquedaKey: 'direccion',         propiedadKey: 'direccion',         label: 'Dirección', cmp: textMatch },
  { busquedaKey: 'zona',              propiedadKey: 'zona',              label: 'Zona', cmp: textMatch },
  { busquedaKey: 'valor',             propiedadKey: 'valor',             label: 'Valor', cmp: numericLte },
  { busquedaKey: 'dormitorios',       propiedadKey: 'dormitorios',       label: 'Dormitorios', cmp: numericGte },
  { busquedaKey: 'banos',             propiedadKey: 'banos',             label: 'Baños', cmp: numericGte },
  { busquedaKey: 'patio_parque',      propiedadKey: 'patio_parque',      label: 'Patio/Parque', cmp: textMatch },
  { busquedaKey: 'garage',            propiedadKey: 'garage',            label: 'Garage', cmp: textMatch },
  { busquedaKey: 'mts_const',         propiedadKey: 'mts_const',         label: 'm² const.', cmp: numericGte },
  { busquedaKey: 'lote',              propiedadKey: 'lote',              label: 'Lote', cmp: textMatch },
  { busquedaKey: 'piso',              propiedadKey: 'piso',              label: 'Piso', cmp: textMatch },
  { busquedaKey: 'apto_banco',        propiedadKey: 'apto_banco',        label: 'Apto banco', cmp: textMatch },
];

const REQUIRED_KEYS: Array<keyof PropiedadBusqueda> = ['zona', 'valor'];

export function computeMatches(
  busqueda: PropiedadBusqueda,
  propiedades: SupabasePropiedad[]
): BusquedaMatchResult {
  const activeRules = RULES.filter((r) => !isEmpty(busqueda[r.busquedaKey] as string));
  const criteriaCount = activeRules.length;

  if (criteriaCount === 0) {
    return { matches: [], topScore: 0, totalCount: 0, criteriaCount: 0 };
  }

  const requiredRules = activeRules.filter((r) =>
    REQUIRED_KEYS.includes(r.busquedaKey)
  );

  const matches: PropiedadMatch[] = [];
  for (const propiedad of propiedades) {
    const failsRequired = requiredRules.some((r) => {
      const bVal = String(busqueda[r.busquedaKey] ?? '');
      const pVal = String(propiedad[r.propiedadKey] ?? '');
      return isEmpty(pVal) || !r.cmp(bVal, pVal);
    });
    if (failsRequired) continue;

    const matchedFields: string[] = [];
    for (const rule of activeRules) {
      const bVal = String(busqueda[rule.busquedaKey] ?? '');
      const pVal = String(propiedad[rule.propiedadKey] ?? '');
      if (isEmpty(pVal)) continue;
      if (rule.cmp(bVal, pVal)) {
        matchedFields.push(rule.label);
      }
    }
    if (matchedFields.length > 0) {
      matches.push({ propiedad, score: matchedFields.length, matchedFields });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  const topScore = matches.length > 0 ? matches[0].score : 0;
  return { matches, topScore, totalCount: matches.length, criteriaCount };
}
