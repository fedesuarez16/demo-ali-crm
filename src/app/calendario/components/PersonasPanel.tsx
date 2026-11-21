'use client';

import React from 'react';
import type { PersonaPublica } from '../hooks/useCalendario';

interface Props {
  personas: PersonaPublica[];
  ocupado: number | null;
  onToggleActivo: (p: PersonaPublica) => void;
  onDesconectar: (p: PersonaPublica) => void;
}

export function PersonasPanel({ personas, ocupado, onToggleActivo, onDesconectar }: Props) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="font-semibold text-slate-800">Calendarios vinculados</h3>
          <p className="text-xs text-slate-500">Cada persona conecta su cuenta de Google Workspace. Los tokens se guardan cifrados.</p>
        </div>
        {/* Navegación completa: el endpoint redirige a Google */}
        <a href="/api/calendario/google/conectar" className="px-3 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
          Conectar Google Calendar
        </a>
      </div>

      {personas.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía no hay ningún calendario vinculado.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {personas.map((p) => (
            <li key={p.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{p.nombre}</p>
                <p className="text-xs text-slate-500 truncate">
                  {p.email} · {p.zona_horaria}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${
                    p.conectado ? (p.activo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500') : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {p.conectado ? (p.activo ? 'Conectado' : 'Pausado') : 'Desconectado'}
                </span>
                {p.conectado ? (
                  <>
                    <button
                      type="button"
                      disabled={ocupado === p.id}
                      onClick={() => onToggleActivo(p)}
                      className="px-2 py-1 text-xs rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {p.activo ? 'Pausar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      disabled={ocupado === p.id}
                      onClick={() => onDesconectar(p)}
                      className="px-2 py-1 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Desconectar
                    </button>
                  </>
                ) : (
                  <a
                    href={`/api/calendario/google/conectar?email=${encodeURIComponent(p.email)}`}
                    className="px-2 py-1 text-xs rounded-md border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  >
                    Reconectar
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
