'use client';

import React from 'react';
import type { PropiedadBusqueda, RuedaMatch } from '../../../types';
import { resumenBadge, scoreTono } from '../../../utils/ruedaUi';
import { BusquedaMatchesPanel } from './BusquedaMatchesPanel';
import { COLUMN_LABELS, VISIBLE_COLUMNS } from '../busquedasFormat';

interface Props {
  busquedas: PropiedadBusqueda[];
  totalSinFiltrar: number;
  isLoading: boolean;
  matchesPorBusqueda: Map<number, RuedaMatch[]>;
  matchesLoading: boolean;
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  deletingId: string | null;
  isBulkDeleting: boolean;
  isTagging: boolean;
  copiedKey: string | null;
  onToggleExpanded: (id: string) => void;
  onToggleSelected: (id: string) => void;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onBulkTag: () => void;
  onBulkDelete: () => void;
  onEdit: (b: PropiedadBusqueda) => void;
  onDelete: (b: PropiedadBusqueda) => void;
  onOpenDetail: (b: PropiedadBusqueda) => void;
  onCopy: (key: string, text: string) => void;
  onMatchChange: (m: RuedaMatch) => void;
}

const TONO_CLASES = {
  verde: 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100 cursor-pointer',
  ambar: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 cursor-pointer',
  gris: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 cursor-pointer',
};

export function BusquedasTable(p: Props) {
  const colSpan = VISIBLE_COLUMNS.length + 5;
  const sel = p.selectedIds;
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-6">
      {sel.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-indigo-50 border-b border-indigo-100">
          <div className="text-sm text-indigo-900">
            <span className="font-semibold">{sel.size}</span> búsqueda{sel.size === 1 ? '' : 's'} seleccionada{sel.size === 1 ? '' : 's'}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={p.onClearSelection} disabled={p.isBulkDeleting || p.isTagging} className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Cancelar
            </button>
            <button type="button" onClick={p.onBulkTag} disabled={p.isBulkDeleting || p.isTagging} className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {p.isTagging ? 'Etiquetando…' : 'Etiquetar'}
            </button>
            <button type="button" onClick={p.onBulkDelete} disabled={p.isBulkDeleting || p.isTagging} className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
              </svg>
              {p.isBulkDeleting ? 'Borrando…' : `Borrar ${sel.size} seleccionada${sel.size === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2.5 w-10">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todas las búsquedas visibles"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  disabled={p.busquedas.length === 0}
                  checked={p.busquedas.length > 0 && sel.size === p.busquedas.length}
                  ref={(el) => {
                    if (el) el.indeterminate = sel.size > 0 && sel.size < p.busquedas.length;
                  }}
                  onChange={p.onToggleSelectAll}
                />
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">ID</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap"></th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">Coincidencias</th>
              {VISIBLE_COLUMNS.map((c) => (
                <th key={c} className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                  {COLUMN_LABELS[c]}
                </th>
              ))}
              <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {p.isLoading ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-8 text-center text-gray-500">Cargando…</td>
              </tr>
            ) : p.busquedas.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-8 text-center text-gray-500">
                  {p.totalSinFiltrar === 0 ? 'No hay búsquedas. Agregá una manualmente o importá un CSV.' : 'No hay búsquedas con esa etiqueta.'}
                </td>
              </tr>
            ) : (
              p.busquedas.flatMap((b) => {
                const matches = p.matchesPorBusqueda.get(Number(b.id)) ?? [];
                const resumen = resumenBadge(matches);
                const isExpanded = p.expandedIds.has(b.id);
                const hasMatches = resumen.total > 0;
                const rows: React.ReactNode[] = [
                  <tr key={b.id} className={`hover:bg-slate-50/80 ${sel.has(b.id) ? 'bg-indigo-50/40' : ''}`}>
                    <td className="px-3 py-2 w-10">
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar búsqueda ${b.id}`}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={sel.has(b.id)}
                        onChange={() => p.onToggleSelected(b.id)}
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-600 font-mono text-xs whitespace-nowrap">{b.id}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => p.onEdit(b)} className="inline-flex items-center justify-center p-1 rounded text-gray-500 hover:text-indigo-700 hover:bg-indigo-50" title="Editar búsqueda" aria-label="Editar búsqueda">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button type="button" onClick={() => p.onDelete(b)} disabled={p.deletingId === b.id} className="inline-flex items-center justify-center p-1 rounded text-gray-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed" title="Borrar búsqueda" aria-label="Borrar búsqueda">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {hasMatches ? (
                        <button
                          type="button"
                          onClick={() => p.onToggleExpanded(b.id)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${TONO_CLASES[scoreTono(resumen.mejor)]}`}
                          title={`${resumen.total} propiedad(es) coinciden. Mejor puntaje ${resumen.mejor}%.${resumen.nuevos ? ` ${resumen.nuevos} sin revisar.` : ''}`}
                        >
                          <span>★ {resumen.mejor}%</span>
                          <span className="text-[10px] opacity-75">·</span>
                          <span>{resumen.total} match{resumen.total === 1 ? '' : 'es'}</span>
                          {resumen.nuevos > 0 && <span className="px-1.5 rounded-full bg-indigo-600 text-white text-[10px] leading-4">{resumen.nuevos} nuevo{resumen.nuevos === 1 ? '' : 's'}</span>}
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      ) : (
                        p.matchesLoading ? (
                          <span className="text-xs text-gray-400">…</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => p.onToggleExpanded(b.id)}
                            className="text-xs text-gray-400 hover:text-indigo-700 hover:underline"
                            title="Sin coincidencias. Click para ver las más cercanas."
                          >
                            — ver cercanas
                          </button>
                        )
                      )}
                    </td>
                    {VISIBLE_COLUMNS.map((c) => {
                      const value = (b[c] ?? '') as string;
                      if (c === 'etiqueta') {
                        const tag = value.trim();
                        return (
                          <td key={c} className="px-3 py-2 whitespace-nowrap">
                            {tag ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200" title={tag}>
                                {tag}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        );
                      }
                      return (
                        <td key={c} className="px-3 py-2 text-gray-900 max-w-[180px] truncate" title={value}>
                          {value || '—'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {(() => {
                        const hasNotas = !!(b.notas && String(b.notas).trim());
                        return (
                          <button
                            type="button"
                            onClick={() => p.onOpenDetail(b)}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${
                              hasNotas ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                            title={hasNotas ? 'Ver notas' : 'Agregar notas'}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 4h4" />
                            </svg>
                            {hasNotas ? 'Ver notas' : 'Agregar'}
                          </button>
                        );
                      })()}
                    </td>
                  </tr>,
                ];

                if (isExpanded && (hasMatches || !p.matchesLoading)) {
                  rows.push(
                    <tr key={`${b.id}-detail`} className="bg-amber-50/30">
                      <td colSpan={colSpan} className="px-4 py-3">
                        <BusquedaMatchesPanel busquedaId={b.id} matches={matches} copiedKey={p.copiedKey} onCopy={p.onCopy} onChange={p.onMatchChange} />
                      </td>
                    </tr>
                  );
                }
                return rows;
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
