import React, { useState } from 'react';
import { Lead, Property } from '../types';

interface LeadDetailSidebarProps {
  lead: Lead | null;
  onClose: () => void;
  matchingProperties: Property[];
  isOpen: boolean;
}

const LeadDetailSidebar: React.FC<LeadDetailSidebarProps> = ({ 
  lead, 
  onClose, 
  matchingProperties, 
  isOpen 
}) => {
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  
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

  const toggleMessageMenu = () => {
    setShowMessageMenu(!showMessageMenu);
  };

  if (!lead) return null;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-40" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full w-[500px] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center">
            <h3 className="text-lg font-medium text-gray-900">
              {lead.nombreCompleto || (lead as any).nombre || (lead as any).whatsapp_id}
            </h3>
            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(lead.estado)}`}>
              {lead.estado}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Barra de acciones */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-2">
            {/* Botón de programar mensaje con menú desplegable */}
            <div className="relative col-span-2">
              <button 
                onClick={toggleMessageMenu}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Programar mensaje
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Menú desplegable para programar mensaje */}
              {showMessageMenu && (
                <div className="absolute z-20 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200">
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Programar mensaje</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Canal</label>
                        <select className="w-full text-sm border border-gray-300 rounded-md py-1.5 px-2">
                          <option>WhatsApp</option>
                          <option>Email</option>
                          <option>SMS</option>
                          <option>Llamada</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Fecha y hora</label>
                        <input type="datetime-local" className="w-full text-sm border border-gray-300 rounded-md py-1.5 px-2" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Plantilla</label>
                        <select className="w-full text-sm border border-gray-300 rounded-md py-1.5 px-2">
                          <option>Seguimiento inicial</option>
                          <option>Propuesta comercial</option>
                          <option>Recordatorio de cita</option>
                          <option>Personalizado</option>
                        </select>
                      </div>
                      <div className="pt-2 flex justify-end space-x-2">
                        <button 
                          onClick={toggleMessageMenu}
                          className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-700"
                        >
                          Cancelar
                        </button>
                        <button className="px-3 py-1.5 text-xs bg-gray-700 text-white rounded-md hover:bg-gray-800">
                          Programar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Botón de llamada */}
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Llamar
            </button>
            
            {/* Botón de email */}
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </button>
          </div>
        </div>
        
        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Información de contacto */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Información de contacto</h4>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-900">{lead.email}</span>
                </div>
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm text-gray-900">{(lead as any).whatsapp_id || lead.telefono}</span>
                </div>
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-900">
                    Última interacción: {lead.ultima_interaccion ? formatDate(lead.ultima_interaccion) : formatDate(lead.fechaContacto)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Intereses */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Intereses</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Presupuesto:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(Number(lead.presupuesto ?? 0))}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Zona:</span>
                  <span className="text-sm font-medium text-gray-900">{lead.zonaInteres || (lead as any).zona}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Tipo de propiedad:</span>
                  <span className="text-sm font-medium text-gray-900">{(lead as any).tipo_propiedad || (lead as any).tipoPropiedad || lead.tipoPropiedad}</span>
                </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Intención:</span>
                    <span className="text-sm font-medium text-gray-900">{(lead as any).intencion || (lead as any).motivoInteres || lead.motivoInteres}</span>
                  </div>
                  {/* Nuevo campo: Propiedad de interés */}
                  {lead.propiedad_interes && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Propiedad de interés:</span>
                      <span className="text-sm font-medium text-gray-900">{lead.propiedad_interes}</span>
                    </div>
                  )}

                {(lead as any).forma_pago && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Forma de pago:</span>
                    <span className="text-sm font-medium text-gray-900">{(lead as any).forma_pago}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Requerimientos */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Requerimientos</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-500">Características buscadas:</span>
                  <span className="text-sm font-medium text-gray-900 text-right max-w-[250px]">
                    {(lead as any).caracteristicas_buscadas || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-500">Características de venta:</span>
                  <span className="text-sm font-medium text-gray-900 text-right max-w-[250px]">
                    {(lead as any).caracteristicas_venta || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-500">Superficie mínima:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {lead.superficieMinima ? `${lead.superficieMinima} m²` : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-500">Cantidad de ambientes:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {lead.cantidadAmbientes || '-'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Notas */}
            {(lead.observaciones || (lead as any).propiedades_mostradas) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Notas</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                  {lead.observaciones || (lead as any).propiedades_mostradas}
                </div>
              </div>
            )}
            
            {/* Propiedades coincidentes */}
            {matchingProperties.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                  Propiedades Coincidentes
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    {matchingProperties.length}
                  </span>
                </h4>
                
                <div className="space-y-3">
                  {matchingProperties.map(property => (
                    <div key={property.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 flex justify-between items-center">
                        <h5 className="font-medium text-gray-900 truncate">{property.titulo}</h5>
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${property.estado === 'disponible' ? 'bg-gray-100 text-gray-800' : ''}
                          ${property.estado === 'reservada' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${property.estado === 'vendida' ? 'bg-red-100 text-red-800' : ''}
                          ${property.estado === 'alquilada' ? 'bg-blue-100 text-blue-800' : ''}
                        `}>
                          {property.estado}
                        </span>
                      </div>
                      
                      <div className="p-4">
                        <div className="space-y-2 mb-3">
                          <div>
                            <p className="text-xs text-gray-500">Ubicación</p>
                            <p className="text-sm font-medium">{property.zona} - {property.direccion}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-gray-500">Precio</p>
                              <p className="text-sm font-medium">{formatCurrency(property.precio)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Tipo</p>
                              <p className="text-sm font-medium capitalize">{property.tipo}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Características</p>
                            <p className="text-sm font-medium">
                              {property.superficie} m² · {property.ambientes} amb. · {property.dormitorios} dorm.
                            </p>
                          </div>
                        </div>
                        
                        <div className="pt-3 border-t border-gray-100 flex justify-end">
                          <a 
                            href={`/propiedades/${property.id}`}
                            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                            }}
                          >
                            Ver propiedad
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LeadDetailSidebar;
