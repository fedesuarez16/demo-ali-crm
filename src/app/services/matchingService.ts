import { getAllLeads } from './leadService';
import { getAllProperties } from './propertyService';
import { Lead, Property } from '../types';

/**
 * Determina si una propiedad coincide con las preferencias de un lead
 */
export const isPropertyMatchingLead = (property: Property, lead: Lead): boolean => {
  // Verificar coincidencia de tipo de propiedad
  if (property.tipo !== lead.tipoPropiedad) {
    return false;
  }
  
  // Verificar coincidencia de zona
  if (property.zona !== lead.zonaInteres) {
    return false;
  }
  
  // Verificar si el precio está dentro del presupuesto
  if (property.precio > lead.presupuesto) {
    return false;
  }
  
  // Verificar superficie mínima
  if (property.superficie < lead.superficieMinima) {
    return false;
  }
  
  // Verificar cantidad de ambientes
  if (property.ambientes < lead.cantidadAmbientes) {
    return false;
  }
  
  // Verificar si está disponible para mostrar o vender
  if (property.estado !== 'disponible' && property.estado !== 'reservada') {
    return false;
  }
  
  // Si es para alquiler pero el lead busca comprar, no coincide
  if (property.operacion === 'alquiler' && lead.motivoInteres !== 'mudanza') {
    return false;
  }
  
  // Si pasa todas las verificaciones, hay coincidencia
  return true;
};

/**
 * Encuentra leads que coinciden con una propiedad específica
 */
export const findMatchingLeadsForProperty = async (propertyId: string): Promise<Lead[]> => {
  const properties = getAllProperties();
  const property = properties.find(p => p.id === propertyId);
  
  if (!property) {
    return [];
  }
  
  const leads = await getAllLeads();
  
  return leads.filter(lead => isPropertyMatchingLead(property, lead));
};

/**
 * Encuentra propiedades que coinciden con un lead específico
 */
export const findMatchingPropertiesForLead = async (leadId: string): Promise<Property[]> => {
  const leads = await getAllLeads();
  const lead = leads.find(l => l.id === leadId);
  
  if (!lead) {
    return [];
  }
  
  const properties = getAllProperties();
  
  return properties.filter(property => isPropertyMatchingLead(property, lead));
};

/**
 * Obtiene todas las propiedades con sus leads coincidentes
 */
export const getAllPropertiesWithMatches = async (): Promise<Array<{property: Property, matchingLeads: Lead[]}>> => {
  const properties = getAllProperties();
  
  const results: Array<{property: Property, matchingLeads: Lead[]}> = [];
  for (const property of properties) {
    const matchingLeads = await findMatchingLeadsForProperty(property.id);
    results.push({ property, matchingLeads });
  }
  return results;
};

/**
 * Calcular estadísticas de coincidencias
 */
export const getMatchingStats = async () => {
  const propertiesWithMatches = await getAllPropertiesWithMatches();
  const totalProperties = propertiesWithMatches.length;
  const propertiesWithAtLeastOneMatch = propertiesWithMatches.filter(
    item => item.matchingLeads.length > 0
  ).length;
  
  const leads = await getAllLeads();
  const totalLeads = leads.length;
  
  let totalMatches = 0;
  propertiesWithMatches.forEach(item => {
    totalMatches += item.matchingLeads.length;
  });
  
  return {
    totalProperties,
    propertiesWithAtLeastOneMatch,
    totalLeads,
    totalMatches,
    matchRate: totalProperties > 0 
      ? Math.round((propertiesWithAtLeastOneMatch / totalProperties) * 100) 
      : 0
  };
}; 