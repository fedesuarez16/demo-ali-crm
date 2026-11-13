'use client';

import React from 'react';
import type { PropiedadBusqueda } from '../../../types';
import { COLUMN_LABELS, VISIBLE_COLUMNS, formatFecha } from '../busquedasFormat';

interface Props {
  busqueda: PropiedadBusqueda;
  notas: string;
  error: string | null;
  isSaving: boolean;
  onNotas: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function BusquedaDetailDialog({ busqueda, notas, error, isSaving, onNotas, onClose, onSave }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Detalle de búsqueda #{busqueda.id}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Creado: {formatFecha(busqueda.created_at)}
              {busqueda.archivo_origen ? ` · Origen: ${busqueda.archivo_origen}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border border-gray-200 rounded-md mb-4">
          <dl className="divide-y divide-gray-100 text-sm">
            {VISIBLE_COLUMNS.map((c) => {
              const value = (busqueda[c] ?? '') as string;
              if (!value) return null;
              return (
                <div key={c} className="grid grid-cols-3 gap-2 px-3 py-1.5">
                  <dt className="text-gray-500 col-span-1">{COLUMN_LABELS[c]}</dt>
                  <dd className="text-gray-900 col-span-2 break-words">{value}</dd>
                </div>
              );
            })}
          </dl>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            value={notas}
            onChange={(e) => onNotas(e.target.value)}
            rows={6}
            placeholder="Escribí notas sobre esta búsqueda…"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Las notas se usan para extraer requisitos del cliente al calcular coincidencias.
          </p>
        </div>

        {error && <p className="mt-1 mb-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
          >
            {isSaving ? 'Guardando…' : 'Guardar notas'}
          </button>
        </div>
      </div>
    </div>
  );
}
