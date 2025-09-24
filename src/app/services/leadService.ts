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
    nombreCompleto: row.nombreCompleto ?? row.nombre_completo ?? row.nombre ?? '',
    email: row.email ?? '',
    telefono: row.telefono ?? '',
    estado: 'frío' as Lead['estado'], // Forzar todos los leads a estado "frío"
    presupuesto: Number(row.presupuesto ?? 0),
    zonaInteres: row.zonaInteres ?? row.zona_interes ?? row.zona ?? '',
    tipoPropiedad: (row.tipoPropiedad ?? row.tipo_propiedad ?? 'departamento') as Lead['tipoPropiedad'],
    superficieMinima: Number(row.superficieMinima ?? row.superficie_minima ?? 0),
    cantidadAmbientes: Number(row.cantidadAmbientes ?? row.cantidad_ambientes ?? 0),
    motivoInteres: (row.motivoInteres ?? row.motivo_interes ?? 'otro') as Lead['motivoInteres'],
    fechaContacto: row.fechaContacto ?? row.fecha_contacto ?? new Date().toISOString(),
    observaciones: row.observaciones ?? undefined,
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
  // Definir todos los estados posibles
  const allStatuses: LeadStatus[] = ['nuevo', 'contactado', 'caliente', 'tibio', 'frío', 'cerrado', 'descartado'];
  
  // Añadir cualquier estado adicional que pueda existir en los datos
  const dataStatuses = new Set<string>();
  cachedLeads.forEach(lead => dataStatuses.add(lead.estado));
  
  // Combinar todos los estados
  const combinedStatuses = new Set<string>([...allStatuses, ...dataStatuses]);
  
  // Ordenar los estados en un orden lógico de flujo de trabajo
  const orderedStatuses: LeadStatus[] = ['nuevo', 'contactado', 'caliente', 'tibio', 'frío', 'cerrado', 'descartado'];
  
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
export const updateLeadStatus = async (leadId: string, newStatus: LeadStatus): Promise<boolean> => {
  // Cast table typing loosely to avoid TS inference issues without generated types
  const { error } = await (getSupabase() as any)
    .from('leads')
    .update({ estado: newStatus })
    .eq('id', leadId);
  if (error) {
    console.error('Error updating lead status in Supabase:', error.message);
    return false;
  }
  // Update cache if present
  cachedLeads = cachedLeads.map(l => (l.id === leadId ? { ...l, estado: newStatus } as Lead : l));
  return true;
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