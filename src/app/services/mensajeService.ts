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

export interface MensajeProgramado {
  id?: number;
  remote_jid: string;
  mensaje: string;
  scheduled_at: string;
  enviado?: boolean;
  enviado_at?: string | null;
}

// Interfaz para cola_seguimientos
export interface ColaSeguimiento {
  id?: number;
  lead_id?: string | number;
  remote_jid?: string;
  mensaje?: string;
  fecha_programada?: string;
  scheduled_at?: string;
  enviado?: boolean;
  enviado_at?: string | null;
  estado?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any; // Para campos adicionales que pueda tener la tabla
}

/**
 * Programa un mensaje para enviar más tarde
 */
export const programarMensaje = async (mensajeData: Omit<MensajeProgramado, 'id' | 'enviado' | 'enviado_at'>): Promise<boolean> => {
  try {
    console.log('Programando mensaje:', mensajeData);
    
    const { data, error } = await (getSupabase() as any)
      .from('mensajes_programados')
      .insert({
        remote_jid: mensajeData.remote_jid,
        mensaje: mensajeData.mensaje,
        scheduled_at: mensajeData.scheduled_at,
        enviado: false
      })
      .select();
    
    if (error) {
      console.error('Error programando mensaje:', error.message, error);
      return false;
    }
    
    console.log('Mensaje programado exitosamente:', data);
    return true;
  } catch (e) {
    console.error('Exception programando mensaje:', e);
    return false;
  }
};

/**
 * Obtiene todos los mensajes programados de la tabla cola_seguimientos con estado pendiente
 */
export const getMensajesProgramados = async (): Promise<ColaSeguimiento[]> => {
  try {
    const { data, error } = await (getSupabase() as any)
      .from('cola_seguimientos')
      .select('*')
      .eq('estado', 'pendiente')
      .order('fecha_programada', { ascending: true });
    
    if (error) {
      console.error('Error obteniendo mensajes programados de cola_seguimientos:', error.message);
      return [];
    }
    
    // Si no hay fecha_programada, intentar ordenar por scheduled_at
    const sorted = (data || []).sort((a: ColaSeguimiento, b: ColaSeguimiento) => {
      const dateA = new Date(a.fecha_programada || a.scheduled_at || a.created_at || 0).getTime();
      const dateB = new Date(b.fecha_programada || b.scheduled_at || b.created_at || 0).getTime();
      return dateA - dateB;
    });
    
    return sorted;
  } catch (e) {
    console.error('Supabase not configured or failed to initialize:', e);
    return [];
  }
};

/**
 * Elimina un mensaje programado de la cola
 */
export const eliminarMensajeProgramado = async (id: number): Promise<boolean> => {
  try {
    const { error } = await (getSupabase() as any)
      .from('cola_seguimientos')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error eliminando mensaje programado:', error.message);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Exception eliminando mensaje programado:', e);
    return false;
  }
};

/**
 * Marca un mensaje como enviado
 */
export const marcarMensajeEnviado = async (mensajeId: number): Promise<boolean> => {
  try {
    const { error } = await (getSupabase() as any)
      .from('mensajes_programados')
      .update({ 
        enviado: true, 
        enviado_at: new Date().toISOString() 
      })
      .eq('id', mensajeId);
    
    if (error) {
      console.error('Error marcando mensaje como enviado:', error.message);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Exception marcando mensaje como enviado:', e);
    return false;
  }
};
