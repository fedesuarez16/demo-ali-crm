import { createClient } from '@supabase/supabase-js';
import { SupabasePropiedad } from '../types';

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

/**
 * Mapea una fila de Supabase a SupabasePropiedad
 */
const mapPropiedadRow = (row: any): SupabasePropiedad => {
  return {
    id: row.id.toString(),
    tipo_de_propiedad: row.tipo_de_propiedad || '',
    direccion: row.direccion || '',
    zona: row.zona || '',
    valor: row.valor || '',
    dormitorios: row.dormitorios || '',
    banos: row.banos || '',
    patio_parque: row.patio_parque || '',
    garage: row.garage || '',
    mts_const: row.mts_const || '',
    lote: row.lote || '',
    piso: row.piso || '',
    link: row.link || '',
    columna_1: row.columna_1 || '',
    apto_banco: row.apto_banco || '',
    alternativa_menor_1: row.alternativa_menor_1 || '',
    alternativa_menor_2: row.alternativa_menor_2 || '',
    alternativa_menor_3: row.alternativa_menor_3 || '',
    alterniva_menor_4: row.alterniva_menor_4 || '',
    alternativa_menor_5: row.alternativa_menor_5 || '',
    alternativa_mayor: row.alternativa_mayor || '',
    alternativa_mayor_2: row.alternativa_mayor_2 || '',
    alternativa_mayor_3: row.alternativa_mayor_3 || '',
    alternativa_mayor_4: row.alternativa_mayor_4 || '',
    alternativa_mayor_5: row.alternativa_mayor_5 || '',
  };
};

/**
 * Obtiene todas las propiedades de la tabla propiedades
 */
export const getAllPropiedades = async (): Promise<SupabasePropiedad[]> => {
  try {
    const { data, error } = await (getSupabase() as any)
      .from('propiedades')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Error fetching propiedades from Supabase:', error.message);
      return [];
    }

    return ((data as any[]) || []).map(mapPropiedadRow);
  } catch (e) {
    console.error('Supabase not configured or failed to initialize:', e);
    return [];
  }
};

/**
 * Obtiene una propiedad por ID
 */
export const getPropiedadById = async (id: string): Promise<SupabasePropiedad | null> => {
  try {
    const { data, error } = await (getSupabase() as any)
      .from('propiedades')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching propiedad from Supabase:', error.message);
      return null;
    }

    return data ? mapPropiedadRow(data) : null;
  } catch (e) {
    console.error('Error getting propiedad by id:', e);
    return null;
  }
};

/**
 * Crea una nueva propiedad
 */
export const createPropiedad = async (propiedad: Omit<SupabasePropiedad, 'id'>): Promise<SupabasePropiedad | null> => {
  try {
    const { data, error } = await (getSupabase() as any)
      .from('propiedades')
      .insert([propiedad])
      .select()
      .single();

    if (error) {
      console.error('Error creating propiedad in Supabase:', error.message);
      return null;
    }

    return data ? mapPropiedadRow(data) : null;
  } catch (e) {
    console.error('Error creating propiedad:', e);
    return null;
  }
};

/**
 * Actualiza una propiedad existente
 */
export const updatePropiedad = async (id: string, propiedad: Partial<SupabasePropiedad>): Promise<SupabasePropiedad | null> => {
  try {
    // Remover el id del objeto si está presente
    const { id: _, ...updateData } = propiedad;

    const { data, error } = await (getSupabase() as any)
      .from('propiedades')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating propiedad in Supabase:', error.message);
      return null;
    }

    return data ? mapPropiedadRow(data) : null;
  } catch (e) {
    console.error('Error updating propiedad:', e);
    return null;
  }
};

/**
 * Elimina una propiedad
 */
export const deletePropiedad = async (id: string): Promise<boolean> => {
  try {
    const { error } = await (getSupabase() as any)
      .from('propiedades')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting propiedad from Supabase:', error.message);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Error deleting propiedad:', e);
    return false;
  }
};

