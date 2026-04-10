'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '../../components/AppLayout';
import { parseCsv } from '../../utils/csvParse';
import {
  buildColumnIndexMap,
  rowToBusquedaRecord,
  PROPIEDAD_BUSQUEDA_DB_COLUMNS,
} from '../../utils/propiedadBusquedaCsvMap';
import {
  insertPropiedadBusquedas,
  getAllPropiedadBusquedas,
} from '../../services/busquedasPropiedadService';
import type { PropiedadBusqueda } from '../../types';

const emptyForm = (): Record<(typeof PROPIEDAD_BUSQUEDA_DB_COLUMNS)[number], string> =>
  Object.fromEntries(PROPIEDAD_BUSQUEDA_DB_COLUMNS.map((k) => [k, ''])) as Record<
    (typeof PROPIEDAD_BUSQUEDA_DB_COLUMNS)[number],
    string
  >;

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default function PropiedadBusquedasImportPage() {
  const [busquedas, setBusquedas] = useState<PropiedadBusqueda[]>([]);
  const [isLoadingLista, setIsLoadingLista] = useState(true);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mappedHeaders, setMappedHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [allRecords, setAllRecords] = useState<ReturnType<typeof rowToBusquedaRecord>[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [showImportPanel, setShowImportPanel] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState(emptyForm());
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const loadLista = useCallback(async () => {
    setIsLoadingLista(true);
    const rows = await getAllPropiedadBusquedas();
    setBusquedas(rows);
    setIsLoadingLista(false);
  }, []);

  useEffect(() => {
    loadLista();
  }, [loadLista]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImportMessage(null);
    setParseError(null);
    setPreviewRows([]);
    setAllRecords([]);
    setMappedHeaders([]);
    setFileName(null);
    e.target.value = '';

    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.txt')) {
      setParseError('Usá un archivo .csv o .txt (valores separados por comas).');
      return;
    }

    setFileName(file.name);

    try {
      const text = await file.text();
      const { headers, rows } = parseCsv(text);
      if (headers.length === 0) {
        setParseError('El archivo no tiene encabezados.');
        return;
      }

      const colMap = buildColumnIndexMap(headers);
      if (colMap.size === 0) {
        setParseError(
          'No se reconoció ninguna columna compatible. Revisá encabezados: valor, zona, patio, piscina, habitaciones, baños, mts2.'
        );
        return;
      }

      const mapped = Array.from(new Set(colMap.values()));
      setMappedHeaders(mapped);

      const records = rows.map((cells) => rowToBusquedaRecord(cells, colMap));
      setAllRecords(records);

      setPreviewRows(
        records.slice(0, 5).map((r) => {
          const preview: Record<string, string> = {};
          mapped.forEach((k) => {
            preview[k] = r[k as keyof typeof r];
          });
          return preview;
        })
      );
    } catch (err) {
      console.error(err);
      setParseError('No se pudo leer el archivo.');
    }
  };

  const handleImport = async () => {
    if (allRecords.length === 0 || !fileName) return;
    setIsImporting(true);
    setImportMessage(null);
    const { inserted, error } = await insertPropiedadBusquedas(allRecords, fileName);
    setIsImporting(false);
    if (error) {
      setImportMessage(`Error: ${error}. Si la tabla no existe, ejecutá el script SUPABASE_propiedad_busquedas.sql en Supabase.`);
    } else {
      setImportMessage(`Se guardaron ${inserted} búsqueda(s).`);
      setAllRecords([]);
      setPreviewRows([]);
      setFileName(null);
      setMappedHeaders([]);
      await loadLista();
    }
  };

  const handleManualField = (key: keyof typeof manualForm, value: string) => {
    setManualForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveManual = async () => {
    setManualError(null);
    setIsSavingManual(true);
    const { error } = await insertPropiedadBusquedas([manualForm], 'manual');
    setIsSavingManual(false);
    if (error) {
      setManualError(error);
      return;
    }
    setManualForm(emptyForm());
    setIsModalOpen(false);
    await loadLista();
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
          <div className="px-4 py-[13.5px] bg-slate-100 border-b border-slate-200 md:px-6">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3 text-sm">
                <li>
                  <Link href="/" className="text-gray-600 hover:text-indigo-600">
                    Inicio
                  </Link>
                </li>
                <li className="flex items-center text-gray-400">
                  <span className="mx-1">/</span>
                  <Link href="/propiedades" className="text-gray-600 hover:text-indigo-600">
                    Propiedades
                  </Link>
                </li>
                <li className="flex items-center text-gray-400">
                  <span className="mx-1">/</span>
                  <span className="text-slate-800 font-medium">Búsquedas</span>
                </li>
              </ol>
            </nav>
          </div>

          <div className="px-2 md:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100">
            <div>
              <h1 className="text-lg font-semibold text-slate-800 tracking-tight">Búsquedas</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {busquedas.length} registro{busquedas.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setManualError(null);
                  setManualForm(emptyForm());
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-700 hover:bg-indigo-700 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar búsqueda
              </button>
              <button
                type="button"
                onClick={() => setShowImportPanel((v) => !v)}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {showImportPanel ? 'Ocultar importar CSV' : 'Importar CSV'}
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-4 py-6 max-w-[1800px] mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">ID</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">Valor</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">Zona</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">Patio</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">Piscina</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">Habitaciones</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">Baños</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">m²</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">Origen</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">Creado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoadingLista ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                        Cargando…
                      </td>
                    </tr>
                  ) : busquedas.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                        No hay búsquedas. Agregá una manualmente o importá un CSV.
                      </td>
                    </tr>
                  ) : (
                    busquedas.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2 text-gray-600 font-mono text-xs whitespace-nowrap">{b.id}</td>
                        <td className="px-3 py-2 text-gray-900 max-w-[140px] truncate" title={b.valor}>
                          {b.valor || '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-900 max-w-[120px] truncate" title={b.zona}>
                          {b.zona || '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-700 max-w-[100px] truncate">{b.patio || '—'}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-[100px] truncate">{b.piscina || '—'}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{b.habitaciones || '—'}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{b.banos || '—'}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{b.mts2 || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs max-w-[120px] truncate" title={b.archivo_origen || ''}>
                          {b.archivo_origen || '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">{formatFecha(b.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {showImportPanel && (
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50/80 mb-6">
              <h2 className="text-sm font-semibold text-gray-800 mb-2">Importar desde CSV</h2>
              <p className="text-gray-600 text-sm mb-4">
                Primera fila = encabezados: <strong>valor, zona, patio, piscina, habitaciones, baños, mts2</strong> (en DB{' '}
                <code className="text-xs bg-white px-1 rounded border">banos</code>).
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
                    <strong>{fileName}</strong> — {allRecords.length} fila(s) — columnas: {mappedHeaders.join(', ')}
                  </p>
                )}
              </div>

              <details className="mb-4 text-sm text-gray-700">
                <summary className="cursor-pointer font-medium text-gray-800">Columnas y alias</summary>
                <p className="mt-2 text-xs text-gray-600">{PROPIEDAD_BUSQUEDA_DB_COLUMNS.join(', ')}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Alias: precio → valor, dormitorios → habitaciones, m2 → mts2, patio_parque → patio.
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
                onClick={handleImport}
                disabled={allRecords.length === 0 || isImporting}
                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? 'Guardando…' : `Guardar ${allRecords.length} en base de datos`}
              </button>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Nueva búsqueda</h2>
            <p className="text-sm text-gray-500 mb-4">Completá los campos que correspondan.</p>

            <div className="space-y-3">
              {PROPIEDAD_BUSQUEDA_DB_COLUMNS.map((key) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                    {key === 'banos' ? 'Baños' : key === 'mts2' ? 'm² (mts2)' : key.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    value={manualForm[key]}
                    onChange={(e) => handleManualField(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>

            {manualError && <p className="mt-3 text-sm text-red-600">{manualError}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveManual}
                disabled={isSavingManual}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
              >
                {isSavingManual ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
