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
 * Obtiene todos los mensajes programados
 */
export const getMensajesProgramados = async (): Promise<MensajeProgramado[]> => {
  try {
    const { data, error } = await (getSupabase() as any)
      .from('mensajes_programados')
      .select('*')
      .order('scheduled_at', { ascending: true });
    
    if (error) {
      console.error('Error obteniendo mensajes programados:', error.message);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error('Supabase not configured or failed to initialize:', e);
    return [];
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
