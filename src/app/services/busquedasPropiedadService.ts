import { createClient } from '@supabase/supabase-js';
import type { PropiedadBusqueda } from '../types';
import type { PropiedadBusquedaDbColumn } from '../utils/propiedadBusquedaCsvMap';
import { PROPIEDAD_BUSQUEDA_DB_COLUMNS } from '../utils/propiedadBusquedaCsvMap';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

let supabaseClient: ReturnType<typeof createClient> | null = null;
const getSupabase = () => {
  if (supabaseClient) return supabaseClient;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars missing. Define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
};

const toPayload = (r: Record<PropiedadBusquedaDbColumn, string>, archivoOrigen: string | null) => {
  const row: Record<string, string | null> = {};
  for (const k of PROPIEDAD_BUSQUEDA_DB_COLUMNS) {
    row[k] = r[k] ?? '';
  }
  // etiqueta is the only nullable text field — empty string means "no etiqueta", persist as NULL
  if (row.etiqueta === '') row.etiqueta = null;
  row.archivo_origen = archivoOrigen;
  return row;
};

const CHUNK = 250;

const mapBusquedaRow = (row: any): PropiedadBusqueda => ({
  id: String(row.id ?? ''),
  agente_cliente: row.agente_cliente ?? '',
  tipo_de_propiedad: row.tipo_de_propiedad ?? '',
  direccion: row.direccion ?? '',
  zona: row.zona ?? '',
  valor: row.valor ?? '',
  dormitorios: row.dormitorios ?? '',
  banos: row.banos ?? '',
  patio_parque: row.patio_parque ?? '',
  garage: row.garage ?? '',
  mts_const: row.mts_const ?? '',
  lote: row.lote ?? '',
  piso: row.piso ?? '',
  link: row.link ?? '',
  columna_1: row.columna_1 ?? '',
  apto_banco: row.apto_banco ?? '',
  alternativa_menor_1: row.alternativa_menor_1 ?? '',
  alternativa_menor_2: row.alternativa_menor_2 ?? '',
  alternativa_menor_3: row.alternativa_menor_3 ?? '',
  alterniva_menor_4: row.alterniva_menor_4 ?? '',
  alternativa_menor_5: row.alternativa_menor_5 ?? '',
  alternativa_mayor: row.alternativa_mayor ?? '',
  alternativa_mayor_2: row.alternativa_mayor_2 ?? '',
  alternativa_mayor_3: row.alternativa_mayor_3 ?? '',
  alternativa_mayor_4: row.alternativa_mayor_4 ?? '',
  alternativa_mayor_5: row.alternativa_mayor_5 ?? '',
  notas: row.notas ?? '',
  etiqueta: row.etiqueta ?? '',
  archivo_origen: row.archivo_origen ?? null,
  created_at: row.created_at ?? null,
});

export async function getAllPropiedadBusquedas(): Promise<PropiedadBusqueda[]> {
  try {
    const { data, error } = await (getSupabase() as any)
      .from('propiedad_busquedas')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('getAllPropiedadBusquedas:', error.message);
      return [];
    }
    return ((data as any[]) || []).map(mapBusquedaRow);
  } catch (e) {
    console.error('getAllPropiedadBusquedas:', e);
    return [];
  }
}

export async function insertPropiedadBusquedas(
  rows: Record<PropiedadBusquedaDbColumn, string>[],
  archivoOrigen?: string
): Promise<{ inserted: number; error?: string }> {
  if (rows.length === 0) {
    return { inserted: 0 };
  }

  const origen = archivoOrigen ?? null;
  const payloads = rows.map((r) => toPayload(r, origen));

  try {
    let inserted = 0;
    for (let i = 0; i < payloads.length; i += CHUNK) {
      const slice = payloads.slice(i, i + CHUNK);
      const { error } = await (getSupabase() as any).from('propiedad_busquedas').insert(slice);
      if (error) {
        return { inserted, error: error.message };
      }
      inserted += slice.length;
    }
    return { inserted };
  } catch (e: any) {
    return { inserted: 0, error: e?.message || 'Error al insertar' };
  }
}

export async function updatePropiedadBusqueda(
  id: string,
  values: Record<PropiedadBusquedaDbColumn, string>
): Promise<{ ok: boolean; error?: string }> {
  const payload: Record<string, string | null> = {};
  for (const k of PROPIEDAD_BUSQUEDA_DB_COLUMNS) {
    payload[k] = values[k] ?? '';
  }

  try {
    const { error } = await (getSupabase() as any)
      .from('propiedad_busquedas')
      .update(payload)
      .eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Error al actualizar' };
  }
}

export async function deletePropiedadBusqueda(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await (getSupabase() as any)
      .from('propiedad_busquedas')
      .delete()
      .eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Error al borrar' };
  }
}

export async function updateEtiquetaBulk(
  ids: string[],
  etiqueta: string
): Promise<{ ok: boolean; updated: number; error?: string }> {
  if (ids.length === 0) return { ok: true, updated: 0 };
  const trimmed = etiqueta.trim();
  const payload = { etiqueta: trimmed === '' ? null : trimmed };
  try {
    let updated = 0;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { error } = await (getSupabase() as any)
        .from('propiedad_busquedas')
        .update(payload)
        .in('id', slice);
      if (error) return { ok: false, updated, error: error.message };
      updated += slice.length;
    }
    return { ok: true, updated };
  } catch (e: any) {
    return { ok: false, updated: 0, error: e?.message || 'Error al etiquetar' };
  }
}

export async function deletePropiedadBusquedasBulk(
  ids: string[]
): Promise<{ ok: boolean; deleted: number; error?: string }> {
  if (ids.length === 0) return { ok: true, deleted: 0 };
  try {
    let deleted = 0;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { error } = await (getSupabase() as any)
        .from('propiedad_busquedas')
        .delete()
        .in('id', slice);
      if (error) return { ok: false, deleted, error: error.message };
      deleted += slice.length;
    }
    return { ok: true, deleted };
  } catch (e: any) {
    return { ok: false, deleted: 0, error: e?.message || 'Error al borrar' };
  }
}

export async function countPropiedadBusquedas(): Promise<number> {
  try {
    const { count, error } = await (getSupabase() as any)
      .from('propiedad_busquedas')
      .select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
