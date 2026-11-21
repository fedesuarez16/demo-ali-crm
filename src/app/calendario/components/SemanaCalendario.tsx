'use client';

import React from 'react';
import type { EventoVista } from '../hooks/useCalendario';
import { DIAS_SEMANA } from '../calendarioUi';

interface Props {
  dias: string[]; // 7 fechas YYYY-MM-DD desde el lunes
  eventos: EventoVista[];
  mostrarPersona: boolean;
  onEvento: (e: EventoVista) => void;
}

const fechaLocal = (iso: string) => new Date(iso).toLocaleDateString('en-CA');
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

export function SemanaCalendario({ dias, eventos, mostrarPersona, onEvento }: Props) {
  const hoy = new Date().toLocaleDateString('en-CA');
  const porDia = new Map<string, EventoVista[]>(dias.map((d) => [d, []]));
  for (const e of eventos) {
    if (e.todo_el_dia) {
      // Eventos de día completo: aparecen en cada día que cubren
      for (const d of dias) if (d >= fechaLocal(e.inicio) && d < fechaLocal(e.fin)) porDia.get(d)!.push(e);
    } else {
      porDia.get(fechaLocal(e.inicio))?.push(e);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
      {dias.map((d, i) => {
        const lista = porDia.get(d) ?? [];
        const esHoy = d === hoy;
        return (
          <div key={d} className="bg-white min-h-[120px] md:min-h-[420px] flex flex-col">
            <div className={`px-2 py-1.5 border-b border-slate-100 text-xs font-medium ${esHoy ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}>
              {DIAS_SEMANA[i].corto} {d.slice(8, 10)}/{d.slice(5, 7)}
            </div>
            <div className="flex-1 p-1.5 space-y-1.5">
              {lista.length === 0 && <p className="text-[11px] text-slate-300 px-1 md:hidden">Sin eventos</p>}
              {lista.map((e) => (
                <button
                  key={`${e.persona_id}-${e.id}`}
                  type="button"
                  onClick={() => onEvento(e)}
                  className="w-full text-left rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2 py-1.5 border-l-4 transition-colors"
                  style={{ borderLeftColor: e.color ?? '#94a3b8' }}
                >
                  <div className="text-[11px] text-slate-500">{e.todo_el_dia ? 'Todo el día' : `${hora(e.inicio)} - ${hora(e.fin)}`}</div>
                  <div className="text-xs font-medium text-slate-800 line-clamp-2">{e.titulo}</div>
                  {mostrarPersona && <div className="text-[10px] text-slate-400 mt-0.5">{e.persona_nombre}</div>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
