'use client';

import React from 'react';
import Link from 'next/link';
import type { ProgresoBackfill } from '../../../services/ruedaService';
import { etiquetaResumenRecalculo } from '../../../utils/ruedaUi';

interface Props {
  tab: 'busquedas' | 'nuevos';
  total: number;
  totalFiltradas: number;
  etiquetaFilter: string;
  onEtiquetaFilter: (v: string) => void;
  etiquetas: { items: Array<{ key: string; label: string; count: number }>; untagged: number };
  showImportPanel: boolean;
  onToggleImport: () => void;
  onCreate: () => void;
  onExport: () => void;
  mostrarDescartados: boolean;
  onMostrarDescartados: (v: boolean) => void;
  nuevosCount: number;
  onConfig: () => void;
  backfill: {
    corriendo: boolean;
    progreso: ProgresoBackfill | null;
    resumen: ProgresoBackfill | null;
    error: string | null;
    ejecutar: () => void;
    cerrar: () => void;
  };
}

const btnBase = 'inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium shadow-sm';
const btnSecundario = `${btnBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed`;

export function BusquedasToolbar(p: Props) {
  const { backfill } = p;
  return (
    <div className="px-2 md:px-6 py-3 border-t border-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-800 tracking-tight">Búsquedas</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {p.totalFiltradas} registro{p.totalFiltradas !== 1 ? 's' : ''}
            {p.etiquetaFilter !== '__all__' && <span className="text-gray-400"> · de {p.total} total</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <span className="font-medium">Etiqueta:</span>
            <select
              value={p.etiquetaFilter}
              onChange={(e) => p.onEtiquetaFilter(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-md text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="__all__">Todas ({p.total})</option>
              <option value="__none__">Sin etiqueta ({p.etiquetas.untagged})</option>
              {p.etiquetas.items.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label} ({e.count})
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={p.mostrarDescartados} onChange={(e) => p.onMostrarDescartados(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
            Mostrar descartados
          </label>
          <button type="button" onClick={p.onCreate} className={`${btnBase} text-white bg-gray-700 hover:bg-indigo-700`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar búsqueda
          </button>
          <button type="button" onClick={p.onToggleImport} className={btnSecundario}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {p.showImportPanel ? 'Ocultar importar CSV' : 'Importar CSV'}
          </button>
          <button type="button" onClick={p.onExport} disabled={p.totalFiltradas === 0} className={btnSecundario}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 8l-4-4m4 4l4-4" />
            </svg>
            Exportar CSV
          </button>
          <button type="button" onClick={backfill.ejecutar} disabled={backfill.corriendo} className={btnSecundario} title="Normaliza y recalcula todos los matches">
            {backfill.corriendo ? 'Recalculando…' : 'Recalcular todo'}
          </button>
          <button type="button" onClick={p.onConfig} className={btnSecundario}>
            Configurar matching
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1 border-b border-slate-200">
        <Link href="/propiedades/busquedas" className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px ${p.tab === 'busquedas' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
          Búsquedas
        </Link>
        <Link href="/propiedades/busquedas?tab=nuevos" className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px inline-flex items-center gap-1.5 ${p.tab === 'nuevos' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
          Nuevos
          {p.nuevosCount > 0 && <span className="px-1.5 rounded-full bg-indigo-600 text-white text-[10px] leading-4">{p.nuevosCount}</span>}
        </Link>
      </div>

      {(backfill.corriendo || backfill.resumen || backfill.error) && (
        <div className={`mt-3 rounded-md border px-3 py-2 text-sm flex items-start justify-between gap-3 ${backfill.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-indigo-100 bg-indigo-50 text-indigo-900'}`}>
          <div>
            {backfill.error && <span>Error: {backfill.error}</span>}
            {backfill.corriendo && (
              <span>
                Recalculando… {backfill.progreso ? `pasada ${backfill.progreso.pasada}, ${backfill.progreso.stale_restantes} filas por normalizar` : 'iniciando'}
              </span>
            )}
            {!backfill.corriendo && backfill.resumen && (
              <span>
                Recalculo terminado: {etiquetaResumenRecalculo(backfill.resumen.acumulado)}
                {backfill.resumen.stale_restantes > 0 && ` · quedan ${backfill.resumen.stale_restantes} filas sin normalizar (volvé a ejecutarlo)`}
                {backfill.resumen.acumulado.errores > 0 && ` · ${backfill.resumen.acumulado.errores} errores`}.
              </span>
            )}
          </div>
          {!backfill.corriendo && (
            <button type="button" onClick={backfill.cerrar} className="text-xs underline shrink-0">
              Cerrar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
