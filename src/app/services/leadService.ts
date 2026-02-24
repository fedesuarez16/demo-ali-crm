import { createClient } from '@supabase/supabase-js';
import { Lead, FilterOptions, LeadStatus } from '../types';

// Read from environment variables. Ensure these are set in your environment.
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
// Local in-memory cache to support filtering on already-fetched data
let cachedLeads: Lead[] = [];

// Mapa de nombres originales a nombres normalizados/agrupados
let campaignGroupMap: Map<string, string> = new Map();
let campaignGroups: Map<string, string[]> = new Map(); // Grupo representativo -> [variantes]

/**
 * Normaliza un nombre de campaña para comparación
 */
const normalizeCampaignName = (name: string): string => {
  if (!name) return '';
  
  // Convertir a minúsculas y trim
  let normalized = name.toLowerCase().trim();
  
  // Remover acentos
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Remover caracteres especiales y múltiples espacios
  normalized = normalized.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Remover palabras comunes que no aportan valor para identificar direcciones
  const commonWords = [
    'entre', 'y', 'con', 'sin', 'de', 'del', 'la', 'el', 'las', 'los',
    'av', 'avenida', 'calle', 'c', 'av.', 'calle.', 'entre', 'esq',
    'esquina', 'altura', 'al', 'numero', 'nro', 'n°', '#', 'casa', 'departamento', 'depto'
  ];
  
  // Dividir en palabras y filtrar palabras comunes
  const words = normalized.split(' ').filter(word => {
    const cleanWord = word.trim();
    // Mantener palabras significativas (más de 1 carácter y no en la lista de comunes)
    return cleanWord.length > 1 && !commonWords.includes(cleanWord);
  });
  
  // Reunir palabras significativas
  normalized = words.join(' ').trim();
  
  return normalized;
};

/**
 * Calcula la similitud entre dos strings (0-1)
 * Optimizado para detectar direcciones similares
 */
const stringSimilarity = (str1: string, str2: string): number => {
  const s1 = normalizeCampaignName(str1);
  const s2 = normalizeCampaignName(str2);
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  // Si uno contiene al otro completamente, alta similitud
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = Math.max(s1.length, s2.length);
    const shorter = Math.min(s1.length, s2.length);
    return Math.max(0.85, shorter / longer); // Mínimo 85% si uno contiene al otro
  }
  
  // Obtener palabras significativas (después de normalización)
  const words1 = s1.split(' ').filter(w => w.length > 1);
  const words2 = s2.split(' ').filter(w => w.length > 1);
  
  if (words1.length === 0 || words2.length === 0) {
    // Si después de normalizar no quedan palabras, comparar directamente
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    const lengthSimilarity = shorter.length / longer.length;
    return lengthSimilarity > 0.7 ? lengthSimilarity : 0.0;
  }
  
  // Calcular similitud por palabras comunes
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const commonWords = words1.filter(w => set2.has(w)).length;
  const totalWords = Math.max(words1.length, words2.length);
  
  if (totalWords === 0) return 0.5;
  
  const wordSimilarity = commonWords / totalWords;
  
  // Si tienen todas las palabras en común (o casi todas), alta similitud
  if (wordSimilarity >= 0.8) {
    return Math.min(1.0, wordSimilarity * 1.1); // Permitir hasta 110% para asegurar agrupación
  }
  
  // Si comparten más del 60% de palabras, considerar similitud media-alta
  if (wordSimilarity >= 0.6) {
    // Verificar si las palabras que no coinciden son muy similares
    const unique1 = words1.filter(w => !set2.has(w));
    const unique2 = words2.filter(w => !set1.has(w));
    
    // Si hay pocas palabras únicas, alta similitud
    if (unique1.length <= 1 && unique2.length <= 1) {
      return Math.max(0.75, wordSimilarity * 1.2);
    }
    
    return wordSimilarity;
  }
  
  // Si tienen menos del 60% de palabras en común, verificar si las palabras principales coinciden
  // (primeras 2-3 palabras suelen ser la dirección principal)
  const mainWords1 = words1.slice(0, Math.min(3, words1.length));
  const mainWords2 = words2.slice(0, Math.min(3, words2.length));
  const mainCommon = mainWords1.filter(w => set2.has(w)).length;
  const mainTotal = Math.max(mainWords1.length, mainWords2.length);
  
  if (mainTotal > 0 && mainCommon / mainTotal >= 0.8) {
    // Si las palabras principales coinciden en 80%+, considerar similitud alta
    return 0.75;
  }
  
  return wordSimilarity;
};

/**
 * Agrupa campañas similares
 */
