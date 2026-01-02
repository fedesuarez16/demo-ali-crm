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
  tabla_origen?: string; // Para identificar de qué tabla viene: 'cola_seguimientos' o 'cola_seguimientos_dos'
  plantilla?: string | null; // Nombre de la plantilla seleccionada: 'toque_1_frio', 'toque_2_frio', 'toque_1_tibio', 'toque_2_tibio', 'toque_3_tibio'
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
 * Obtiene todos los mensajes programados de las tablas cola_seguimientos y cola_seguimientos_dos
 * Incluye mensajes con estado pendiente y enviado
 */
export const getMensajesProgramados = async (): Promise<ColaSeguimiento[]> => {
  try {
    const allMensajes: ColaSeguimiento[] = [];
    
    // Obtener mensajes de cola_seguimientos (pendientes y enviados)
    const { data: dataCola1, error: errorCola1 } = await (getSupabase() as any)
      .from('cola_seguimientos')
      .select('*')
      .in('estado', ['pendiente', 'enviado'])
      .order('fecha_programada', { ascending: true });
    
    if (errorCola1) {
      console.error('Error obteniendo mensajes programados de cola_seguimientos:', errorCola1.message);
    } else if (dataCola1) {
      // Agregar identificador de tabla origen
      const mensajesCola1 = dataCola1.map((m: ColaSeguimiento) => ({
        ...m,
        tabla_origen: 'cola_seguimientos'
      }));
      allMensajes.push(...mensajesCola1);
    }
    
    // Obtener mensajes de cola_seguimientos_dos (pendientes y enviados)
    const { data: dataCola2, error: errorCola2 } = await (getSupabase() as any)
      .from('cola_seguimientos_dos')
      .select('*')
      .in('estado', ['pendiente', 'enviado'])
      .order('fecha_programada', { ascending: true });
    
    if (errorCola2) {
      console.error('Error obteniendo mensajes programados de cola_seguimientos_dos:', errorCola2.message);
    } else if (dataCola2) {
      // Agregar identificador de tabla origen
      const mensajesCola2 = dataCola2.map((m: ColaSeguimiento) => ({
        ...m,
        tabla_origen: 'cola_seguimientos_dos'
      }));
      allMensajes.push(...mensajesCola2);
    }
    
    // Ordenar todos los mensajes por fecha programada
    const sorted = allMensajes.sort((a: ColaSeguimiento, b: ColaSeguimiento) => {
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
 * @param id - ID del mensaje
 * @param tablaOrigen - Tabla de origen: 'cola_seguimientos' o 'cola_seguimientos_dos'
 */
export const eliminarMensajeProgramado = async (id: number, tablaOrigen?: string): Promise<boolean> => {
  try {
    const tabla = tablaOrigen || 'cola_seguimientos';
    const { error } = await (getSupabase() as any)
      .from(tabla)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error eliminando mensaje programado de ${tabla}:`, error.message);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Exception eliminando mensaje programado:', e);
    return false;
  }
};

/**
 * Actualiza la plantilla de un mensaje programado
 * @param id - ID del mensaje
 * @param plantilla - Nombre de la plantilla a asignar (puede ser null para quitar la plantilla)
 * @param tablaOrigen - Tabla de origen: 'cola_seguimientos' o 'cola_seguimientos_dos'
 */
export const actualizarPlantillaMensaje = async (
  id: number, 
  plantilla: string | null, 
  tablaOrigen?: string
): Promise<boolean> => {
  try {
    const tabla = tablaOrigen || 'cola_seguimientos';
    const { error } = await (getSupabase() as any)
      .from(tabla)
      .update({ plantilla: plantilla })
      .eq('id', id);
    
    if (error) {
      console.error(`Error actualizando plantilla del mensaje en ${tabla}:`, error.message);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Exception actualizando plantilla del mensaje:', e);
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

/**
 * Obtiene los seguimientos pendientes de un lead por remote_jid
 * @param remoteJid - Número de teléfono del lead
 */
export const getSeguimientosPendientes = async (remoteJid: string): Promise<ColaSeguimiento[]> => {
  try {
    const allSeguimientos: ColaSeguimiento[] = [];
    
    // Buscar en cola_seguimientos
    const { data: dataCola1, error: errorCola1 } = await (getSupabase() as any)
      .from('cola_seguimientos')
      .select('*')
      .eq('remote_jid', remoteJid)
      .eq('estado', 'pendiente')
      .order('fecha_programada', { ascending: true });
    
    if (errorCola1) {
      console.error('Error obteniendo seguimientos pendientes de cola_seguimientos:', errorCola1.message);
    } else if (dataCola1) {
      const seguimientosCola1 = dataCola1.map((m: ColaSeguimiento) => ({
        ...m,
        tabla_origen: 'cola_seguimientos'
      }));
      allSeguimientos.push(...seguimientosCola1);
    }
    
    // Buscar en cola_seguimientos_dos
    const { data: dataCola2, error: errorCola2 } = await (getSupabase() as any)
      .from('cola_seguimientos_dos')
      .select('*')
      .eq('remote_jid', remoteJid)
      .eq('estado', 'pendiente')
      .order('fecha_programada', { ascending: true });
    
    if (errorCola2) {
      console.error('Error obteniendo seguimientos pendientes de cola_seguimientos_dos:', errorCola2.message);
    } else if (dataCola2) {
      const seguimientosCola2 = dataCola2.map((m: ColaSeguimiento) => ({
        ...m,
        tabla_origen: 'cola_seguimientos_dos'
      }));
      allSeguimientos.push(...seguimientosCola2);
    }
    
    return allSeguimientos;
  } catch (e) {
    console.error('Exception obteniendo seguimientos pendientes:', e);
    return [];
  }
};

/**
 * Programa un seguimiento para un lead en cola_seguimientos
 * Programa para dentro de 23 horas desde ahora
 */
export const programarSeguimiento = async (seguimientoData: {
  remote_jid: string;
  session_id?: string;
  tipo_lead?: string;
  fecha_ultima_interaccion?: string;
  chatwoot_conversation_id?: number;
  seguimientos_count?: number;
}): Promise<boolean> => {
  try {
    console.log('Programando seguimiento:', seguimientoData);
    
    // Calcular fecha programada: ahora + 23 horas
    const ahora = new Date();
    const fechaProgramada = new Date(ahora.getTime() + (23 * 60 * 60 * 1000)); // 23 horas en milisegundos
    
    // Preparar datos para insertar según la estructura real de la tabla
    const dataToInsert: any = {
      remote_jid: seguimientoData.remote_jid,
      session_id: seguimientoData.session_id || seguimientoData.remote_jid, // Usar remote_jid como fallback si no hay session_id
      fecha_programada: fechaProgramada.toISOString().replace('T', ' ').slice(0, 19), // Formato timestamp sin timezone
      estado: 'pendiente'
    };
    
    // Agregar campos opcionales si existen
    if (seguimientoData.tipo_lead) {
      dataToInsert.tipo_lead = seguimientoData.tipo_lead;
    }
    
    if (seguimientoData.fecha_ultima_interaccion) {
      dataToInsert.fecha_ultima_interaccion = seguimientoData.fecha_ultima_interaccion;
    }
    
    if (seguimientoData.chatwoot_conversation_id) {
      dataToInsert.chatwoot_conversation_id = seguimientoData.chatwoot_conversation_id;
    }
    
    if (seguimientoData.seguimientos_count !== undefined && seguimientoData.seguimientos_count !== null) {
      dataToInsert.seguimientos_count = seguimientoData.seguimientos_count;
    }
    
    const { data, error } = await (getSupabase() as any)
      .from('cola_seguimientos')
      .insert([dataToInsert])
      .select();
    
    if (error) {
      console.error('Error programando seguimiento:', error.message, error);
      return false;
    }
    
    console.log('Seguimiento programado exitosamente:', data);
    return true;
  } catch (e) {
    console.error('Exception programando seguimiento:', e);
    return false;
  }
};
