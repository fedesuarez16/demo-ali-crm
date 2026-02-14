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
 * Genera variantes de un remote_jid para buscar en la DB
 * Ya que puede estar guardado con o sin +, con o sin @s.whatsapp.net, etc.
 */
const getRemoteJidVariantes = (remoteJid: string): string[] => {
  const soloDigitos = remoteJid.replace(/[^\d]/g, '');
  const variantes = new Set<string>();
  variantes.add(remoteJid); // Original
  variantes.add(soloDigitos); // Solo dígitos
  variantes.add(`+${soloDigitos}`); // Con +
  return Array.from(variantes);
};

/**
 * Elimina TODOS los seguimientos de un lead por su remote_jid (cualquier estado)
 * Busca y elimina en ambas tablas: cola_seguimientos y cola_seguimientos_dos
 * Prueba múltiples variantes del remote_jid (con/sin +) para asegurar que se eliminen todos
 */
export const eliminarTodosSeguimientosPendientes = async (remoteJid: string): Promise<boolean> => {
  try {
    let allSuccess = true;
    const variantes = getRemoteJidVariantes(remoteJid);
    console.log(`🗑️ Eliminando seguimientos para variantes:`, variantes);
    
    // Eliminar de cola_seguimientos con todas las variantes del remote_jid
    const { error: errorCola1 } = await (getSupabase() as any)
      .from('cola_seguimientos')
      .delete()
      .in('remote_jid', variantes);
    
    if (errorCola1) {
      console.error('Error eliminando seguimientos de cola_seguimientos:', errorCola1.message);
      allSuccess = false;
    } else {
      console.log(`✅ Seguimientos eliminados de cola_seguimientos para ${remoteJid}`);
    }
    
    // Eliminar de cola_seguimientos_dos con todas las variantes
    const { error: errorCola2 } = await (getSupabase() as any)
      .from('cola_seguimientos_dos')
      .delete()
      .in('remote_jid', variantes);
    
    if (errorCola2) {
      console.error('Error eliminando seguimientos de cola_seguimientos_dos:', errorCola2.message);
      allSuccess = false;
    } else {
      console.log(`✅ Seguimientos eliminados de cola_seguimientos_dos para ${remoteJid}`);
    }
    
    return allSuccess;
  } catch (e) {
    console.error('Exception eliminando todos los seguimientos:', e);
    return false;
  }
};

/**
 * Verifica si un remote_jid tiene seguimientos en cola_seguimientos (cualquier estado)
 * Prueba múltiples variantes del remote_jid (con/sin +) para encontrar coincidencias
 * Retorna true si existe al menos un registro
 */
export const existeSeguimientoParaLead = async (remoteJid: string): Promise<boolean> => {
  try {
    const variantes = getRemoteJidVariantes(remoteJid);
    console.log(`🔍 Buscando seguimientos para variantes:`, variantes);
    
    // Buscar en cola_seguimientos con todas las variantes
    const { data: dataCola1, error: errorCola1 } = await (getSupabase() as any)
      .from('cola_seguimientos')
      .select('id')
      .in('remote_jid', variantes)
      .limit(1);
    
    if (!errorCola1 && dataCola1 && dataCola1.length > 0) {
      console.log(`✅ Seguimiento encontrado en cola_seguimientos`);
      return true;
    }
    
    // Buscar en cola_seguimientos_dos con todas las variantes
    const { data: dataCola2, error: errorCola2 } = await (getSupabase() as any)
      .from('cola_seguimientos_dos')
      .select('id')
      .in('remote_jid', variantes)
      .limit(1);
    
    if (!errorCola2 && dataCola2 && dataCola2.length > 0) {
      console.log(`✅ Seguimiento encontrado en cola_seguimientos_dos`);
      return true;
    }
    
    console.log(`❌ No se encontraron seguimientos para ${remoteJid}`);
    return false;
  } catch (e) {
    console.error('Exception verificando existencia de seguimiento:', e);
    return false;
  }
};

/**
 * Mueve un mensaje de una tabla a otra
 * @param id - ID del mensaje
 * @param tablaOrigen - Tabla de origen: 'cola_seguimientos' o 'cola_seguimientos_dos'
 * @param tablaDestino - Tabla de destino: 'cola_seguimientos' o 'cola_seguimientos_dos'
 * @returns El nuevo ID del mensaje en la tabla destino, o null si falla
 */