const groupSimilarCampaigns = (campaigns: string[]): { groups: Map<string, string[]>, map: Map<string, string> } => {
  const groups = new Map<string, string[]>();
  const map = new Map<string, string>();
  const threshold = 0.65; // 65% de similitud para considerar iguales (más permisivo para direcciones)
  
  // Eliminar duplicados exactos antes de procesar
  const uniqueCampaigns = [...new Set(campaigns)];
  
  // Contar frecuencia de cada campaña (normalizada) para usar la más frecuente como representante
  const campaignCounts = new Map<string, number>();
  const normalizedToOriginal = new Map<string, string[]>();
  
  uniqueCampaigns.forEach(c => {
    const normalized = normalizeCampaignName(c);
    campaignCounts.set(normalized, (campaignCounts.get(normalized) || 0) + 1);
    
    if (!normalizedToOriginal.has(normalized)) {
      normalizedToOriginal.set(normalized, []);
    }
    normalizedToOriginal.get(normalized)!.push(c);
  });
  
  // Ordenar campañas por frecuencia (las más comunes primero para usarlas como representativas)
  const sortedCampaigns = uniqueCampaigns.sort((a, b) => {
    const countA = campaignCounts.get(normalizeCampaignName(a)) || 0;
    const countB = campaignCounts.get(normalizeCampaignName(b)) || 0;
    if (countB !== countA) return countB - countA; // Más frecuentes primero
    return a.localeCompare(b); // Luego alfabéticamente
  });
  
  // Rastrear qué campañas ya fueron agrupadas
  const processedCampaigns = new Set<string>();
  
  for (const campaign of sortedCampaigns) {
    // Si ya fue procesada, saltarla
    if (processedCampaigns.has(campaign)) continue;
    
    const normalized = normalizeCampaignName(campaign);
    let foundGroup = false;
    
    // Buscar si pertenece a algún grupo existente
    for (const [groupRep, variants] of groups.entries()) {
      // Comparar con el representante del grupo
      const similarity = stringSimilarity(campaign, groupRep);
      
      if (similarity >= threshold) {
        // Agregar a este grupo
        variants.push(campaign);
        map.set(campaign, groupRep);
        processedCampaigns.add(campaign);
        foundGroup = true;
        break;
      }
    }
    
    // Si no pertenece a ningún grupo, crear uno nuevo
    if (!foundGroup) {
      groups.set(campaign, [campaign]);
      map.set(campaign, campaign);
      processedCampaigns.add(campaign);
    }
  }
  
  return { groups, map };
};

// Función para normalizar estados de la base de datos
const normalizeEstadoFromDB = (estado: string | null | undefined): string => {
  if (!estado) return '';
  const estadoLower = estado.toLowerCase().trim();
  // Normalizar variaciones comunes
  if (estadoLower === 'fríos' || estadoLower === 'frios') return 'frío';
  if (estadoLower === 'tibios') return 'tibio';
  if (estadoLower === 'calientes') return 'caliente';
  if (estadoLower === 'llamadas') return 'llamada';
  if (estadoLower === 'visitas') return 'visita';
  return estadoLower;
};

// Map a DB row (snake_case or camelCase) into our Lead type
// Nota: mapLeadRow es síncrono, pero calificarLead es asíncrono
// Por lo tanto, si el estado necesita calificación, se hará después de forma asíncrona
const mapLeadRow = (row: any): Lead => {
  // Si el estado es null, 'inicial' o 'activo', mantenerlo para calificar después de forma asíncrona
  // Por ahora, usar 'frio' como valor por defecto temporal
  let estado = row.estado;
  if (!estado || estado === 'inicial' || estado === 'activo') {
    // No podemos llamar a calificarLead aquí porque es asíncrono
    // Se calificará después en getAllLeads
    estado = 'frio'; // Valor temporal, se actualizará después
  } else {
    // Normalizar el estado si viene de la BD (ej: "Fríos" -> "frío")
    estado = normalizeEstadoFromDB(estado);
  }
  
  return {
    id: String(row.id),
    nombreCompleto: row.nombre ?? '',
    email: '', // No existe en la tabla
    telefono: row.whatsapp_id ?? '',
    estado: estado as Lead['estado'], // Acepta cualquier estado, incluyendo personalizados
    presupuesto: Number(row.presupuesto ?? 0),
    zonaInteres: row.zona ?? '',
    tipoPropiedad: (row.tipo_propiedad ?? 'departamento') as Lead['tipoPropiedad'],
    superficieMinima: 0, // No existe en la tabla
    cantidadAmbientes: 0, // No existe en la tabla
    motivoInteres: (row.intencion ?? 'otro') as Lead['motivoInteres'],
    fechaContacto: row.created_at ?? new Date().toISOString(),
    observaciones: row.caracteristicas_buscadas ?? undefined,
    // Campos extras del esquema de Supabase (passthrough)
    whatsapp_id: row.whatsapp_id ?? undefined,
    nombre: row.nombre ?? undefined,
    zona: row.zona ?? undefined,
    tipo_propiedad: row.tipo_propiedad ?? undefined,
    forma_pago: row.forma_pago ?? undefined,
    intencion: row.intencion ?? undefined,
    caracteristicas_buscadas: row.caracteristicas_buscadas ?? undefined,
    caracteristicas_venta: row.caracteristicas_venta ?? undefined,
    propiedades_mostradas: row.propiedades_mostradas ?? undefined,
    propiedad_interes: row.propiedad_interes ?? undefined,
    ultima_interaccion: row.ultima_interaccion ?? undefined,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
    seguimientos_count: row.seguimientos_count ?? 0,
    notas: row.notas ?? undefined,
    // Normalizar estado_chat: debe ser 0 o 1 (número entero)
    // Si es null, undefined, 1 o '1', se considera 1 (activo por defecto)
    // Solo si es explícitamente 0 o '0', se considera inactivo
    estado_chat: (row.estado_chat === null || row.estado_chat === undefined || row.estado_chat === 1 || row.estado_chat === '1') ? 1 : 0,
    // chatwoot_conversation_id para calificación automática basada en mensajes
    chatwoot_conversation_id: row.chatwoot_conversation_id ?? undefined,
  };
};

