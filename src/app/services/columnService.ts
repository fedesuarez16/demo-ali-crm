import { createClient } from '@supabase/supabase-js';

// Read from environment variables
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

export interface KanbanColumns {
  id: number;
  custom_columns: string[];
  visible_columns: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Obtiene las columnas personalizadas desde Supabase
 * Si no existen, devuelve valores por defecto
 */
export const getKanbanColumns = async (): Promise<{ customColumns: string[]; visibleColumns: string[] }> => {
  try {
    const { data, error } = await getSupabase()
      .from('kanban_columns')
      .select('*')
      .order('id', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching kanban columns from Supabase:', error.message);
      // En caso de error, devolver valores por defecto
      return {
        customColumns: [],
        visibleColumns: ['frío', 'tibio', 'caliente', 'llamada', 'visita']
      };
    }

    // Si no hay registros, devolver valores por defecto
    if (!data || data.length === 0) {
      console.log('No existe configuración de columnas, usando valores por defecto');
      return {
        customColumns: [],
        visibleColumns: ['frío', 'tibio', 'caliente', 'llamada', 'visita']
      };
    }

    // Usar el primer registro (más reciente)
    const latestRecord = data[0];
    return {
      customColumns: latestRecord.custom_columns || [],
      visibleColumns: latestRecord.visible_columns || ['frío', 'tibio', 'caliente', 'llamada', 'visita']
    };
  } catch (e) {
    console.error('Supabase not configured or failed to initialize:', e);
    // En caso de error, devolver valores por defecto
    return {
      customColumns: [],
      visibleColumns: ['frío', 'tibio', 'caliente', 'llamada', 'visita']
    };
  }
};

/**
 * Guarda las columnas personalizadas en Supabase
 * Si no existe un registro, lo crea. Si existe, lo actualiza.
 */
export const saveKanbanColumns = async (
  customColumns: string[],
  visibleColumns: string[]
): Promise<boolean> => {
  try {
    // Primero intentar obtener el registro existente
    const { data: existingData } = await getSupabase()
      .from('kanban_columns')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    const columnsData = {
      custom_columns: customColumns,
      visible_columns: visibleColumns,
      updated_at: new Date().toISOString()
    };

    if (existingData && existingData.length > 0 && existingData[0]?.id) {
      // Actualizar registro existente
      const { error } = await getSupabase()
        .from('kanban_columns')
        .update(columnsData)
        .eq('id', existingData[0].id);

      if (error) {
        console.error('Error updating kanban columns in Supabase:', error.message);
        return false;
      }

      console.log('Kanban columns updated successfully');
      return true;
    } else {
      // Crear nuevo registro
      const { error } = await getSupabase()
        .from('kanban_columns')
        .insert([columnsData]);

      if (error) {
        console.error('Error creating kanban columns in Supabase:', error.message);
        return false;
      }

      console.log('Kanban columns created successfully');
      return true;
    }
  } catch (e) {
    console.error('Exception saving kanban columns:', e);
    return false;
  }
};

/**
 * Migra datos de localStorage a Supabase (una sola vez)
 */
export const migrateColumnsFromLocalStorage = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  try {
    // Verificar si ya hay datos en Supabase
    const { data: existingData } = await getSupabase()
      .from('kanban_columns')
      .select('id')
      .limit(1);

    // Si ya hay datos en Supabase, no migrar
    if (existingData && existingData.length > 0) {
      console.log('Columns already exist in Supabase, skipping migration');
      return true;
    }

    // Intentar obtener datos de localStorage
    const savedCustomColumns = localStorage.getItem('customColumns');
    const savedVisibleColumns = localStorage.getItem('visibleColumns');

    if (savedCustomColumns || savedVisibleColumns) {
      const customColumns = savedCustomColumns ? JSON.parse(savedCustomColumns) : [];
      const visibleColumns = savedVisibleColumns ? JSON.parse(savedVisibleColumns) : ['frío', 'tibio', 'caliente', 'llamada', 'visita'];

      const success = await saveKanbanColumns(customColumns, visibleColumns);

      if (success) {
        // Opcional: limpiar localStorage después de migrar
        // localStorage.removeItem('customColumns');
        // localStorage.removeItem('visibleColumns');
        console.log('Successfully migrated columns from localStorage to Supabase');
      }

      return success;
    }

    return true;
  } catch (e) {
    console.error('Error migrating columns from localStorage:', e);
    return false;
  }
};

