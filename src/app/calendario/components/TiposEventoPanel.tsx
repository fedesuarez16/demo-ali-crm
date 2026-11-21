'use client';

import React from 'react';
import type { PersonaPublica, TipoEvento } from '../hooks/useCalendario';

interface Props {
  tipos: TipoEvento[];
  personas: PersonaPublica[];
  onEditar: (t: TipoEvento) => void;
  onNuevo: () => void;
}

export function TiposEventoPanel({ tipos, personas, onEditar, onNuevo }: Props) {
  const nombrePersona = (id: number | null) => (id ? personas.find((p) => p.id === id)?.nombre ?? '—' : 'Primer calendario');
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="font-semibold text-slate-800">Tipos de evento</h3>
          <p className="text-xs text-slate-500">Duración, horario y responsable de cada tipo. Marcá cuáles puede agendar el bot.</p>
        </div>
        <button type="button" onClick={onNuevo} className="px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50">
          Nuevo tipo
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
              <th className="py-2 pr-3 font-medium">Tipo</th>
              <th className="py-2 pr-3 font-medium">Duración</th>
              <th className="py-2 pr-3 font-medium">Responsable</th>
              <th className="py-2 pr-3 font-medium">Bot</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tipos.map((t) => (
              <tr key={t.id} className={t.activo ? '' : 'opacity-50'}>
                <td className="py-2 pr-3">
                  <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ backgroundColor: t.color }} />
                  <span className="font-medium text-slate-800">{t.nombre}</span>
                  <span className="text-xs text-slate-400 ml-1">({t.slug})</span>
                </td>
                <td className="py-2 pr-3 text-slate-600 whitespace-nowrap">{t.duracion_min} min</td>
                <td className="py-2 pr-3 text-slate-600">{nombrePersona(t.persona_id)}</td>
                <td className="py-2 pr-3">{t.agendable_por_bot ? <span className="text-green-600">Sí</span> : <span className="text-slate-400">No</span>}</td>
                <td className="py-2 text-right">
                  <button type="button" onClick={() => onEditar(t)} className="text-indigo-600 hover:text-indigo-800 text-xs">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