/**
 * Busca leads por término de búsqueda (nombre, teléfono, propiedad_interes)
 * @param query - Término de búsqueda
 * @returns Array de leads que coinciden con la búsqueda
 */
export const searchLeads = async (query: string): Promise<Lead[]> => {
  try {
    if (!query || query.trim().length === 0) {
      return [];
    }
    
    const searchTerm = query.trim();
    
    // Buscar en nombre, whatsapp_id, telefono, y propiedad_interes usando ilike
    // Usar or() con formato: 'campo1.ilike.term,campo2.ilike.term'
    const { data, error } = await getSupabase()
      .from('leads')
      .select('*')
      .or(`nombre.ilike.%${searchTerm}%,whatsapp_id.ilike.%${searchTerm}%,propiedad_interes.ilike.%${searchTerm}%`)
      .limit(100); // Limitar resultados para mejor rendimiento
    
    if (error) {
      console.error('Error searching leads from Supabase:', error.message);
      return [];
    }
    
    const normalized: Lead[] = ((data as any[]) || []).map(mapLeadRow);
    
    // Sort desc by fechaContacto
    normalized.sort((a, b) => new Date(b.fechaContacto).getTime() - new Date(a.fechaContacto).getTime());
    
    return normalized;
  } catch (e) {
    console.error('Exception searching leads:', e);
    return [];
  }
};

/**
 * Recalifica un lead específico basándose en la cantidad de mensajes
 * Solo recalifica si el lead tiene chatwoot_conversation_id y estado 'frio' o 'tibio'
 */
export const recalificarLead = async (leadId: string): Promise<boolean> => {
  try {
    const { data: leadData, error } = await getSupabase()
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();
    
    if (error || !leadData) {
      console.error(`Error obteniendo lead ${leadId} para recalificar:`, error?.message);
      return false;
    }
    
    // Type assertion para que TypeScript reconozca el tipo Lead
    const lead = leadData as Lead;
    
    // Solo recalificar si tiene chatwoot_conversation_id y estado 'frío' o 'tibio'
    if (!lead.chatwoot_conversation_id) {
      return false;
    }
    
    const currentEstado = normalizeEstadoFromDB(lead.estado);
    // Recalificar si el estado es 'frío', 'tibio' o 'caliente' (los 3 estados automáticos basados en mensajes)
    // No recalificar 'llamada', 'visita' u otros estados manuales
    if (currentEstado !== 'frío' && currentEstado !== 'frio' && currentEstado !== 'tibio' && currentEstado !== 'caliente') {
      return false;
    }
    
    const newEstado = await calificarLead(lead);
    
    // Solo actualizar si el estado cambió
    if (newEstado !== currentEstado) {
      console.log(`🔄 Recalificando lead ${leadId}: ${currentEstado} → ${newEstado}`);
      await updateLeadStatus(leadId, newEstado);
      // Actualizar en el cache
      cachedLeads = cachedLeads.map(l => 
        String(l.id) === String(leadId) 
          ? { ...l, estado: newEstado as Lead['estado'] }
          : l
      );
      return true;
    }
    
    return false;
  } catch (e) {
    console.error(`Error recalificando lead ${leadId}:`, e);
    return false;
  }
};

/**
 * Obtiene todos los leads disponibles
 */
export const getAllLeads = async (): Promise<Lead[]> => {
  try {
    const { data, error } = await getSupabase()
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) {
      console.error('Error fetching leads from Supabase:', error.message);
      return [];
    }
    const normalized: Lead[] = ((data as any[]) || []).map(mapLeadRow);
    
    // Nota: La calificación automática de leads (frío/tibio/caliente) se maneja desde n8n,
    // no desde el frontend. El workflow de n8n cuenta los mensajes del historial de Chatwoot
    // y actualiza el estado del lead directamente en la base de datos.
    // Solo corregimos estados inválidos ('activo', 'inicial') a 'frío' por defecto.
    const leadsWithInvalidState = normalized.filter(lead => 
      !lead.estado || lead.estado === 'activo' || lead.estado === 'inicial'
    );
    
    if (leadsWithInvalidState.length > 0) {
      console.log(`🔄 Corrigiendo ${leadsWithInvalidState.length} leads con estado inválido`);
      Promise.all(
        leadsWithInvalidState.map(async (lead) => {
          await updateLeadStatus(lead.id, 'frío');
          lead.estado = 'frío' as Lead['estado'];
        })
      ).catch(err => console.error('Error corrigiendo estados:', err));
    }
    
    // Sort desc by fechaContacto
    normalized.sort((a, b) => new Date(b.fechaContacto).getTime() - new Date(a.fechaContacto).getTime());
    cachedLeads = normalized;
    return cachedLeads;
  } catch (e) {
    console.error('Supabase not configured or failed to initialize:', e);
    return [];
  }
};