export const moverMensajeEntreTablas = async (
  id: number,
  tablaOrigen: string,
  tablaDestino: string
): Promise<number | null> => {
  try {
    // Leer el mensaje de la tabla origen
    const { data: mensajeData, error: errorRead } = await (getSupabase() as any)
      .from(tablaOrigen)
      .select('*')
      .eq('id', id)
      .single();
    
    if (errorRead || !mensajeData) {
      console.error(`Error leyendo mensaje de ${tablaOrigen}:`, errorRead?.message);
      return null;
    }
    
    // Preparar datos para insertar (sin el ID para que genere uno nuevo)
    // Preservar TODOS los campos incluyendo chatwoot_conversation_id
    const { id: _, created_at: __, updated_at: ___, ...dataToInsert } = mensajeData;
    
    // Log para verificar que chatwoot_conversation_id se preserve
    if (mensajeData.chatwoot_conversation_id) {
      console.log(`📋 Preservando chatwoot_conversation_id: ${mensajeData.chatwoot_conversation_id} al mover mensaje`);
    }
    
    // Insertar en la tabla destino
    const { data: newMensaje, error: errorInsert } = await (getSupabase() as any)
      .from(tablaDestino)
      .insert([dataToInsert])
      .select()
      .single();
    
    if (errorInsert || !newMensaje) {
      console.error(`Error insertando mensaje en ${tablaDestino}:`, errorInsert?.message);
      return null;
    }
    
    // Verificar que chatwoot_conversation_id se preservó
    if (mensajeData.chatwoot_conversation_id && newMensaje.chatwoot_conversation_id !== mensajeData.chatwoot_conversation_id) {
      console.warn(`⚠️ chatwoot_conversation_id no se preservó correctamente. Original: ${mensajeData.chatwoot_conversation_id}, Nuevo: ${newMensaje.chatwoot_conversation_id}`);
    }
    
    // Eliminar de la tabla origen
    const { error: errorDelete } = await (getSupabase() as any)
      .from(tablaOrigen)
      .delete()
      .eq('id', id);
    
    if (errorDelete) {
      console.error(`Error eliminando mensaje de ${tablaOrigen}:`, errorDelete?.message);
      // Intentar revertir: eliminar el mensaje insertado en la tabla destino
      await (getSupabase() as any)
        .from(tablaDestino)
        .delete()
        .eq('id', newMensaje.id);
      return null;
    }
    
    console.log(`✅ Mensaje movido de ${tablaOrigen} a ${tablaDestino}. ID anterior: ${id}, ID nuevo: ${newMensaje.id}`);
    return newMensaje.id;
  } catch (e) {
    console.error('Exception moviendo mensaje entre tablas:', e);
    return null;
  }
};

/**
 * Extrae el número del toque de una plantilla
 * @param plantilla - Nombre de la plantilla (ej: 'toque_1_frio', 'toque_2_tibio', 'toque_3_tibio')
 * @returns El número del toque (1-8) o null si no se puede determinar
 */
