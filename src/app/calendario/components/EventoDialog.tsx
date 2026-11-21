'use client';

import React from 'react';
import type { EventoVista, TipoEvento } from '../hooks/useCalendario';

interface Props {
  evento: EventoVista;
  tipos: TipoEvento[];
  cancelando: boolean;
  onCancelar: () => void;
  onClose: () => void;
}

const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function EventoDialog({ evento, tipos, cancelando, onCancelar, onClose }: Props) {
  const tipo = tipos.find((t) => t.slug === evento.tipo_slug);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            {tipo && (
              <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full text-white mb-1" style={{ backgroundColor: tipo.color }}>
                {tipo.nombre}
              </span>
            )}
            <h2 className="text-lg font-semibold text-gray-900">{evento.titulo}</h2>
            <p className="text-sm text-gray-500 capitalize">{evento.todo_el_dia ? 'Todo el día' : `${fecha(evento.inicio)} hs`}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Cerrar">
            ×
          </button>
        </div>

        <dl className="text-sm space-y-1.5 mb-4">
          <div className="flex gap-2">
            <dt className="text-gray-500 w-20 shrink-0">Calendario</dt>
            <dd className="text-gray-800">{evento.persona_nombre}</dd>
          </div>
          {(evento.lead_id || evento.lead_nombre) && (
            <div className="flex gap-2">
              <dt className="text-gray-500 w-20 shrink-0">Lead</dt>
              <dd className="text-gray-800">
                {evento.lead_nombre || 'Sin nombre'}
                {evento.lead_id ? ` (#${evento.lead_id})` : ''}
              </dd>
            </div>
          )}
        </dl>
        {evento.descripcion && <p className="text-sm text-gray-700 whitespace-pre-line bg-slate-50 rounded-md p-3 mb-4">{evento.descripcion}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          {evento.html_link && (
            <a href={evento.html_link} target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50">
              Abrir en Google Calendar
            </a>
          )}
          {evento.crm_evento_id && (
            <button
              type="button"
              disabled={cancelando}
              onClick={onCancelar}
              className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {cancelando ? 'Cancelando…' : 'Cancelar evento'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