/**
 * Filtra leads según los criterios especificados
 */
export const filterLeads = (options: FilterOptions): Lead[] => {
  const source = cachedLeads;
  return source.filter(lead => {
    try {
      // Filtrar por zona de interés si se especifica
      if (options.zona && lead.zonaInteres) {
        const leadZona = (lead.zonaInteres || '').toLowerCase();
        const filterZona = (options.zona || '').toLowerCase();
        if (leadZona !== filterZona) {
          return false;
        }
      }
    
    // Filtrar por presupuesto máximo si se especifica
    if (options.presupuestoMaximo && lead.presupuesto > options.presupuestoMaximo) {
      return false;
    }
    
    // Filtrar por tipo de propiedad si se especifica
    if (options.tipoPropiedad && lead.tipoPropiedad !== options.tipoPropiedad) {
      return false;
    }
    
    // Filtrar por estado del lead si se especifica
    if (options.estado && lead.estado !== options.estado) {
      return false;
    }
    
    // Filtrar por cantidad mínima de ambientes si se especifica
    if (options.cantidadAmbientesMinima && lead.cantidadAmbientes < options.cantidadAmbientesMinima) {
      return false;
    }
    
    // Filtrar por motivo de interés si se especifica
    if (options.motivoInteres && lead.motivoInteres !== options.motivoInteres) {
      return false;
    }
    
    // Filtrar por propiedad de interés (campaña) si se especifica
    // Incluye todas las variantes del grupo para manejar diferencias ortográficas
    if (options.propiedadInteres) {
      const leadPropiedadInteres = (lead as any).propiedad_interes || '';
      if (!leadPropiedadInteres) {
        return false;
      }
      
      // Comparación directa primero (más rápida y precisa)
      if (leadPropiedadInteres.trim() === options.propiedadInteres.trim()) {
        return true;
      }
      
      // Si no coincide exactamente, intentar con variantes agrupadas (para manejar diferencias ortográficas)
      try {
        const campaignVariants = getCampaignVariants(options.propiedadInteres);
        const normalizedLeadCampaign = normalizeCampaignName(leadPropiedadInteres);
        const matches = campaignVariants.some(variant => 
          normalizeCampaignName(variant) === normalizedLeadCampaign
        );
        
        if (!matches) {
          return false;
        }
      } catch (e) {
        // Si hay error con el agrupamiento, usar comparación directa normalizada
        const normalizedLead = normalizeCampaignName(leadPropiedadInteres);
        const normalizedFilter = normalizeCampaignName(options.propiedadInteres);
        if (normalizedLead !== normalizedFilter) {
          return false;
        }
      }
    }
    
      // Si pasa todos los filtros, incluir el lead
      return true;
    } catch (e) {
      console.error('Error filtering lead:', e, lead);
      return false;
    }
  });
};

/**
 * Obtiene zonas únicas para los filtros
 */
export const getUniqueZones = (): string[] => {
  const zones = new Set<string>();
  cachedLeads.forEach(lead => zones.add(lead.zonaInteres));
  return Array.from(zones).sort();
};

/**
 * Obtiene estados únicos para los filtros
 */
export const getUniqueStatuses = (): string[] => {
  // Definir todos los estados válidos del sistema (excluyendo 'activo' e 'inicial' que son temporales)
  const allStatuses: LeadStatus[] = ['frío', 'tibio', 'caliente', 'llamada', 'visita'];
  
  // Añadir cualquier estado adicional que pueda existir en los datos, pero excluir 'activo' e 'inicial'
  // Normalizar estados para evitar duplicados (ej: "Fríos" -> "frío")
  const dataStatuses = new Set<string>();
  cachedLeads.forEach(lead => {
    // Filtrar estados temporales que no deberían aparecer como columnas
    if (lead.estado && lead.estado !== 'activo' && lead.estado !== 'inicial') {
      // Normalizar el estado antes de agregarlo
      const normalizedEstado = normalizeEstadoFromDB(lead.estado);
      if (normalizedEstado) {
        dataStatuses.add(normalizedEstado);
      }
    }
  });
  
  // Combinar todos los estados
  const combinedStatuses = new Set<string>([...allStatuses, ...dataStatuses]);
  
  // Ordenar los estados en un orden lógico de flujo de trabajo
  const orderedStatuses: LeadStatus[] = ['frío', 'tibio', 'caliente', 'llamada', 'visita'];
  
  // Devolver los estados en el orden definido, excluyendo 'activo' e 'inicial'
  return orderedStatuses.filter(status => combinedStatuses.has(status));
};