const extraerNumeroToque = (plantilla: string | null): number | null => {
  if (!plantilla) return null;
  
  // Buscar el patrón "toque_X_" donde X es el número
  const match = plantilla.match(/toque_(\d+)_/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  
  return null;
};

/**
 * Determina si una plantilla es de tipo "frio" o "tibio"
 * @param plantilla - Nombre de la plantilla
 * @returns 'frio', 'tibio', o null si no se puede determinar
 */
const extraerTipoToque = (plantilla: string | null): 'frio' | 'tibio' | null => {
  if (!plantilla) return null;
  
  if (plantilla.includes('_frio')) return 'frio';
  if (plantilla.includes('_tibio')) return 'tibio';
  
  return null;
};

/**
 * Actualiza la plantilla de un mensaje programado
 * Si la plantilla requiere estar en otra tabla, mueve el mensaje automáticamente
 * También actualiza el seguimientos_count en cola_seguimientos según el número del toque
 * @param id - ID del mensaje
 * @param plantilla - Nombre de la plantilla a asignar (puede ser null para quitar la plantilla)
 * @param tablaOrigen - Tabla de origen: 'cola_seguimientos' o 'cola_seguimientos_dos'
 * @returns Objeto con { success: boolean, nuevaTabla?: string, nuevoId?: number }
 */
export const actualizarPlantillaMensaje = async (
  id: number, 
  plantilla: string | null, 
  tablaOrigen?: string
): Promise<{ success: boolean; nuevaTabla?: string; nuevoId?: number }> => {
  try {
    const tabla = tablaOrigen || 'cola_seguimientos';
    
    // Determinar en qué tabla debe estar según la plantilla
    // toque_2_frio → debe estar en cola_seguimientos_dos
    // Cualquier otra plantilla o sin plantilla → debe estar en cola_seguimientos
    const tablaDestino = plantilla === 'toque_2_frio' ? 'cola_seguimientos_dos' : 'cola_seguimientos';
    
    // Calcular seguimientos_count basado en el número del toque y tipo
    // Fríos: Toque 1-8 → seguimientos_count = 1-8
    // Tibios: Toque 1-8 (en nombre) → seguimientos_count = 9-16
    const numeroToque = extraerNumeroToque(plantilla);
    const tipoToque = extraerTipoToque(plantilla);
    
    let seguimientosCount: number | null = null;
    if (numeroToque !== null && tipoToque) {
      if (tipoToque === 'frio') {
        // Fríos: seguimientos_count = número del toque (1-8)
        seguimientosCount = numeroToque;
      } else if (tipoToque === 'tibio') {
        // Tibios: seguimientos_count = número del toque + 8 (9-16)
        seguimientosCount = numeroToque + 8;
      }
    }
    
    // Preparar los datos a actualizar
    // IMPORTANTE: Solo actualizar plantilla y seguimientos_count
    // NO tocar otros campos como chatwoot_conversation_id
    const datosActualizacion: any = { plantilla: plantilla };
    
    // Solo actualizar seguimientos_count si estamos en cola_seguimientos
    // y tenemos un número de toque válido
    if (tablaDestino === 'cola_seguimientos' && seguimientosCount !== null) {
      datosActualizacion.seguimientos_count = seguimientosCount;
      console.log(`📊 Actualizando seguimientos_count a ${seguimientosCount} para toque ${numeroToque}`);
    }
    
    // Log para debugging - verificar qué campos se van a actualizar
    console.log(`🔄 Campos a actualizar:`, Object.keys(datosActualizacion));
    
    // Si necesita moverse a otra tabla
    if (tabla !== tablaDestino) {
      console.log(`🔄 Moviendo mensaje de ${tabla} a ${tablaDestino} para plantilla ${plantilla}`);
      
      // Mover el mensaje entre tablas (esto preserva todos los campos incluyendo chatwoot_conversation_id)
      const nuevoId = await moverMensajeEntreTablas(id, tabla, tablaDestino);
      
      if (!nuevoId) {
        console.error('❌ Error moviendo mensaje entre tablas');
        return { success: false };
      }
      
      // Verificar que el mensaje movido tenga chatwoot_conversation_id antes de actualizar
      const { data: mensajeMovido, error: errorRead } = await (getSupabase() as any)
        .from(tablaDestino)
        .select('chatwoot_conversation_id, plantilla')
        .eq('id', nuevoId)
        .single();
      
      if (mensajeMovido?.chatwoot_conversation_id) {
        console.log(`✅ chatwoot_conversation_id preservado después de mover: ${mensajeMovido.chatwoot_conversation_id}`);
      }
      
      // Actualizar solo la plantilla y seguimientos_count en la nueva tabla
      // No tocar otros campos como chatwoot_conversation_id
      const { error } = await (getSupabase() as any)
        .from(tablaDestino)
        .update(datosActualizacion)
        .eq('id', nuevoId);
      
      if (error) {
        console.error(`Error actualizando plantilla del mensaje en ${tablaDestino}:`, error.message);
        return { success: false };
      }
      
      // Verificar que chatwoot_conversation_id sigue presente después de actualizar
      const { data: mensajeActualizado, error: errorReadAfter } = await (getSupabase() as any)
        .from(tablaDestino)
        .select('chatwoot_conversation_id')
        .eq('id', nuevoId)
        .single();
      
      if (mensajeMovido?.chatwoot_conversation_id && !mensajeActualizado?.chatwoot_conversation_id) {
        console.error(`❌ ERROR: chatwoot_conversation_id se perdió después de actualizar! Era: ${mensajeMovido.chatwoot_conversation_id}`);
      } else if (mensajeActualizado?.chatwoot_conversation_id) {
        console.log(`✅ chatwoot_conversation_id preservado después de actualizar: ${mensajeActualizado.chatwoot_conversation_id}`);
      }
      
      return { success: true, nuevaTabla: tablaDestino, nuevoId };
    }
    
    // Si ya está en la tabla correcta, actualizar solo la plantilla y seguimientos_count
    // No tocar otros campos como chatwoot_conversation_id
    const { error } = await (getSupabase() as any)
      .from(tabla)
      .update(datosActualizacion)
      .eq('id', id);
    
    if (error) {
      console.error(`Error actualizando plantilla del mensaje en ${tabla}:`, error.message);
      return { success: false };
    }
    
    return { success: true, nuevaTabla: tabla };
  } catch (e) {
    console.error('Exception actualizando plantilla del mensaje:', e);
    return { success: false };
  }
};

/**
 * Actualiza la fecha programada de un mensaje
 * @param id - ID del mensaje
 * @param fechaProgramada - Nueva fecha y hora programada (puede ser ISO string o formato "YYYY-MM-DD HH:mm:ss")
 * @param tablaOrigen - Tabla de origen: 'cola_seguimientos' o 'cola_seguimientos_dos'
 */
export const actualizarFechaProgramada = async (
  id: number,
  fechaProgramada: string,
  tablaOrigen?: string
): Promise<boolean> => {
  try {
    const tabla = tablaOrigen || 'cola_seguimientos';
    
    // Si ya está en formato "YYYY-MM-DD HH:mm:ss", usarlo directamente
    // Si está en formato ISO (con 'T' o con 'Z'), convertirlo
    let fechaFormateada: string;
    
    if (fechaProgramada.includes('T')) {
      // Formato ISO: "YYYY-MM-DDTHH:mm:ss" o "YYYY-MM-DDTHH:mm:ss.sssZ"
      fechaFormateada = fechaProgramada.replace('T', ' ').slice(0, 19);
    } else if (fechaProgramada.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/)) {
      // Ya está en formato "YYYY-MM-DD HH:mm:ss" o "YYYY-MM-DD HH:mm"
      fechaFormateada = fechaProgramada.length === 16 
        ? fechaProgramada + ':00' // Agregar segundos si faltan
        : fechaProgramada.slice(0, 19); // Asegurar que tenga exactamente 19 caracteres
    } else {
      // Intentar parsear como Date y convertir
      const date = new Date(fechaProgramada);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      fechaFormateada = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    
    const { error } = await (getSupabase() as any)
      .from(tabla)
      .update({ fecha_programada: fechaFormateada })
      .eq('id', id);
    
    if (error) {
      console.error(`Error actualizando fecha programada del mensaje en ${tabla}:`, error.message);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Exception actualizando fecha programada del mensaje:', e);
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
 * Si ya existe un mensaje programado con el mismo remote_jid, actualiza solo la fecha_programada
 * Si no existe, crea uno nuevo programado para dentro de 23 horas desde ahora
 * @returns Objeto con { success: boolean, actualizado: boolean, mensajeId?: number }
 */
export const programarSeguimiento = async (seguimientoData: {
  remote_jid: string;
  session_id?: string;
  tipo_lead?: string;
  fecha_ultima_interaccion?: string;
  chatwoot_conversation_id?: number;
  seguimientos_count?: number;
}): Promise<{ success: boolean; actualizado: boolean; mensajeId?: number }> => {
  try {
    console.log('🔔 Programando seguimiento:', seguimientoData);
    
    // Normalizar remote_jid: remover espacios, caracteres especiales, etc.
    const remoteJidNormalizado = seguimientoData.remote_jid
      .trim()
      .replace(/[^\d]/g, '') // Remover todo excepto dígitos
      .replace(/^\+/, ''); // Remover + al inicio si existe
    
    console.log(`🔍 Buscando mensajes con remote_jid: "${seguimientoData.remote_jid}" (normalizado: "${remoteJidNormalizado}")`);
    
    // Calcular fecha programada: ahora + 23 horas
    const ahora = new Date();
    const fechaProgramada = new Date(ahora.getTime() + (23 * 60 * 60 * 1000)); // 23 horas en milisegundos
    const fechaProgramadaFormateada = fechaProgramada.toISOString().replace('T', ' ').slice(0, 19); // Formato timestamp sin timezone
    
    // Primero buscar TODOS los mensajes con ese remote_jid (sin filtro de estado) para debug
    const { data: todosLosMensajes, error: errorBusquedaTodos } = await (getSupabase() as any)
      .from('cola_seguimientos')
      .select('id, remote_jid, estado, fecha_programada')
      .eq('remote_jid', seguimientoData.remote_jid);
    
    console.log(`📊 Total de mensajes encontrados con remote_jid "${seguimientoData.remote_jid}":`, todosLosMensajes?.length || 0);
    if (todosLosMensajes && todosLosMensajes.length > 0) {
      console.log('📋 Mensajes encontrados:', todosLosMensajes.map((m: any) => ({
        id: m.id,
        remote_jid: m.remote_jid,
        estado: m.estado,
        fecha_programada: m.fecha_programada
      })));
    }
    
    // Buscar si ya existe un mensaje programado con el mismo remote_jid en cola_seguimientos
    // Buscar tanto pendientes como enviados, ordenados por fecha_programada (más próximo primero)
    // Intentar búsqueda exacta primero
    let mensajesExistentes: any[] = [];
    let errorBusqueda: any = null;
    
    const { data: mensajesExactos, error: errorExacto } = await (getSupabase() as any)
      .from('cola_seguimientos')
      .select('*')
      .eq('remote_jid', seguimientoData.remote_jid)
      .in('estado', ['pendiente', 'enviado'])
      .order('fecha_programada', { ascending: true });
    
    if (errorExacto) {
      console.error('❌ Error en búsqueda exacta:', errorExacto.message);
      errorBusqueda = errorExacto;
    } else if (mensajesExactos && mensajesExactos.length > 0) {
      mensajesExistentes = mensajesExactos;
      console.log(`✅ Búsqueda exacta: ${mensajesExistentes.length} mensaje(s) encontrado(s)`);
    } else {
      // Si no se encuentra con búsqueda exacta, intentar buscar todos y filtrar manualmente
      // Esto ayuda a detectar problemas de formato
      console.log('⚠️ No se encontró con búsqueda exacta. Buscando todos los mensajes para comparación...');
      
      const { data: todosMensajes, error: errorTodos } = await (getSupabase() as any)
        .from('cola_seguimientos')
        .select('*')
        .in('estado', ['pendiente', 'enviado']);
      
      if (!errorTodos && todosMensajes) {
        // Normalizar y comparar manualmente
        const mensajesCoincidentes = todosMensajes.filter((m: any) => {
          if (!m.remote_jid) return false;
          // Normalizar ambos para comparar
          const mJidNormalizado = String(m.remote_jid).trim().replace(/[^\d]/g, '').replace(/^\+/, '');
          const buscadoNormalizado = remoteJidNormalizado;
          return mJidNormalizado === buscadoNormalizado;
        });
        
        if (mensajesCoincidentes.length > 0) {
          // Ordenar por fecha_programada
          mensajesCoincidentes.sort((a: any, b: any) => {
            const fechaA = a.fecha_programada ? new Date(a.fecha_programada).getTime() : 0;
            const fechaB = b.fecha_programada ? new Date(b.fecha_programada).getTime() : 0;
            return fechaA - fechaB;
          });
          mensajesExistentes = mensajesCoincidentes;
          console.log(`✅ Búsqueda normalizada: ${mensajesExistentes.length} mensaje(s) encontrado(s) después de normalizar`);
          console.log(`⚠️ ADVERTENCIA: Los remote_jid no coincidían exactamente. Original: "${seguimientoData.remote_jid}", Encontrado: "${mensajesExistentes[0].remote_jid}"`);
        }
      }
    }
    
    console.log(`🔍 Total de mensajes pendientes/enviados encontrados:`, mensajesExistentes.length);
    
    if (errorBusqueda && mensajesExistentes.length === 0) {
      console.error('❌ Error buscando mensajes existentes:', errorBusqueda.message, errorBusqueda);
      // Continuar con la creación de un nuevo mensaje
    } else if (mensajesExistentes && mensajesExistentes.length > 0) {
      // Existe al menos un mensaje, actualizar el más próximo (el primero en la lista ordenada)
      const mensajeMasProximo = mensajesExistentes[0];
      console.log(`📋 Mensaje existente encontrado (ID: ${mensajeMasProximo.id}). Actualizando fecha_programada y seguimientos_count.`);
      
      // Preparar datos a actualizar: fecha_programada y seguimientos_count (si viene en los datos)
      const datosActualizacion: any = { fecha_programada: fechaProgramadaFormateada };
      
      // Actualizar seguimientos_count si viene en los datos (por ejemplo, cuando se selecciona un toque)
      if (seguimientoData.seguimientos_count !== undefined && seguimientoData.seguimientos_count !== null) {
        datosActualizacion.seguimientos_count = seguimientoData.seguimientos_count;
        console.log(`📊 Actualizando seguimientos_count a ${seguimientoData.seguimientos_count}`);
      }
      
      // Actualizar fecha_programada y seguimientos_count (si aplica), sin tocar otros campos (especialmente chatwoot_conversation_id)
      const { error: errorUpdate } = await (getSupabase() as any)
        .from('cola_seguimientos')
        .update(datosActualizacion)
        .eq('id', mensajeMasProximo.id);
      
      if (errorUpdate) {
        console.error('Error actualizando mensaje existente:', errorUpdate.message);
        return { success: false, actualizado: false };
      }
      
      console.log(`✅ Mensaje actualizado exitosamente (ID: ${mensajeMasProximo.id})`);
      console.log(`📅 Nueva fecha: ${fechaProgramadaFormateada}`);
      if (seguimientoData.seguimientos_count !== undefined) {
        console.log(`📊 Nuevo seguimientos_count: ${seguimientoData.seguimientos_count}`);
      }
      
      // Verificar que chatwoot_conversation_id se preservó
      if (mensajeMasProximo.chatwoot_conversation_id) {
        console.log(`✅ chatwoot_conversation_id preservado: ${mensajeMasProximo.chatwoot_conversation_id}`);
      }
      
      return { success: true, actualizado: true, mensajeId: mensajeMasProximo.id };
    }
    
    // No existe ningún mensaje, crear uno nuevo
    console.log('📝 No se encontró mensaje existente con estado pendiente/enviado.');
    console.log(`📝 Creando nuevo mensaje programado con remote_jid: "${seguimientoData.remote_jid}"`);
    
    // Preparar datos para insertar según la estructura real de la tabla
    const dataToInsert: any = {
      remote_jid: seguimientoData.remote_jid,
      session_id: seguimientoData.session_id || seguimientoData.remote_jid, // Usar remote_jid como fallback si no hay session_id
      fecha_programada: fechaProgramadaFormateada,
      estado: 'pendiente'
    };
    
    // Agregar campos opcionales si existen
    if (seguimientoData.tipo_lead) {
      dataToInsert.tipo_lead = seguimientoData.tipo_lead;
    }
    
    if (seguimientoData.fecha_ultima_interaccion) {
      dataToInsert.fecha_ultima_interaccion = seguimientoData.fecha_ultima_interaccion;
    }
    
    // IMPORTANTE: Agregar chatwoot_conversation_id solo si viene en los datos (para nuevos registros)
    // Pero nunca modificar el existente
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
      return { success: false, actualizado: false };
    }
    
    console.log('✅ Seguimiento programado exitosamente (nuevo):', data);
    const nuevoMensajeId = data && data[0] ? data[0].id : undefined;
    return { success: true, actualizado: false, mensajeId: nuevoMensajeId };
  } catch (e) {
    console.error('Exception programando seguimiento:', e);
    return { success: false, actualizado: false };
  }
};
