/** Columnas alineadas con public.propiedad_busquedas (sin id / timestamps). */

export const PROPIEDAD_BUSQUEDA_DB_COLUMNS = [
  'valor',
  'zona',
  'patio',
  'piscina',
  'habitaciones',
  'banos',
  'mts2',
] as const;

export type PropiedadBusquedaDbColumn = (typeof PROPIEDAD_BUSQUEDA_DB_COLUMNS)[number];

const DB_SET = new Set<string>(PROPIEDAD_BUSQUEDA_DB_COLUMNS);

/** Normaliza encabezado CSV a clave comparable (sin acentos, snake_case). */
export function normalizeCsvHeader(h: string): string {
  return h
    .replace(/^\uFEFF/, '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const HEADER_ALIASES: Record<string, PropiedadBusquedaDbColumn> = {
  precio: 'valor',
  dormitorios: 'habitaciones',
  dormitorio: 'habitaciones',
  habitacion: 'habitaciones',
  habitaciones: 'habitaciones',
  habs: 'habitaciones',
  bano: 'banos',
  banos: 'banos',
  metros: 'mts2',
  metros_cuadrados: 'mts2',
  metroscuadrados: 'mts2',
  m2: 'mts2',
  mts_2: 'mts2',
  mts: 'mts2',
  sup: 'mts2',
  superficie: 'mts2',
  patio_parque: 'patio',
  jardin: 'patio',
};

/**
 * Mapea el índice de cada columna del CSV a la columna de base de datos.
 * Encabezados no reconocidos se ignoran. "id" se ignora.
 */
export function buildColumnIndexMap(headers: string[]): Map<number, PropiedadBusquedaDbColumn> {
  const map = new Map<number, PropiedadBusquedaDbColumn>();
  headers.forEach((raw, idx) => {
    const norm = normalizeCsvHeader(raw);
    if (norm === 'id' || norm === '') return;
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