/**
 * Obtiene tipos de propiedad únicos para los filtros
 */
export const getUniquePropertyTypes = (): string[] => {
  const types = new Set<string>();
  cachedLeads.forEach(lead => types.add(lead.tipoPropiedad));
  return Array.from(types).sort();
};

/**
 * Obtiene motivos de interés únicos para los filtros
 */
export const getUniqueInterestReasons = (): string[] => {
  const reasons = new Set<string>();
  cachedLeads.forEach(lead => reasons.add(lead.motivoInteres));
  return Array.from(reasons).sort();
};

/**
 * Obtiene propiedades de interés únicas para los filtros (campañas activas)
 * Agrupa campañas similares para evitar duplicados por errores ortográficos
 */
export const getUniquePropertyInterests = (): string[] => {
  const allProperties: string[] = [];
  cachedLeads.forEach(lead => {
    const propiedadInteres = (lead as any).propiedad_interes;
    if (propiedadInteres && propiedadInteres.trim() !== '') {
      allProperties.push(propiedadInteres.trim());
    }
  });
  
  // Si no hay propiedades, retornar vacío
  if (allProperties.length === 0) return [];
  
  // Primero, eliminar duplicados exactos antes de agrupar
  const uniqueProperties = [...new Set(allProperties)];
  
  // Agrupar campañas similares
  const { groups, map } = groupSimilarCampaigns(uniqueProperties);
  
  // Guardar el mapa para usar en el filtrado
  campaignGroupMap = map;
  campaignGroups = groups;
  
  // Retornar solo los nombres representativos de cada grupo (sin duplicados, ordenados)
  const representatives = Array.from(groups.keys());
  
  // Asegurarse de que no haya duplicados en los representantes (por si acaso)
  const uniqueRepresentatives = [...new Set(representatives)];
  
  return uniqueRepresentatives.sort();
};

/**
 * Obtiene todas las variantes de una campaña (incluyendo las que pertenecen al mismo grupo)
 */
export const getCampaignVariants = (campaignName: string): string[] => {
  const representative = campaignGroupMap.get(campaignName) || campaignName;
  return campaignGroups.get(representative) || [campaignName];
};

/**
 * Actualiza el estado de un lead
 */
export const updateLeadStatus = async (leadId: string, newStatus: string): Promise<boolean> => {
  try {
    console.log(`Updating lead ${leadId} to status ${newStatus} in Supabase`);
    
    // Validar que el estado no esté vacío
    if (!newStatus || typeof newStatus !== 'string' || newStatus.trim() === '') {
      console.error('Invalid status provided:', newStatus);
      return false;
    }
    
    // Normalizar el estado antes de guardarlo (ej: "Fríos" -> "frío")
    const normalizedStatus = normalizeEstadoFromDB(newStatus.trim());
    
    // Cast table typing loosely to avoid TS inference issues without generated types
    const { data, error } = await (getSupabase() as any)
      .from('leads')
      .update({ estado: normalizedStatus })
      .eq('id', leadId)
      .select();
    
    if (error) {
      console.error('Error updating lead status in Supabase:', error.message, error);
      return false;
    }
    
    console.log('Supabase update result:', data);
    
    // Update cache if present
    cachedLeads = cachedLeads.map(l => (l.id === leadId ? { ...l, estado: newStatus.trim() as LeadStatus } as Lead : l));
    
    console.log(`Successfully updated lead ${leadId} to ${newStatus}`);
    return true;
  } catch (e) {
    console.error('Exception updating lead status:', e);
    return false;
  }
};

/**
 * Actualiza masivamente todos los leads de 'caliente' a 'frío'
 */
export const updateAllHotLeadsToFrio = async (): Promise<boolean> => {
  try {
    const { error } = await (getSupabase() as any)
      .from('leads')
      .update({ estado: 'frío' })
      .eq('estado', 'caliente');
    
    if (error) {
      console.error('Error updating hot leads to frio in Supabase:', error.message);
      return false;
    }
    
    // Update cache if present
    cachedLeads = cachedLeads.map(l => (l.estado === 'caliente' ? { ...l, estado: 'frío' } as Lead : l));
    console.log('Successfully updated all hot leads to frio');
    return true;
  } catch (e) {
    console.error('Error updating hot leads to frio:', e);
    return false;
  }
};

/**
 * Obtiene el conteo total de mensajes de una conversación de Chatwoot
 * Cuenta todos los mensajes, no solo los de la primera página
 */
