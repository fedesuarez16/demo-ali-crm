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
  column_colors?: Record<string, string>; // Mapeo de nombre de columna -> color hex
  created_at?: string;
  updated_at?: string;
}

// Colores por defecto para las columnas estándar
const DEFAULT_COLORS: Record<string, string> = {
  'frío': '#3b82f6',      // Azul
  'tibio': '#eab308',     // Amarillo
  'caliente': '#ef4444',  // Rojo
  'llamada': '#8b5cf6',   // Púrpura
  'visita': '#10b981'     // Verde
};

/**
 * Obtiene las columnas personalizadas desde Supabase
 * Si no existen, devuelve valores por defecto
 */
export const getKanbanColumns = async (): Promise<{ 
  customColumns: string[]; 
  visibleColumns: string[]; 
  columnColors: Record<string, string> 
}> => {
  try {
    const { data, error } = await (getSupabase() as any)
      .from('kanban_columns')
      .select('*')
      .order('id', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching kanban columns from Supabase:', error.message);
      // En caso de error, devolver valores por defecto
      return {
        customColumns: [],
        visibleColumns: ['frío', 'tibio', 'caliente', 'llamada', 'visita'],
        columnColors: DEFAULT_COLORS
      };
    }

    // Si no hay registros, devolver valores por defecto
    if (!data || data.length === 0) {
      console.log('No existe configuración de columnas, usando valores por defecto');
      return {
        customColumns: [],
        visibleColumns: ['frío', 'tibio', 'caliente', 'llamada', 'visita'],
        columnColors: DEFAULT_COLORS
      };
    }

    // Usar el primer registro (más reciente) con tipo explícito
    const latestRecord = data[0] as KanbanColumns;
    const columnColors = (latestRecord.column_colors as Record<string, string>) || {};
    
    // Combinar con colores por defecto para asegurar que todas las columnas tengan color
    const mergedColors = { ...DEFAULT_COLORS, ...columnColors };
    
    return {
      customColumns: (latestRecord.custom_columns as string[]) || [],
      visibleColumns: (latestRecord.visible_columns as string[]) || ['frío', 'tibio', 'caliente', 'llamada', 'visita'],
      columnColors: mergedColors
    };
  } catch (e) {
    console.error('Supabase not configured or failed to initialize:', e);
    // En caso de error, devolver valores por defecto
    return {
      customColumns: [],
      visibleColumns: ['frío', 'tibio', 'caliente', 'llamada', 'visita'],
      columnColors: DEFAULT_COLORS
    };
  }
};

/**
 * Guarda las columnas personalizadas en Supabase
 * Si no existe un registro, lo crea. Si existe, lo actualiza.
 */
export const saveKanbanColumns = async (
  customColumns: string[],
  visibleColumns: string[],
  columnColors?: Record<string, string>
): Promise<boolean> => {
  try {
    // Primero intentar obtener el registro existente para preservar los colores existentes
    const { data: existingData } = await (getSupabase() as any)
      .from('kanban_columns')
      .select('*')
      .order('id', { ascending: false })
      .limit(1);

    let finalColumnColors: Record<string, string> = {};
    
    if (existingData && existingData.length > 0) {
      const existingRecord = existingData[0] as KanbanColumns;
      // Preservar colores existentes
      finalColumnColors = (existingRecord.column_colors as Record<string, string>) || {};
    }
    
    // Combinar con colores por defecto
    finalColumnColors = { ...DEFAULT_COLORS, ...finalColumnColors };
    
    // Si se proporcionan nuevos colores, actualizarlos
    if (columnColors) {
      finalColumnColors = { ...finalColumnColors, ...columnColors };
    }

    const columnsData = {
      custom_columns: customColumns,
      visible_columns: visibleColumns,
      column_colors: finalColumnColors,
      updated_at: new Date().toISOString()
    };

    if (existingData && existingData.length > 0) {
      const existingRecord = existingData[0] as { id: number };
      if (existingRecord?.id) {
        // Actualizar registro existente
        const { error } = await (getSupabase() as any)
          .from('kanban_columns')
          .update(columnsData)
          .eq('id', existingRecord.id);

        if (error) {
          console.error('Error updating kanban columns in Supabase:', error.message);
          return false;
        }

        console.log('Kanban columns updated successfully');
        return true;
      }
    }
    
    // Crear nuevo registro
    const { error } = await (getSupabase() as any)
      .from('kanban_columns')
      .insert([columnsData]);

    if (error) {
      console.error('Error creating kanban columns in Supabase:', error.message);
      return false;
    }

    console.log('Kanban columns created successfully');
    return true;
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
    const { data: existingData } = await (getSupabase() as any)
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

