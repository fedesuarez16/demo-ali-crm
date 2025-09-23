import React, { useState, useEffect, useMemo } from 'react';
import { Lead, Property, LeadStatus } from '../types';
import { findMatchingPropertiesForLead } from '../services/matchingService';
import LeadDetailModal from './LeadDetailModal';

interface LeadCardsProps {
  leads: Lead[];
  onLeadStatusChange?: (leadId: string, newStatus: LeadStatus) => void;
}

const LeadCards: React.FC<LeadCardsProps> = ({ leads, onLeadStatusChange }) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [matchingProperties, setMatchingProperties] = useState<Map<string, Property[]>>(new Map());
  const [isDraggingOver, setIsDraggingOver] = useState<Record<string, boolean>>({
    caliente: false,
    tibio: false,
    frío: false,
    cerrado: false,
    descartado: false
  });
  
  const statusOrder = ['frío', 'tibio', 'caliente', 'llamada', 'visita'] as const;
  type FiveColumnStatus = typeof statusOrder[number];
  
  // Memo para agrupar los leads por estado
  const groupedLeads = useMemo(() => {
    const result: Record<FiveColumnStatus, Lead[]> = {
      'frío': [] as Lead[],
      'tibio': [] as Lead[],
      'caliente': [] as Lead[],
      'llamada': [] as Lead[],
      'visita': [] as Lead[]
    };
    
    leads.forEach(lead => {
      // Si el estado coincide con alguna de nuestras 5 columnas, lo añadimos ahí
      if (statusOrder.includes(lead.estado as any)) {
        result[lead.estado as FiveColumnStatus].push(lead);
      } else {
        // Si el estado no existe en nuestras 5 columnas (por ej. nuevo o contactado)
        // lo añadimos a "caliente" por defecto
        result['caliente'].push(lead);
      }
    });
    
    return result;
  }, [leads]);
  
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
      case 'cerrado':
        return 'bg-green-100 text-green-800';
      case 'descartado':
        return 'bg-gray-100 text-gray-800';
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
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
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
    setIsDraggingOver({
      caliente: false,
      tibio: false,
      frío: false,
      cerrado: false,
      descartado: false
    });
  };
  
  const handleDragOver = (e: React.DragEvent, status: FiveColumnStatus) => {
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
  
  const handleDragLeave = (e: React.DragEvent, status: FiveColumnStatus) => {
    setIsDraggingOver(prev => ({
      ...prev,
      [status]: false
    }));
  };
  
  const handleDrop = (e: React.DragEvent, targetStatus: FiveColumnStatus) => {
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

  const statusTitle: Record<FiveColumnStatus, string> = {
    'caliente': 'Calientes',
    'tibio': 'Tibios',
    'frío': 'Fríos',
    'llamada': 'Llamadas',
    'visita': 'Visitas'
  };

  const getStatusBackgroundColor = (status: string, isDragging: boolean) => {
    if (!isDragging) return 'bg-transparent';
    
    switch (status) {
      case 'caliente':
        return 'bg-gray-50';
      case 'tibio':
        return 'bg-gray-50';
      case 'frío':
        return 'bg-gray-50';
      case 'llamada':
        return 'bg-gray-50';
      case 'visita':
        return 'bg-gray-50';
      default:
        return 'bg-gray-50';
    }
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

  return (
    <>
      <div className="w-full  overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max pr-2">
          {statusOrder.map((status) => (
            <div key={status} className="min-w-[324px] bg-slate-100 border-gray-400 rounded-xl">
            
            
            <div
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={(e) => handleDragLeave(e, status)}
              onDrop={(e) => handleDrop(e, status)}
              className={`space-y-2.5 min-h-[260px] p-1  rounded-xl   duration-200   ${
                getStatusBackgroundColor(status, isDraggingOver[status])
              }`}
            >

            <div className={`mb-3 bg-white  p-2 rounded-xl flex items-center justify-between`}>
              <h3 className="text-sm font-semibold text-slate-700">
                {statusTitle[status]}
              </h3>
              <span className={` items-center px-2 py-0.5 rounded-full text-xs border ${getStatusBorderColor(status).split(' ')[0]} text-slate-500`}>
                {groupedLeads[status].length}
              </span>
            </div>
              {groupedLeads[status].length === 0 ? (
                <div className="text-center py-10 border  border-dashed border-slate-200 rounded-lg bg-slate-50">
                  <p className="text-slate-500  text-sm">No hay leads en esta categoría</p>
                </div>
              ) : (
                groupedLeads[status].map((lead) => {
                  const matchCount = matchingProperties.get(lead.id)?.length || 0;
                  
                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onDragEnd={handleDragEnd}
                      className={`relative rounded-xl  border-l-4 border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer bg-white/90 backdrop-blur ${getStatusColor(lead.estado)}`}
                      onClick={(e) => handleLeadClick(lead, e)}
                    >
                      <div className="p-3 space-y-2.5">
                        <div className="pr-8">
                          <h4 className="text-[13px] font-semibold text-slate-900 leading-tight">
                            {lead.nombreCompleto || (lead as any).nombre || (lead as any).whatsapp_id}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium ${getStatusBadgeColor(lead.estado)}`}>
                            {lead.estado}
                          </span>
                        </div>
                        <div className="h-px bg-slate-100"></div>
                        <div className="text-[11px] text-gray-600 space-y-1.5">
                          <div className="flex items-center">
                            <svg className="h-3 w-3 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 12l4.243-4.243m-9.9 9.9L3.414 12l4.243-4.243" />
                            </svg>
                            <span className="truncate">{(lead as any).zona || lead.zonaInteres}</span>
                          </div>
                          <div className="flex items-center">
                            <svg className="h-3 w-3 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M3 10h18M7 15h10M9 20h6" />
                            </svg>
                            <span className="truncate">{(lead as any).tipo_propiedad || (lead as any).tipoPropiedad} · {formatCurrency(Number(lead.presupuesto ?? 0))}</span>
                          </div>
                          <div className="flex items-center">
                            <svg className="h-3 w-3 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                })
              )}
            </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de detalles usando el componente LeadDetailModal */}
      {showModal && selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={closeModal}
          matchingProperties={matchingProperties.get(selectedLead.id) || []}
        />
      )}
    </>
  );
};

export default LeadCards; 