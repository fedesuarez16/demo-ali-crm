import React, { useMemo } from 'react';
import { PropertyDocument } from '../types';

interface DocumentCardsProps {
  documents: PropertyDocument[];
}

const DocumentCards: React.FC<DocumentCardsProps> = ({ documents }) => {
  const grouped = useMemo(() => {
    const byType: Record<string, PropertyDocument[]> = {};
    documents.forEach((d) => {
      const key = d.tipo_de_propiedad || 'Sin tipo';
      if (!byType[key]) byType[key] = [];
      byType[key].push(d);
    });
    return byType;
  }, [documents]);

  const formatCurrencyLike = (value?: string) => {
    if (!value) return '';
    return value; // keep as-is since input is free text
  };

  const typeOrder = Object.keys(grouped);

  if (documents.length === 0) {
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
    <div className="w-full  overflow-x-auto pb-1">
      <div className="flex gap-1 mb-2 min-w-max pr-2">
        {typeOrder.map((type) => (
          <div key={type} className="min-w-[324px]  bg-slate-100 border-gray-400 rounded-xl">
            <div className={`mb-3 bg-white  p-2 rounded-xl flex items-center justify-between`}>
              <h3 className="text-sm font-semibold text-slate-700">
                {type}
              </h3>
              <span className={` items-center  px-2 py-0.5 rounded-full text-xs border border-gray-400 text-slate-500`}>
                {grouped[type].length}
              </span>
            </div>

            {grouped[type].length === 0 ? (
              <div className="text-center py-4  border  border-dashed border-slate-200 rounded-lg bg-slate-50">
                <p className="text-slate-500  text-sm">No hay propiedades en esta categoría</p>
              </div>
            ) : (
              grouped[type].map((doc) => (
                <div
                  key={doc.id}
                  className="relative rounded-xl mb-2 mx-1  border-l-4 border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer bg-white/90 backdrop-blur"
                >
                  <div className="p-3 space-y-2.5">
                    <div className="pr-8">
                      <h4 className="text-[13px] font-semibold text-slate-900 leading-tight">
                        {doc.direccion || doc.zona || 'Propiedad'}
                      </h4>
                    </div>
                    <div className="text-[11px] text-gray-600 space-y-1.5">
                      <div className="flex items-center">
                        <svg className="h-3 w-3 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 12l4.243-4.243m-9.9 9.9L3.414 12l4.243-4.243" />
                        </svg>
                        <span className="truncate">{doc.zona}</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="h-3 w-3 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M3 10h18M7 15h10M9 20h6" />
                        </svg>
                        <span className="truncate">{doc.tipo_de_propiedad} · {formatCurrencyLike(doc.valor)}</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="h-3 w-3 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="truncate">{doc.dormitorios} dorm · {doc.banos} baños</span>
                      </div>
                    </div>
                    {doc.link && (
                      <div className="pt-1">
                        <a href={doc.link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 hover:text-gray-900 font-medium underline">
                          Ver publicación
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentCards;