const getMessagesCount = async (conversationId: number): Promise<number> => {
  try {
    let totalMessages = 0;
    let before = null; // Para paginación
    let hasMore = true;
    
    // Cargar todas las páginas de mensajes
    while (hasMore) {
      let url = `/api/chats/${conversationId}/messages`;
      if (before) {
        url += `?before=${before}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`⚠️ Error obteniendo mensajes para conversación ${conversationId}:`, response.status);
        break;
      }
      
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        const pageMessages = data.data;
        totalMessages += pageMessages.length;
        
        // Si recibimos menos de 50 mensajes, probablemente no hay más páginas
        // (asumiendo que la API devuelve 50 por página por defecto)
        if (pageMessages.length < 50) {
          hasMore = false;
        } else {
          // Usar el ID del mensaje más antiguo como 'before' para la siguiente página
          before = pageMessages[pageMessages.length - 1]?.id || null;
          if (!before) {
            hasMore = false;
          }
        }
      } else {
        hasMore = false;
      }
      
      // Limitar a 10 páginas para evitar loops infinitos (500 mensajes máximo)
      if (totalMessages >= 500) {
        hasMore = false;
      }
    }
    
    console.log(`📊 Conversación ${conversationId}: ${totalMessages} mensajes totales`);
    return totalMessages;
  } catch (error) {
    console.error(`❌ Error contando mensajes para conversación ${conversationId}:`, error);
    return 0;
  }
};

/**
 * Califica automáticamente un lead según la cantidad de mensajes en su conversación
 * - Si la conversación tiene 2 mensajes o menos: "frío"
 * - Si la conversación tiene más de 2 y hasta 15 mensajes: "tibio"
 * - Si la conversación tiene más de 15 mensajes: "caliente"
 * 
 * Si no hay chatwoot_conversation_id, devuelve "frío" por defecto
 */
const calificarLead = async (leadData: any): Promise<'frío' | 'tibio' | 'caliente'> => {
  // Si no hay chatwoot_conversation_id, no podemos contar mensajes
  // Por defecto, consideramos el lead como "frío"
  if (!leadData.chatwoot_conversation_id) {
    console.log(`📊 Lead sin chatwoot_conversation_id, calificando como "frío" por defecto`);
    return 'frío';
  }
  
  try {
    // Obtener el conteo de mensajes de la conversación
    const messagesCount = await getMessagesCount(leadData.chatwoot_conversation_id);
    console.log(`📊 Conversación ${leadData.chatwoot_conversation_id}: ${messagesCount} mensajes`);
    
    // Calificación basada en cantidad de mensajes:
    // <= 2 mensajes → "frío"
    // > 2 y <= 15 mensajes → "tibio"
    // > 15 mensajes → "caliente"
    if (messagesCount <= 2) {
      return 'frío';
    } else if (messagesCount <= 15) {
      return 'tibio';
    } else {
      return 'caliente';
    }
  } catch (error) {
    console.error(`❌ Error calificando lead con conversación ${leadData.chatwoot_conversation_id}:`, error);
    // En caso de error, devolver "frío" por defecto
    return 'frío';
  }
};

/**
 * Crea un nuevo lead
 */
export const createLead = async (leadData: Partial<Lead>): Promise<Lead | null> => {
  try {
    console.log('Creating new lead in Supabase:', leadData);
    
    // Preparar datos para insertar según la estructura real de la tabla
    const dataToInsert: any = {
      whatsapp_id: leadData.telefono || leadData.whatsapp_id || `temp_${Date.now()}`, // Campo requerido
      nombre: leadData.nombreCompleto || leadData.nombre || null,
      presupuesto: leadData.presupuesto || null,
      zona: leadData.zonaInteres || leadData.zona || null,
      tipo_propiedad: leadData.tipoPropiedad || null,
      forma_pago: leadData.forma_pago || null,
      intencion: leadData.motivoInteres || leadData.intencion || null,
      caracteristicas_buscadas: leadData.observaciones || leadData.caracteristicas_buscadas || null,
      caracteristicas_venta: leadData.caracteristicas_venta || null,
      propiedades_mostradas: leadData.propiedades_mostradas || null,
      propiedad_interes: leadData.propiedad_interes || null,
      ultima_interaccion: new Date().toISOString(),
      seguimientos_count: leadData.seguimientos_count ?? 0,
      notas: leadData.notas ?? null,
      estado_chat: leadData.estado_chat ?? null,
    };
    
    // Calificar automáticamente el lead SIEMPRE (a menos que se especifique manualmente un estado diferente)
    // Los estados válidos para calificación automática son: 'frio' y 'tibio'
    // Si se especifica otro estado manualmente (como 'caliente', 'llamada', 'visita', etc.), se respeta
    // NUNCA usar 'inicial' o 'activo' - estos estados no deben existir
    if (!leadData.estado || leadData.estado === 'inicial' || leadData.estado === 'activo') {
      dataToInsert.estado = await calificarLead(dataToInsert);
    } else {
      // Si se especifica un estado válido, usarlo
      dataToInsert.estado = leadData.estado;
    }
    
    const { data, error } = await (getSupabase() as any)
      .from('leads')
      .insert([dataToInsert])
      .select()
      .single();
    
    if (error) {
      // Si el error es 409 (duplicate key), el lead ya existe, intentar buscarlo
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        console.log('⚠️ Lead ya existe, buscando lead existente...');
        const whatsappId = dataToInsert.whatsapp_id;
        
        // Buscar el lead existente
        const { data: existingLead, error: fetchError } = await (getSupabase() as any)
          .from('leads')
          .select('*')
          .eq('whatsapp_id', whatsappId)
          .single();
        
        if (fetchError || !existingLead) {
          console.error('Error fetching existing lead:', fetchError);
          return null;
        }
        
        console.log('✅ Lead existente encontrado:', existingLead);
        const mappedLead = mapLeadRow(existingLead);
        
        // Actualizar el cache si no está ya presente
        const existingInCache = cachedLeads.find(l => l.id === mappedLead.id);
        if (!existingInCache) {
          cachedLeads.unshift(mappedLead);
        }
        
        return mappedLead;
      }
      
      console.error('Error creating lead in Supabase:', error.message, error);
      return null;
    }
    
    console.log('Successfully created lead:', data);
    
    // Mapear y agregar al cache
    const newLead = mapLeadRow(data);
    cachedLeads.unshift(newLead); // Agregar al inicio
    
    return newLead;
  } catch (e) {
    console.error('Exception creating lead:', e);
    return null;
  }
};

/**
 * Busca un lead directamente en Supabase por número de teléfono (whatsapp_id).
 * Intenta múltiples variantes del número para manejar diferencias de formato (+, sin +, etc.)
 */
export const findLeadByPhone = async (phone: string): Promise<Lead | null> => {
  try {
    // Normalizar: solo dígitos
    const digitsOnly = phone.replace(/[^\d]/g, '');
    if (!digitsOnly) return null;
    
    // Variantes a buscar
    const variants = [
      digitsOnly,           // 5492215954777
      `+${digitsOnly}`,     // +5492215954777
    ];
    
    console.log('🔍 Buscando lead en DB por teléfono, variantes:', variants);
    
    const { data, error } = await (getSupabase() as any)
      .from('leads')
      .select('*')
      .in('whatsapp_id', variants);
    
    if (error) {
      console.error('Error buscando lead por teléfono:', error.message);
      return null;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Lead encontrado en DB directamente:', data[0]);
      const mappedLead = mapLeadRow(data[0]);
      
      // Asegurar que esté en el cache
      const existingInCache = cachedLeads.find(l => l.id === mappedLead.id);
      if (!existingInCache) {
        cachedLeads.unshift(mappedLead);
      }
      
      return mappedLead;
    }
    
    console.log('❌ Lead no encontrado en DB para variantes:', variants);
    return null;
  } catch (e) {
    console.error('Exception buscando lead por teléfono:', e);
    return null;
  }
};

/**
 * Actualiza un lead existente
 */
export const updateLead = async (leadId: string, leadData: Partial<Lead>): Promise<Lead | null> => {
  try {
    // Convertir leadId a número si es posible (la columna id en Supabase es serial/integer)
    const leadIdNum = parseInt(leadId, 10);
    const idToUse = isNaN(leadIdNum) ? leadId : leadIdNum;
    
    console.log(`Updating lead ${idToUse} (original: ${leadId}) in Supabase:`, leadData);
    
    // Primero obtener el lead actual para evaluar la calificación completa
    const { data: currentLead, error: fetchError } = await (getSupabase() as any)
      .from('leads')
      .select('*')
      .eq('id', idToUse)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching current lead:', fetchError);
      console.error('❌ Lead ID usado:', idToUse);
      return null;
    }
    
    if (!currentLead) {
      console.error('❌ No se encontró el lead con ID:', idToUse);
      return null;
    }
    
    console.log('✅ Lead encontrado antes de actualizar:', currentLead);
    
    // Preparar datos para actualizar según la estructura real de la tabla
    const dataToUpdate: any = {};
    
    // Solo incluir campos que existen en la tabla y se proporcionaron
    if (leadData.nombreCompleto !== undefined) {
      dataToUpdate.nombre = leadData.nombreCompleto;
    }
    if (leadData.telefono !== undefined) {
      dataToUpdate.whatsapp_id = leadData.telefono;
    }
    if (leadData.presupuesto !== undefined) {
      dataToUpdate.presupuesto = leadData.presupuesto;
    }
    if (leadData.zonaInteres !== undefined) {
      dataToUpdate.zona = leadData.zonaInteres;
    }
    if (leadData.tipoPropiedad !== undefined) {
      dataToUpdate.tipo_propiedad = leadData.tipoPropiedad;
    }
    if (leadData.motivoInteres !== undefined) {
      dataToUpdate.intencion = leadData.motivoInteres;
    }
    if (leadData.observaciones !== undefined) {
      dataToUpdate.caracteristicas_buscadas = leadData.observaciones;
    }
    if (leadData.forma_pago !== undefined) {
      dataToUpdate.forma_pago = leadData.forma_pago;
    }
    if (leadData.intencion !== undefined) {
      dataToUpdate.intencion = leadData.intencion;
    }
    if (leadData.caracteristicas_buscadas !== undefined) {
      dataToUpdate.caracteristicas_buscadas = leadData.caracteristicas_buscadas;
    }
    if (leadData.caracteristicas_venta !== undefined) {
      dataToUpdate.caracteristicas_venta = leadData.caracteristicas_venta;
    }
    if (leadData.propiedades_mostradas !== undefined) {
      dataToUpdate.propiedades_mostradas = leadData.propiedades_mostradas;
    }
    if (leadData.propiedad_interes !== undefined) {
      dataToUpdate.propiedad_interes = leadData.propiedad_interes;
    }
    if (leadData.seguimientos_count !== undefined) {
      dataToUpdate.seguimientos_count = leadData.seguimientos_count;
    }
    if (leadData.notas !== undefined) {
      dataToUpdate.notas = leadData.notas;
    }
    if (leadData.estado_chat !== undefined) {
      // Asegurar que estado_chat sea un número entero (0 o 1)
      const estadoChatValue = leadData.estado_chat;
      const estadoChatStr = String(estadoChatValue);
      dataToUpdate.estado_chat = (estadoChatValue === 1 || estadoChatStr === '1') ? 1 : 0;
      console.log(`📝 Actualizando estado_chat a: ${dataToUpdate.estado_chat} (tipo: ${typeof dataToUpdate.estado_chat})`);
    }
    
    // Recalificar automáticamente si:
    // 1. El estado actual es inválido ('inicial' o 'activo')
    // 2. Se actualiza chatwoot_conversation_id y el estado es 'frío' o 'tibio'
    // 3. El estado actual es 'frío' o 'tibio' y se está actualizando el lead (puede haber nuevos mensajes)
    const currentEstado = normalizeEstadoFromDB(currentLead?.estado);
    const isUpdatingChatwootId = leadData.chatwoot_conversation_id !== undefined && 
                                  leadData.chatwoot_conversation_id !== currentLead?.chatwoot_conversation_id;
    const hasChatwootId = (leadData.chatwoot_conversation_id ?? currentLead?.chatwoot_conversation_id);
    // Recalificar automáticamente si el estado es uno de los automáticos (frío, tibio, caliente)
    const shouldAutoRecalify = hasChatwootId && (currentEstado === 'frío' || currentEstado === 'frio' || currentEstado === 'tibio' || currentEstado === 'caliente');
    
    if (leadData.estado !== undefined) {
      // Si se especificó un estado manualmente, respetarlo
      if (leadData.estado === 'inicial' || leadData.estado === 'activo') {
        // Si se intenta establecer un estado inválido, recalificar automáticamente
        const combinedData = { ...currentLead, ...dataToUpdate };
        dataToUpdate.estado = await calificarLead(combinedData);
      } else {
        // Si se especifica un estado válido, usarlo
        dataToUpdate.estado = leadData.estado;
      }
    } else if (currentEstado === 'inicial' || currentEstado === 'activo') {
      // Recalificar si el estado actual es inválido
      const combinedData = { ...currentLead, ...dataToUpdate };
      dataToUpdate.estado = await calificarLead(combinedData);
    } else if (isUpdatingChatwootId || shouldAutoRecalify) {
      // Recalificar automáticamente si se actualiza chatwoot_conversation_id o si el lead tiene estado 'frio'/'tibio'
      // Esto asegura que la calificación se actualice cuando hay nuevos mensajes
      const combinedData = { ...currentLead, ...dataToUpdate };
      const newEstado = await calificarLead(combinedData);
      // Solo actualizar si el estado cambió
      if (newEstado !== currentEstado) {
        dataToUpdate.estado = newEstado;
        console.log(`🔄 Auto-recalificando lead ${leadId}: ${currentEstado} → ${newEstado}`);
      }
    }
    // Si el estado actual es válido y no se especifica un nuevo estado, NO cambiar el estado
    
    // Actualizar ultima_interaccion
    dataToUpdate.ultima_interaccion = new Date().toISOString();
    
    console.log('📝 Datos a actualizar:', dataToUpdate);
    
    const { data, error } = await (getSupabase() as any)
      .from('leads')
      .update(dataToUpdate)
      .eq('id', idToUse)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error updating lead in Supabase:', error.message, error);
      console.error('❌ Lead ID usado:', idToUse);
      console.error('❌ Datos que se intentaron actualizar:', dataToUpdate);
      return null;
    }
    
    if (!data) {
      console.error('❌ No se retornó data después de actualizar');
      return null;
    }
    
    console.log('✅ Successfully updated lead:', data);
    console.log('✅ estado_chat después de actualizar:', data.estado_chat);
    
    // Mapear y actualizar en el cache
    const updatedLead = mapLeadRow(data);
    cachedLeads = cachedLeads.map(l => String(l.id) === String(leadId) ? updatedLead : l);
    
    console.log('✅ Lead mapeado y retornado:', updatedLead);
    console.log('✅ estado_chat en lead mapeado:', updatedLead.estado_chat);
    
    return updatedLead;
  } catch (e) {
    console.error('Exception updating lead:', e);
    return null;
  }
};