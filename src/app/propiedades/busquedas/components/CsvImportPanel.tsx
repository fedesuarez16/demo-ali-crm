'use client';

import React from 'react';
import { PROPIEDAD_BUSQUEDA_DB_COLUMNS } from '../../../utils/propiedadBusquedaCsvMap';

interface Props {
  fileName: string | null;
  parseError: string | null;
  mappedHeaders: string[];
  previewRows: Record<string, string>[];
  recordCount: number;
  isImporting: boolean;
  importMessage: string | null;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
}

export function CsvImportPanel({ fileName, parseError, mappedHeaders, previewRows, recordCount, isImporting, importMessage, onFile, onImport }: Props) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 sm:p-6 bg-gray-50/80 mb-6">
      <h2 className="text-sm font-semibold text-gray-800 mb-2">Importar desde CSV</h2>
      <p className="text-gray-600 text-sm mb-4">
        La primera fila debe ser encabezados. Se aceptan los nombres de columna de <code className="text-xs bg-white px-1 rounded border">propiedades</code>.
      </p>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Archivo</label>
        <input
          type="file"
          accept=".csv,.txt,text/csv"
          onChange={onFile}
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
        {parseError && <p className="mt-2 text-sm text-red-600">{parseError}</p>}
        {fileName && !parseError && mappedHeaders.length > 0 && (
          <p className="mt-2 text-sm text-green-700">
            <strong>{fileName}</strong> — {recordCount} fila(s) — columnas: {mappedHeaders.join(', ')}
          </p>
        )}
      </div>

      <details className="mb-4 text-sm text-gray-700">
        <summary className="cursor-pointer font-medium text-gray-800">Columnas y alias</summary>
        <p className="mt-2 text-xs text-gray-600">{PROPIEDAD_BUSQUEDA_DB_COLUMNS.join(', ')}</p>
        <p className="mt-1 text-xs text-gray-500">
          Alias soportados: precio→valor, habitaciones→dormitorios, m2/mts2/metros→mts_const, patio/jardin→patio_parque, cochera→garage, tipo→tipo_de_propiedad, observaciones/comentarios→notas.
        </p>
      </details>

      {previewRows.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-700 mb-2">Vista previa (5 filas)</p>
          <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {mappedHeaders.map((h) => (
                    <th key={h} className="text-left px-2 py-1.5 font-medium text-gray-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {mappedHeaders.map((h) => (
                      <td key={h} className="px-2 py-1.5 max-w-[160px] truncate" title={row[h]}>
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {importMessage && (
        <p className={`text-sm mb-3 ${importMessage.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
          {importMessage}
        </p>
      )}

      <button
        type="button"
        onClick={onImport}
        disabled={recordCount === 0 || isImporting}
        className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isImporting ? 'Guardando…' : `Guardar ${recordCount} en base de datos`}
      </button>
    </div>
  );
}
