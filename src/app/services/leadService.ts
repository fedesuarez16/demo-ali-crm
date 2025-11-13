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

// Map a DB row (snake_case or camelCase) into our Lead type
const mapLeadRow = (row: any): Lead => {
  return {
    id: String(row.id),
    nombreCompleto: row.nombre ?? '',
    email: '', // No existe en la tabla
    telefono: row.whatsapp_id ?? '',
    estado: (row.estado || 'inicial') as Lead['estado'], // Acepta cualquier estado, incluyendo personalizados
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
  // Definir todos los estados válidos del sistema
  const allStatuses: LeadStatus[] = ['frío', 'tibio', 'caliente', 'llamada', 'visita'];
  
  // Añadir cualquier estado adicional que pueda existir en los datos
  const dataStatuses = new Set<string>();
  cachedLeads.forEach(lead => dataStatuses.add(lead.estado));
  
  // Combinar todos los estados
  const combinedStatuses = new Set<string>([...allStatuses, ...dataStatuses]);
  
  // Ordenar los estados en un orden lógico de flujo de trabajo
  const orderedStatuses: LeadStatus[] = ['frío', 'tibio', 'caliente', 'llamada', 'visita'];
  
  // Devolver los estados en el orden definido
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
      estado: leadData.estado || 'inicial',
      propiedades_mostradas: leadData.propiedades_mostradas || null,
      propiedad_interes: leadData.propiedad_interes || null,
      ultima_interaccion: new Date().toISOString(),
    };
    
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
    
    // Preparar datos para actualizar según la estructura real de la tabla
    const dataToUpdate: any = {};
    
    // Solo incluir campos que existen en la tabla y se proporcionaron
    if (leadData.nombreCompleto !== undefined) {
      dataToUpdate.nombre = leadData.nombreCompleto;
    }
    if (leadData.telefono !== undefined) {
      dataToUpdate.whatsapp_id = leadData.telefono;
    }
    if (leadData.estado !== undefined) {
      dataToUpdate.estado = leadData.estado;
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