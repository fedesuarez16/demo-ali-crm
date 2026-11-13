// Constantes y formateadores de /propiedades/busquedas (movidos sin cambios desde page.tsx).
import { PROPIEDAD_BUSQUEDA_DB_COLUMNS } from '../../utils/propiedadBusquedaCsvMap';
import type { PropiedadBusqueda, SupabasePropiedad } from '../../types';

export type DbCol = (typeof PROPIEDAD_BUSQUEDA_DB_COLUMNS)[number];

export const VISIBLE_COLUMNS: DbCol[] = [
  'agente_cliente',
  'etiqueta',
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
  'apto_banco',
];

export const COLUMN_LABELS: Record<DbCol, string> = {
  agente_cliente: 'Agente/Cliente',
  tipo_de_propiedad: 'Tipo',
  direccion: 'Dirección',
  zona: 'Zona',
  valor: 'Valor',
  dormitorios: 'Dormitorios',
  banos: 'Baños',
  patio_parque: 'Patio/Parque',
  garage: 'Garage',
  mts_const: 'm² const.',
  lote: 'Lote',
  piso: 'Piso',
  link: 'Link',
  columna_1: 'Columna 1',
  apto_banco: 'Apto banco',
  alternativa_menor_1: 'Alt. menor 1',
  alternativa_menor_2: 'Alt. menor 2',
  alternativa_menor_3: 'Alt. menor 3',
  alterniva_menor_4: 'Alt. menor 4',
  alternativa_menor_5: 'Alt. menor 5',
  alternativa_mayor: 'Alt. mayor',
  alternativa_mayor_2: 'Alt. mayor 2',
  alternativa_mayor_3: 'Alt. mayor 3',
  alternativa_mayor_4: 'Alt. mayor 4',
  alternativa_mayor_5: 'Alt. mayor 5',
  notas: 'Notas',
  etiqueta: 'Etiqueta',
};

export const emptyForm = (): Record<DbCol, string> =>
  Object.fromEntries(PROPIEDAD_BUSQUEDA_DB_COLUMNS.map((k) => [k, ''])) as Record<DbCol, string>;

export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function csvEscape(value: string): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(rows: PropiedadBusqueda[]): string {
  const exportCols: (keyof PropiedadBusqueda)[] = ['id', ...VISIBLE_COLUMNS];
  const header = exportCols.join(',');
  const body = rows
    .map((r) =>
      exportCols.map((c) => csvEscape((r[c] ?? '') as string)).join(',')
    )
    .join('\n');
  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const FICHA_FIELDS: Array<{ key: keyof SupabasePropiedad; label: string }> = [
  { key: 'tipo_de_propiedad', label: 'Tipo' },
  { key: 'direccion', label: 'Dirección' },
  { key: 'zona', label: 'Zona' },
  { key: 'valor', label: 'Valor' },
  { key: 'dormitorios', label: 'Dormitorios' },
  { key: 'banos', label: 'Baños' },
  { key: 'patio_parque', label: 'Patio/Parque' },
  { key: 'garage', label: 'Garage' },
  { key: 'mts_const', label: 'm² const.' },
  { key: 'lote', label: 'Lote' },
  { key: 'piso', label: 'Piso' },
  { key: 'apto_banco', label: 'Apto banco' },
  { key: 'link', label: 'Link' },
];

export function formatPropiedadFicha(p: SupabasePropiedad): string {
  const lines: string[] = [];
  lines.push(`Ficha #${p.id}`);
  for (const f of FICHA_FIELDS) {
    const value = (p[f.key] ?? '') as string;
    if (value && String(value).trim()) {
      lines.push(`${f.label}: ${value}`);
    }
  }
  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
