import React, { useState, useEffect, useMemo } from 'react';
import { Lead, Property, LeadStatus } from '../types';
import { findMatchingPropertiesForLead } from '../services/matchingService';
import LeadDetailSidebar from './LeadDetailSidebar';

interface LeadCardsProps {
  leads: Lead[];
  onLeadStatusChange?: (leadId: string, newStatus: LeadStatus) => void;
  onEditLead?: (lead: Lead) => void;
  visibleColumns?: string[];
}

const LeadCards: React.FC<LeadCardsProps> = ({ leads, onLeadStatusChange, onEditLead, visibleColumns }) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [matchingProperties, setMatchingProperties] = useState<Map<string, Property[]>>(new Map());
  const [isDraggingOver, setIsDraggingOver] = useState<Record<string, boolean>>({});
  
  const defaultStatusOrder = ['frío', 'tibio', 'caliente', 'llamada', 'visita'];
  const statusOrder = visibleColumns && visibleColumns.length > 0 ? visibleColumns : defaultStatusOrder;
  
  // Memo para agrupar los leads por estado y ordenarlos por ultima_interaccion
  const groupedLeads = useMemo(() => {
    const result: Record<string, Lead[]> = {};
    
    // Inicializar todas las columnas visibles
    statusOrder.forEach(status => {
      result[status] = [];
    });
    
    leads.forEach(lead => {
      const leadStatus = lead.estado;
      // Si el estado coincide con alguna de nuestras columnas visibles, lo añadimos ahí
      if (statusOrder.includes(leadStatus)) {
        if (!result[leadStatus]) {
          result[leadStatus] = [];
        }
        result[leadStatus].push(lead);
      } else {
        // Si el estado no existe en nuestras columnas visibles, crear una nueva columna para él
        // Esto permite que los estados personalizados se muestren correctamente
        if (!result[leadStatus]) {
          result[leadStatus] = [];
        }
        result[leadStatus].push(lead);
      }
    });
    
    // Ordenar cada columna por ultima_interaccion (más reciente primero)
    Object.keys(result).forEach(status => {
      result[status].sort((a: Lead, b: Lead) => {
        // Priorizar ultima_interaccion sobre fechaContacto
        const dateA = new Date(a.ultima_interaccion || a.created_at || a.fechaContacto).getTime();
        const dateB = new Date(b.ultima_interaccion || b.created_at || b.fechaContacto).getTime();
        return dateB - dateA; // Orden descendente (más reciente primero)
      });
    });
    
    return result;
  }, [leads, statusOrder]);
  
  // Cargar propiedades coincidentes para todos los leads
  useEffect(() => {
    const loadMatchingProperties = async () => {
      const matchesMap = new Map<string, Property[]>();
      for (const lead of leads) {
        const matches = await findMatchingPropertiesForLead(lead.id);
        matchesMap.set(lead.id, matches);
      }
      setMatchingProperties(matchesMap);
    };
    loadMatchingProperties();
  }, [leads]);

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-42 px bg-white ">
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-slate-700 text-lg font-medium">No se encontraron leads</p>
        <p className="text-slate-500 text-sm mt-1">Prueba modificando los filtros de búsqueda</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'frío':
        return 'border-gray-500';
      case 'tibio':
        return 'border-gray-500';
      case 'caliente':
        return 'border-gray-500';
      case 'llamada':
        return 'border-gray-500';
      case 'visita':
        return 'border-gray-500';
      default:
        return 'border-gray-300';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'frío':
        return 'bg-blue-100 text-gray-800';
      case 'tibio':
        return 'bg-yellow-100 text-gray-800';
      case 'caliente':
        return 'bg-red-100 text-red-800';
      case 'llamada':
        return 'bg-indigo-100 text-indigo-800';
      case 'visita':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  const handleLeadClick = (lead: Lead, e: React.MouseEvent) => {
    // No abrir el modal si estamos arrastrando
    if (e.currentTarget.getAttribute('dragging') === 'true') {
      return;
    }
    
    setSelectedLead(lead);
    setShowSidebar(true);
  };

  const closeSidebar = () => {
    setShowSidebar(false);
    setSelectedLead(null);
  };
  
  // Handlers para HTML5 Drag and Drop
  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    e.currentTarget.setAttribute('dragging', 'true');
    e.dataTransfer.setData('leadId', lead.id);
    e.dataTransfer.setData('sourceStatus', lead.estado);
    e.dataTransfer.effectAllowed = 'move';
    
    // Añadir una imagen de arrastre personalizada (opcional)
    const dragImage = document.createElement('div');
    dragImage.textContent = lead.nombreCompleto;
    dragImage.style.backgroundColor = 'white';
    dragImage.style.padding = '8px';
    dragImage.style.borderRadius = '4px';
    dragImage.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    // Eliminar el elemento después de un breve retraso
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.setAttribute('dragging', 'false');
    // Restablecer todos los estados de arrastrar sobre
    const resetState: Record<string, boolean> = {};
    statusOrder.forEach(status => {
      resetState[status] = false;
    });
    setIsDraggingOver(resetState);
  };
  
  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault(); // Necesario para permitir soltar
    e.dataTransfer.dropEffect = 'move';
    
    // Actualizar el estado de dragging over
    if (!isDraggingOver[status]) {
      setIsDraggingOver(prev => ({
        ...prev,
        [status]: true
      }));
    }
  };
  
  const handleDragLeave = (e: React.DragEvent, status: string) => {
    setIsDraggingOver(prev => ({
      ...prev,
      [status]: false
    }));
  };
  
  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    
    const leadId = e.dataTransfer.getData('leadId');
    const sourceStatus = e.dataTransfer.getData('sourceStatus');
    
    // Restablecer el estado de dragging over
    setIsDraggingOver(prev => ({
      ...prev,
      [targetStatus]: false
    }));
    
    // No hacer nada si el estado de origen y destino son iguales
    if (sourceStatus === targetStatus) {
      return;
    }
    
    // Llamar a la función de cambio de estado si está disponible
    if (onLeadStatusChange) {
      onLeadStatusChange(leadId, targetStatus as LeadStatus);
    }
  };

  const getStatusTitle = (status: string) => {
    const titleMap: Record<string, string> = {
      'caliente': 'Calientes',
      'tibio': 'Tibios',
      'frío': 'Fríos',
      'llamada': 'Llamadas',
      'visita': 'Visitas'
    };
    return titleMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusBackgroundColor = (status: string, isDragging: boolean) => {
    if (!isDragging) return 'bg-transparent';
    
    // Color más visible cuando se arrastra sobre la columna
    return 'bg-indigo-50 border-2 border-dashed border-indigo-300';
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'caliente':
        return 'border-gray-400 text-red-700';
      case 'tibio':
        return 'border-gray-400 text-yellow-700';
      case 'frío':
        return 'border-gray-400 text-blue-700';
        case 'llamada':
        return 'border-gray-400 text-green-700';
      case 'visita':
        return 'border-gray-400 text-gray-700';
      default:
        return 'border-gray-400 text-gray-700';
    }
  };

  // Combinar columnas visibles con columnas que tienen leads (para mostrar estados personalizados)
  const allColumnsToShow = useMemo(() => {
    const visibleSet = new Set(statusOrder);
    const columnsWithLeads = Object.keys(groupedLeads).filter(status => groupedLeads[status].length > 0);
    const customColumns = columnsWithLeads.filter(status => !visibleSet.has(status));
    
    // Primero las columnas visibles en orden, luego las personalizadas
    return [...statusOrder, ...customColumns];
  }, [statusOrder, groupedLeads]);

  return (
    <>
      <div className="w-full  overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max pr-2">
          {allColumnsToShow.map((status) => (
            <div 
              key={status} 
              className="min-w-[240px] bg-slate-100 border-gray-400 rounded-xl flex flex-col"
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={(e) => handleDragLeave(e, status)}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Header de la columna */}
              <div className={`m-2 bg-white p-1.5 rounded-xl flex items-center justify-between`}>
                <h3 className="text-xs font-semibold text-slate-700">
                  {getStatusTitle(status)}
                </h3>
                <span className={` items-center px-1.5 py-0.5 rounded-full text-[10px] border ${getStatusBorderColor(status).split(' ')[0]} text-slate-500`}>
                  {groupedLeads[status].length}
                </span>
              </div>
              
              {/* Área de drop que cubre toda la altura */}
              <div
                className={`flex-1 min-h-[400px] p-1 rounded-xl transition-colors duration-200 ${
                  getStatusBackgroundColor(status, isDraggingOver[status])
                }`}
              >
                <div className="space-y-1.5 h-full">
                  {groupedLeads[status].length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg bg-slate-50 w-full">
                        <p className="text-slate-500 text-sm">No hay leads en esta categoría</p>
                        <p className="text-slate-400 text-xs mt-1">Arrastra aquí para cambiar estado</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {groupedLeads[status].map((lead: Lead) => {
                        const matchCount = matchingProperties.get(lead.id)?.length || 0;
                        
                        return (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead)}
                            onDragEnd={handleDragEnd}
                            className={`relative rounded-xl border-l-4 border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer bg-white/90 backdrop-blur ${getStatusColor(lead.estado)}`}
                            onClick={(e) => handleLeadClick(lead, e)}
                          >
                            <div className="p-2 space-y-1.5">
                              <div className="pr-6">
                                <h4 className="text-xs font-semibold text-slate-900 leading-tight truncate">
                                  {lead.nombreCompleto || (lead as any).nombre || (lead as any).whatsapp_id}
                                </h4>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`inline-flex items-center px-1 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadgeColor(lead.estado)}`}>
                                  {lead.estado}
                                </span>
                              </div>
                              <div className="h-px bg-slate-100"></div>
                              <div className="text-[10px] text-gray-600 space-y-1">
                                <div className="flex items-center">
                                  <svg className="h-2.5 w-2.5 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 12l4.243-4.243m-9.9 9.9L3.414 12l4.243-4.243" />
                                  </svg>
                                  <span className="truncate">{(lead as any).zona || lead.zonaInteres}</span>
                                </div>
                                <div className="flex items-center">
                                  <svg className="h-2.5 w-2.5 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M3 10h18M7 15h10M9 20h6" />
                                  </svg>
                                  <span className="truncate">{(lead as any).tipo_propiedad || (lead as any).tipoPropiedad} · {formatCurrency(Number(lead.presupuesto ?? 0))}</span>
                                </div>
                                <div className="flex items-center">
                                  <svg className="h-2.5 w-2.5 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  <span className="truncate">{(lead as any).whatsapp_id || lead.telefono}</span>
                                </div>
                              </div>
                              {matchCount > 0 && (
                                <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-sm">
                                  {matchCount}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Área de drop adicional para llenar el espacio restante */}
                      <div className="flex-1 min-h-[100px]"></div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar de detalles usando el componente LeadDetailSidebar */}
      <LeadDetailSidebar
        lead={selectedLead}
        onClose={closeSidebar}
        matchingProperties={selectedLead ? matchingProperties.get(selectedLead.id) || [] : []}
        isOpen={showSidebar}
        onEditLead={onEditLead}
      />
    </>
  );
};

export default LeadCards; 