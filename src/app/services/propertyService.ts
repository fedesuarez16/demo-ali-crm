import propertiesData from '../data/properties.json';
import { Property, PropertyType, PropertyOperation, PropertyStatus } from '../types';

// Convertimos los datos importados al tipo Property[]
const properties: Property[] = propertiesData as Property[];

/**
 * Obtiene todas las propiedades disponibles
 */
export const getAllProperties = (): Property[] => {
  return properties;
};

/**
 * Obtiene una propiedad por su ID
 */
export const getPropertyById = (id: string): Property | undefined => {
  return properties.find(property => property.id === id);
};

/**
 * Guarda una propiedad (nueva o actualizada)
 * En una app real, esto se comunicaría con una API
 */
export const saveProperty = (property: Property): Property => {
  const index = properties.findIndex(p => p.id === property.id);
  
  if (index >= 0) {
    // Actualizar propiedad existente
    properties[index] = property;
    return property;
  } else {
    // Crear nueva propiedad con ID generado
    const newProperty = {
      ...property,
      id: (properties.length + 1).toString(),
      fechaPublicacion: new Date().toISOString().split('T')[0]
    };
    properties.push(newProperty);
    return newProperty;
  }
};

/**
 * Elimina una propiedad por ID
 */
export const deleteProperty = (id: string): boolean => {
  const index = properties.findIndex(p => p.id === id);
  if (index >= 0) {
    properties.splice(index, 1);
    return true;
  }
  return false;
};

/**
 * Filtra propiedades según diferentes criterios
 */
export const filterProperties = (filters: {
  tipo?: PropertyType,
  operacion?: PropertyOperation,
  estado?: PropertyStatus,
  zonas?: string[],
  precioMin?: number,
  precioMax?: number,
  superficieMin?: number,
  superficieMax?: number,
  ambientes?: number,
  dormitorios?: number,
  destacada?: boolean
}): Property[] => {
  return properties.filter(property => {
    // Filtrar por tipo de propiedad
    if (filters.tipo && property.tipo !== filters.tipo) {
      return false;
    }
    
    // Filtrar por operación
    if (filters.operacion && 
        (property.operacion !== filters.operacion && 
         property.operacion !== 'venta/alquiler')) {
      return false;
    }
    
    // Filtrar por estado
    if (filters.estado && property.estado !== filters.estado) {
      return false;
    }
    
    // Filtrar por zonas
    if (filters.zonas && filters.zonas.length > 0 && 
        !filters.zonas.includes(property.zona)) {
      return false;
    }
    
    // Filtrar por precio mínimo
    if (filters.precioMin && property.precio < filters.precioMin) {
      return false;
    }
    
    // Filtrar por precio máximo
    if (filters.precioMax && property.precio > filters.precioMax) {
      return false;
    }
    
    // Filtrar por superficie mínima
    if (filters.superficieMin && property.superficie < filters.superficieMin) {
      return false;
    }
    
    // Filtrar por superficie máxima
    if (filters.superficieMax && property.superficie > filters.superficieMax) {
      return false;
    }
    
    // Filtrar por ambientes
    if (filters.ambientes && property.ambientes < filters.ambientes) {
      return false;
    }
    
    // Filtrar por dormitorios
    if (filters.dormitorios && property.dormitorios < filters.dormitorios) {
      return false;
    }
    
    // Filtrar propiedades destacadas
    if (filters.destacada && property.destacada !== filters.destacada) {
      return false;
    }
    
    return true;
  });
};

/**
 * Obtener zonas únicas
 */
export const getUniqueZones = (): string[] => {
  const zones = new Set<string>();
  properties.forEach(property => zones.add(property.zona));
  return Array.from(zones).sort();
};

/**
 * Obtener propiedades destacadas
 */
export const getFeaturedProperties = (): Property[] => {
  return properties.filter(property => property.destacada);
};

/**
 * Calcular estadísticas de propiedades
 */
export const getPropertyStats = () => {
  const totalProperties = properties.length;
  const totalSale = properties.filter(p => 
    p.operacion === 'venta' || p.operacion === 'venta/alquiler').length;
  const totalRent = properties.filter(p => 
    p.operacion === 'alquiler' || p.operacion === 'venta/alquiler').length;
  
  return {
    totalProperties,
    totalSale,
    totalRent,
    byType: {
      departamento: properties.filter(p => p.tipo === 'departamento').length,
      casa: properties.filter(p => p.tipo === 'casa').length,
      PH: properties.filter(p => p.tipo === 'PH').length,
      terreno: properties.filter(p => p.tipo === 'terreno').length,
      local: properties.filter(p => p.tipo === 'local').length
    }
  };
}; 