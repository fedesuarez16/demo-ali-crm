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
  row.archivo_origen = archivoOrigen;
  return row;
};

const CHUNK = 250;

const mapBusquedaRow = (row: any): PropiedadBusqueda => ({
  id: String(row.id ?? ''),
  valor: row.valor ?? '',
  zona: row.zona ?? '',
  patio: row.patio ?? '',
  piscina: row.piscina ?? '',
  habitaciones: row.habitaciones ?? '',
  banos: row.banos ?? '',
  mts2: row.mts2 ?? '',
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
