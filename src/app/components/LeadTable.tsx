import React from 'react';
import { Lead } from '../types';

interface LeadTableProps {
  leads: Lead[];
}

const LeadTable: React.FC<LeadTableProps> = ({ leads }) => {
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

  const statusOrder = ['frío', 'tibio', 'caliente', 'llamada', 'visita'] as const;

  // Agrupar por estado según el orden solicitado
  const grouped = statusOrder.map(status => leads.filter(l => (l.estado as unknown as string) === status));

  const renderLead = (lead: Lead) => (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-sm font-medium text-gray-900">{lead.nombreCompleto || (lead as any).nombre || lead.email}</div>
      <div className="text-gray-600 text-sm">{lead.telefono}</div>
      <div className="text-gray-500 text-xs">{(lead as any).zona || lead.zonaInteres}</div>
    </div>
  );

  return (
    <div className="overflow-x-auto ">
      <div className="min-w-max grid grid-cols-5 gap-4">
        {statusOrder.map((col, idx) => (
          <div key={col} className="min-w-[260px] bg-white">
            <div className="mb-2 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">{col}</div>
            <div className="space-y-2">
              {grouped[idx].length === 0 ? (
                <div className="text-xs  text-slate-400  rounded-md py-6 text-center">Vacío</div>
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