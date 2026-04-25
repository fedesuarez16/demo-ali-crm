/** Columnas alineadas con public.propiedad_busquedas (sin id / archivo_origen / timestamps).
 *  Mismo set que public.propiedades. Mantener el typo `alterniva_menor_4` (existe así en la DB).
 */

export const PROPIEDAD_BUSQUEDA_DB_COLUMNS = [
  'tipo_de_propiedad',
  'direccion',
  'zona',
  'valor',
  'dormitorios',
  'banos',
  'patio_parque',
  'garage',
  'mts_const',
  'lote',
  'piso',
  'link',
  'columna_1',
  'apto_banco',
  'alternativa_menor_1',
  'alternativa_menor_2',
  'alternativa_menor_3',
  'alterniva_menor_4',
  'alternativa_menor_5',
  'alternativa_mayor',
  'alternativa_mayor_2',
  'alternativa_mayor_3',
  'alternativa_mayor_4',
  'alternativa_mayor_5',
  'notas',
] as const;

export type PropiedadBusquedaDbColumn = (typeof PROPIEDAD_BUSQUEDA_DB_COLUMNS)[number];

const DB_SET = new Set<string>(PROPIEDAD_BUSQUEDA_DB_COLUMNS);

/** Normaliza encabezado CSV a clave comparable (sin acentos, snake_case). */
export function normalizeCsvHeader(h: string): string {
  return h
    .replace(/^﻿/, '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/ /g, ' ')
    .replace(/\s+/g, '_')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const HEADER_ALIASES: Record<string, PropiedadBusquedaDbColumn> = {
  // valor
  precio: 'valor',
  // dormitorios
  habitaciones: 'dormitorios',
  habitacion: 'dormitorios',
  habs: 'dormitorios',
  dormitorio: 'dormitorios',
  // banos
  bano: 'banos',
  // tipo_de_propiedad
  tipo: 'tipo_de_propiedad',
  tipo_propiedad: 'tipo_de_propiedad',
  // direccion
  domicilio: 'direccion',
  // patio_parque
  patio: 'patio_parque',
  jardin: 'patio_parque',
  parque: 'patio_parque',
  // garage
  cochera: 'garage',
  // mts_const
  mts2: 'mts_const',
  mts_2: 'mts_const',
  m2: 'mts_const',
  metros: 'mts_const',
  metros_cuadrados: 'mts_const',
  metroscuadrados: 'mts_const',
  superficie: 'mts_const',
  superficie_construida: 'mts_const',
  sup: 'mts_const',
  // notas
  observaciones: 'notas',
  comentarios: 'notas',
  // typo alias por si el CSV trae el nombre "correcto"
  alternativa_menor_4: 'alterniva_menor_4',
};

/**
 * Mapea el índice de cada columna del CSV a la columna de base de datos.
 * Encabezados no reconocidos se ignoran. "id", "archivo_origen", "created_at" se ignoran.
 */
export function buildColumnIndexMap(headers: string[]): Map<number, PropiedadBusquedaDbColumn> {
  const map = new Map<number, PropiedadBusquedaDbColumn>();
  const SKIP = new Set(['id', '', 'archivo_origen', 'created_at']);
  headers.forEach((raw, idx) => {
    const norm = normalizeCsvHeader(raw);
    if (SKIP.has(norm)) return;
    let col: PropiedadBusquedaDbColumn | undefined;
    if (DB_SET.has(norm)) {
      col = norm as PropiedadBusquedaDbColumn;
    } else {
      const alias = HEADER_ALIASES[norm];
      if (alias) col = alias;
    }
    if (col) map.set(idx, col);
  });
  return map;
}

export function rowToBusquedaRecord(
  cells: string[],
  colMap: Map<number, PropiedadBusquedaDbColumn>
): Record<PropiedadBusquedaDbColumn, string> {
  const empty = Object.fromEntries(
    PROPIEDAD_BUSQUEDA_DB_COLUMNS.map((k) => [k, ''])
  ) as Record<PropiedadBusquedaDbColumn, string>;
  colMap.forEach((dbCol, i) => {
    if (i < cells.length) {
      empty[dbCol] = (cells[i] ?? '').trim();
    }
  });
  return empty;
}
