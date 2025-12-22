import React, { useMemo } from 'react';
import { SupabasePropiedad } from '../types';

interface PropiedadCardsProps {
  propiedades: SupabasePropiedad[];
  onDelete?: (id: string) => void;
  isDeleting?: string | null;
  onEdit?: (propiedad: SupabasePropiedad) => void;
}

const PropiedadCards: React.FC<PropiedadCardsProps> = ({ propiedades, onDelete, isDeleting, onEdit }) => {
  const grouped = useMemo(() => {
    const byType: Record<string, SupabasePropiedad[]> = {};
    propiedades.forEach((p) => {
      const key = p.tipo_de_propiedad || 'Sin tipo';
      if (!byType[key]) byType[key] = [];
      byType[key].push(p);
    });
    return byType;
  }, [propiedades]);

  const formatCurrencyLike = (value?: string) => {
    if (!value) return '';
    return value; // keep as-is since input is free text
  };

  const typeOrder = Object.keys(grouped);

  if (propiedades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-42 px bg-white ">
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-slate-700 text-lg font-medium">No se encontraron propiedades</p>
        <p className="text-slate-500 text-sm mt-1">Prueba modificando los filtros de búsqueda</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex gap-2 min-w-max pr-2">
        {typeOrder.map((type) => (
          <div key={type} className="min-w-[240px] bg-slate-100 border-gray-400 rounded-xl flex flex-col">
            {/* Header de la columna */}
            <div className="m-2 bg-white p-1.5 rounded-xl flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700">
                {type}
              </h3>
              <span className="items-center px-1.5 py-0.5 rounded-xl text-[10px] border border-gray-400 text-slate-500">
                {grouped[type].length}
              </span>
            </div>

            {/* Área de contenido */}
            <div className="flex-1 min-h-[400px] p-1 rounded-xl">
              <div className="space-y-1.5 h-full">
                {grouped[type].length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg bg-slate-50 w-full">
                      <p className="text-slate-500 text-sm">No hay propiedades en esta categoría</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {grouped[type].map((propiedad) => (
                      <div
                        key={propiedad.id}
                        className="relative rounded-xl border-l-4 border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer bg-white/90 backdrop-blur"
                      >
                        {/* Botones de acción en esquina superior derecha */}
                        <div className="absolute top-1 right-1 flex gap-1 z-10">
                          {onEdit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(propiedad);
                              }}
                              className="text-gray-600 hover:text-gray-900 p-0.5 rounded"
                              title="Editar propiedad"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(propiedad.id);
                              }}
                              disabled={isDeleting === propiedad.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed p-0.5 rounded"
                              title="Eliminar propiedad"
                            >
                              {isDeleting === propiedad.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>

                        <div className="p-2 max-w-[150px] space-y-1.5">
                          <div className="pr-6">
                            <h4 className="text-xs font-semibold text-slate-900 leading-tight truncate">
                              {propiedad.direccion || propiedad.zona || 'Propiedad'}
                            </h4>
                          </div>
                          
                          {/* Badge de tipo */}
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center px-1 py-0.5 rounded-md text-[10px] font-medium border bg-gray-50 text-gray-700 border-gray-200">
                              {propiedad.tipo_de_propiedad || 'Sin tipo'}
                            </span>
                          </div>
                          
                          <div className="h-px bg-slate-100"></div>
                          
                          <div className="text-[10px] text-gray-600 space-y-1">
                            <div className="flex items-center">
                              <svg className="h-2.5 w-2.5 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 12l4.243-4.243m-9.9 9.9L3.414 12l4.243-4.243" />
                              </svg>
                              <span className="truncate">{propiedad.zona || 'Sin zona'}</span>
                            </div>
                            <div className="flex items-center">
                              <svg className="h-2.5 w-2.5 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M3 10h18M7 15h10M9 20h6" />
                              </svg>
                              <span className="truncate">{formatCurrencyLike(propiedad.valor) || 'Sin precio'}</span>
                            </div>
                            <div className="flex items-center">
                              <svg className="h-2.5 w-2.5 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span className="truncate">
                                {propiedad.dormitorios || '0'} dorm · {propiedad.banos || '0'} baños
                              </span>
                            </div>
                            {propiedad.mts_const && (
                              <div className="flex items-center">
                                <svg className="h-2.5 w-2.5 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                                <span className="truncate">{propiedad.mts_const} m²</span>
                              </div>
                            )}
                          </div>
                          
                          {propiedad.link && (
                            <div className="pt-1">
                              <a 
                                href={propiedad.link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] text-gray-600 hover:text-gray-900 font-medium underline"
                              >
                                Ver publicación
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Área de espacio adicional */}
                    <div className="flex-1 min-h-[100px]"></div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropiedadCards;

