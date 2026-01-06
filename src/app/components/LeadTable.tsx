import React from 'react';
import { Lead } from '../types';

interface LeadTableProps {
  leads: Lead[];
  visibleColumns?: string[];
}

const LeadTable: React.FC<LeadTableProps> = ({ leads, visibleColumns }) => {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-44 bg-white">
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500 text-lg font-medium">No se encontraron leads</p>
        <p className="text-gray-400 text-sm mt-1">Prueba modificando los filtros de búsqueda</p>
      </div>
    );
  }

  const defaultStatuses = ['frío', 'tibio', 'caliente', 'llamada', 'visita'] as const;
  
  // Función para normalizar nombres de columnas (eliminar "Fríos", "Tibios", etc.)
  const normalizeColumnName = (col: string): string => {
    const colLower = col.toLowerCase().trim();
    if (colLower === 'fríos' || colLower === 'frios') return 'frío';
    if (colLower === 'tibios') return 'tibio';
    if (colLower === 'calientes') return 'caliente';
    if (colLower === 'llamadas') return 'llamada';
    if (colLower === 'visitas') return 'visita';
    return colLower;
  };
  
  // FORZAR normalización agresiva - NUNCA permitir "Fríos"
  const statusOrder = (visibleColumns && visibleColumns.length > 0 
    ? visibleColumns
        .map(col => normalizeColumnName(col)) // Normalizar nombres de columnas
        .filter(col => col !== 'activo' && col !== 'inicial' && col !== 'fríos' && col !== 'frios') // Filtrar estados temporales y variaciones
        .filter((col, index, self) => self.indexOf(col) === index) // Eliminar duplicados
    : defaultStatuses)
    .filter(col => {
      const normalized = normalizeColumnName(col);
      return normalized !== 'fríos' && normalized !== 'frios' && col !== 'fríos' && col !== 'frios';
    }); // FILTRO FINAL AGRESIVO - eliminar cualquier rastro de "Fríos"

  // Función para normalizar estados (convertir "Fríos" a "frío", etc.)
  const normalizeEstado = (estado: string | undefined): string => {
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

  // Agrupar por estado según el orden solicitado
  // También filtrar leads con estados 'activo' o 'inicial' que no deberían mostrarse
  // Y normalizar estados para evitar duplicados (ej: "Fríos" -> "frío")
  const filteredLeads = leads.filter(l => {
    const estado = normalizeEstado(l.estado as unknown as string);
    return estado !== 'activo' && estado !== 'inicial' && estado !== '';
  });
  
  // Normalizar estados de los leads antes de agrupar
  const normalizedLeads = filteredLeads.map(lead => ({
    ...lead,
    estado: normalizeEstado(lead.estado as unknown as string) as any
  }));
  
  const grouped = statusOrder.map(status => normalizedLeads.filter(l => (l.estado as unknown as string) === status));

  const renderLead = (lead: Lead) => {
    // Obtener nombre (prioridad: nombreCompleto > nombre)
    // Verificar tanto el campo nombreCompleto como nombre (que viene de la BD)
    // Manejar casos donde puede ser string vacío, null, undefined
    const nombreCompletoRaw = lead.nombreCompleto;
    const nombreRaw = (lead as any).nombre;
    
    // Convertir a string y trim, pero solo si tiene valor
    const nombreCompleto = (nombreCompletoRaw && typeof nombreCompletoRaw === 'string' && nombreCompletoRaw.trim().length > 0) 
      ? nombreCompletoRaw.trim() 
      : '';
    const nombre = (nombreRaw && (typeof nombreRaw === 'string' || typeof nombreRaw === 'number') && String(nombreRaw).trim().length > 0) 
      ? String(nombreRaw).trim() 
      : '';
    
    // Prioridad: nombreCompleto > nombre
    const nombreFinal = nombreCompleto || nombre;
    
    // Obtener teléfono (prioridad: telefono > whatsapp_id)
    const telefonoRaw = lead.telefono || (lead as any).whatsapp_id;
    const telefono = (telefonoRaw && String(telefonoRaw).trim().length > 0) 
      ? String(telefonoRaw).trim() 
      : '';
    
    // Mostrar nombre si existe y no está vacío, sino mostrar teléfono
    const displayName = (nombreFinal && nombreFinal.length > 0) ? nombreFinal : (telefono || 'Sin nombre');
    
    return (
      <div className="rounded border border-slate-200 bg-white p-1 shadow-sm">
        <div className="text-xs font-medium text-gray-900 truncate leading-tight">{displayName}</div>
        {nombreFinal && nombreFinal.length > 0 && telefono && telefono !== displayName && (
          <div className="text-gray-600 text-xs truncate leading-tight">{telefono}</div>
        )}
        <div className="text-gray-500 text-xs truncate leading-tight">{(lead as any).zona || lead.zonaInteres || ''}</div>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className={`min-w-max grid gap-1 ${statusOrder.length <= 3 ? 'grid-cols-3' : statusOrder.length === 4 ? 'grid-cols-4' : statusOrder.length === 5 ? 'grid-cols-5' : 'grid-cols-1'}`}>
        {statusOrder.map((col, idx) => (
          <div key={col} className="min-w-[160px] bg-white">
            <div className="mb-1 px-1 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">{col}</div>
            <div className="space-y-0.5">
              {grouped[idx].length === 0 ? (
                <div className="text-xs text-slate-400 rounded py-2 text-center">Vacío</div>
              ) : (
                grouped[idx].map(lead => (
                  <div key={lead.id}>{renderLead(lead)}</div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadTable; 