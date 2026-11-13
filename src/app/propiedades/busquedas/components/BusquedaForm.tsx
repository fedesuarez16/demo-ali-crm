'use client';

import React from 'react';
import { PropiedadSelectField } from '../../../components/PropiedadSelectField';
import { PROPIEDAD_DROPDOWN_OPCIONES, type PropiedadDropdownField } from '../../../utils/propiedadOpciones';
import { COLUMN_LABELS, VISIBLE_COLUMNS, type DbCol } from '../busquedasFormat';

interface Props {
  editingId: string | null;
  form: Record<DbCol, string>;
  error: string | null;
  isSaving: boolean;
  onField: (key: DbCol, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function BusquedaForm({ editingId, form, error, isSaving, onField, onClose, onSave }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          {editingId ? `Editar búsqueda #${editingId}` : 'Nueva búsqueda'}
        </h2>
        <p className="text-sm text-gray-500 mb-4">Completá los campos que correspondan.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VISIBLE_COLUMNS.map((key) => {
            const dropdownOptions = PROPIEDAD_DROPDOWN_OPCIONES[key as PropiedadDropdownField];
            const placeholder =
              key === 'valor'
                ? 'Ej: 100.000 - 200.000 (rango) o 200.000 (máximo)'
                : key === 'agente_cliente'
                ? 'Nombre del agente o cliente'
                : undefined;
            const helpText =
              key === 'valor'
                ? 'Podés indicar un rango (mín - máx) o un único valor (se trata como tope máximo).'
                : null;
            return (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{COLUMN_LABELS[key]}</label>
                {dropdownOptions ? (
                  <PropiedadSelectField
                    value={form[key]}
                    onValueChange={(v) => onField(key, v)}
                    options={dropdownOptions}
                    placeholder="Seleccioná…"
                  />
                ) : (
                  <input
                    type="text"
                    value={form[key]}
                    onChange={(e) => onField(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
                {helpText && <p className="mt-1 text-[11px] text-gray-500">{helpText}</p>}
              </div>
            );
          })}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
          >
            {isSaving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
