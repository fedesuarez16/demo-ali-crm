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

// Map a DB row (snake_case or camelCase) into our Lead type
const mapLeadRow = (row: any): Lead => {
  // Si el estado es null, 'inicial' o 'activo', calificar automáticamente
  let estado = row.estado;
  if (!estado || estado === 'inicial' || estado === 'activo') {
    estado = calificarLead(row);
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
    estado_chat: row.estado_chat ?? undefined,
  };
};

/**
 * Obtiene todos los leads disponibles
 */
export const getAllLeads = async (): Promise<Lead[]> => {
  try {
    const { data, error } = await getSupabase()
      .from('leads')
      .select('*');
    if (error) {
      console.error('Error fetching leads from Supabase:', error.message);
      return [];
    }
    const normalized: Lead[] = ((data as any[]) || []).map(mapLeadRow);
    
    // Recalificar automáticamente leads con estado "activo" o "inicial" (estos estados NO deben existir)
    // También recalificar leads con estado null o undefined
    const leadsToRecalify = normalized.filter(lead => 
      !lead.estado || lead.estado === 'activo' || lead.estado === 'inicial'
    );
    
    if (leadsToRecalify.length > 0) {
      console.log(`🔄 Recalificando ${leadsToRecalify.length} leads con estado inválido (null, "activo" o "inicial")`);
      // Recalificar en lote (sin esperar a que termine para no bloquear la UI)
      Promise.all(
        leadsToRecalify.map(async (lead) => {
          const leadData = data.find((d: any) => String(d.id) === lead.id);
          if (leadData) {
            const newEstado = calificarLead(leadData);
            // Siempre actualizar si el estado anterior era inválido
            if (!lead.estado || lead.estado === 'activo' || lead.estado === 'inicial' || newEstado !== lead.estado) {
              await updateLeadStatus(lead.id, newEstado);
              // Actualizar en el array normalizado
              lead.estado = newEstado as Lead['estado'];
            }
          }
        })
      ).catch(err => console.error('Error recalificando leads:', err));
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
    // Filtrar por zona de interés si se especifica
    if (options.zona && lead.zonaInteres.toLowerCase() !== options.zona.toLowerCase()) {
      return false;
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
      
      // Obtener todas las variantes de la campaña seleccionada
      const campaignVariants = getCampaignVariants(options.propiedadInteres);
      
      // Verificar si el lead pertenece a alguna de las variantes
      const normalizedLeadCampaign = normalizeCampaignName(leadPropiedadInteres);
      const matches = campaignVariants.some(variant => 
        normalizeCampaignName(variant) === normalizedLeadCampaign
      );
      
      if (!matches) {
        return false;
      }
    }
    
    // Si pasa todos los filtros, incluir el lead
    return true;
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
  const dataStatuses = new Set<string>();
  cachedLeads.forEach(lead => {
    // Filtrar estados temporales que no deberían aparecer como columnas
    if (lead.estado && lead.estado !== 'activo' && lead.estado !== 'inicial') {
      dataStatuses.add(lead.estado);
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
    
    // Cast table typing loosely to avoid TS inference issues without generated types
    const { data, error } = await (getSupabase() as any)
      .from('leads')
      .update({ estado: newStatus.trim() })
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
 * Califica automáticamente un lead según los datos disponibles
 * - Si solo tiene whatsapp_id y nombre (2 datos): "frio"
 * - Si tiene 3 o más datos (whatsapp_id, nombre, y al menos otro): "tibio"
 */
const calificarLead = (leadData: any): 'frio' | 'tibio' => {
  // Contar cuántos datos tiene el lead (excluyendo campos técnicos y null/vacíos)
  let datosCount = 0;
  
  // whatsapp_id siempre está presente (campo requerido)
  if (leadData.whatsapp_id && leadData.whatsapp_id.trim() !== '') {
    datosCount++;
  }
  
  // nombre
  if (leadData.nombre != null && typeof leadData.nombre === 'string' && leadData.nombre.trim() !== '') {
    datosCount++;
  }
  
  // presupuesto (solo si es mayor a 0)
  if (leadData.presupuesto != null && leadData.presupuesto !== 0) {
    datosCount++;
  }
  
  // zona
  if (leadData.zona != null && typeof leadData.zona === 'string' && leadData.zona.trim() !== '') {
    datosCount++;
  }
  
  // tipo_propiedad
  if (leadData.tipo_propiedad != null && typeof leadData.tipo_propiedad === 'string' && leadData.tipo_propiedad.trim() !== '') {
    datosCount++;
  }
  
  // forma_pago
  if (leadData.forma_pago != null && typeof leadData.forma_pago === 'string' && leadData.forma_pago.trim() !== '') {
    datosCount++;
  }
  
  // intencion
  if (leadData.intencion != null && typeof leadData.intencion === 'string' && leadData.intencion.trim() !== '') {
    datosCount++;
  }
  
  // caracteristicas_buscadas
  if (leadData.caracteristicas_buscadas != null && typeof leadData.caracteristicas_buscadas === 'string' && leadData.caracteristicas_buscadas.trim() !== '') {
    datosCount++;
  }
  
  // caracteristicas_venta
  if (leadData.caracteristicas_venta != null && typeof leadData.caracteristicas_venta === 'string' && leadData.caracteristicas_venta.trim() !== '') {
    datosCount++;
  }
  
  // propiedades_mostradas
  if (leadData.propiedades_mostradas != null && typeof leadData.propiedades_mostradas === 'string' && leadData.propiedades_mostradas.trim() !== '') {
    datosCount++;
  }
  
  // propiedad_interes
  if (leadData.propiedad_interes != null && typeof leadData.propiedad_interes === 'string' && leadData.propiedad_interes.trim() !== '') {
    datosCount++;
  }
  
  // notas
  if (leadData.notas != null && typeof leadData.notas === 'string' && leadData.notas.trim() !== '') {
    datosCount++;
  }
  
  // Si tiene 2 o menos datos (solo whatsapp_id y nombre) → "frio"
  // Si tiene 3 o más datos → "tibio"
  return datosCount <= 2 ? 'frio' : 'tibio';
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
    };
    
    // Calificar automáticamente el lead SIEMPRE (a menos que se especifique manualmente un estado diferente)
    // Los estados válidos para calificación automática son: 'frio' y 'tibio'
    // Si se especifica otro estado manualmente (como 'caliente', 'llamada', 'visita', etc.), se respeta
    // NUNCA usar 'inicial' o 'activo' - estos estados no deben existir
    if (!leadData.estado || leadData.estado === 'inicial' || leadData.estado === 'activo') {
      dataToInsert.estado = calificarLead(dataToInsert);
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
 * Actualiza un lead existente
 */
export const updateLead = async (leadId: string, leadData: Partial<Lead>): Promise<Lead | null> => {
  try {
    console.log(`Updating lead ${leadId} in Supabase:`, leadData);
    
    // Primero obtener el lead actual para evaluar la calificación completa
    const { data: currentLead, error: fetchError } = await (getSupabase() as any)
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching current lead:', fetchError);
    }
    
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
      dataToUpdate.estado_chat = leadData.estado_chat;
    }
    
    // Solo recalificar automáticamente si el estado actual es inválido ('inicial' o 'activo')
    // NO recalificar si el estado es válido y no se está cambiando explícitamente
    const currentEstado = currentLead?.estado;
    if (leadData.estado !== undefined) {
      // Si se especificó un estado manualmente, respetarlo
      if (leadData.estado === 'inicial' || leadData.estado === 'activo') {
        // Si se intenta establecer un estado inválido, recalificar automáticamente
        const combinedData = { ...currentLead, ...dataToUpdate };
        dataToUpdate.estado = calificarLead(combinedData);
      } else {
        // Si se especifica un estado válido, usarlo
        dataToUpdate.estado = leadData.estado;
      }
    } else if (currentEstado === 'inicial' || currentEstado === 'activo') {
      // Solo recalificar si el estado actual es inválido
      const combinedData = { ...currentLead, ...dataToUpdate };
      dataToUpdate.estado = calificarLead(combinedData);
    }
    // Si el estado actual es válido y no se especifica un nuevo estado, NO cambiar el estado
    
    // Actualizar ultima_interaccion
    dataToUpdate.ultima_interaccion = new Date().toISOString();
    
    const { data, error } = await (getSupabase() as any)
      .from('leads')
      .update(dataToUpdate)
      .eq('id', leadId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating lead in Supabase:', error.message, error);
      return null;
    }
    
    console.log('Successfully updated lead:', data);
    
    // Mapear y actualizar en el cache
    const updatedLead = mapLeadRow(data);
    cachedLeads = cachedLeads.map(l => l.id === leadId ? updatedLead : l);
    
    return updatedLead;
  } catch (e) {
    console.error('Exception updating lead:', e);
    return null;
  }
};