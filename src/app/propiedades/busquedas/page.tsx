'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  updatePropiedadBusqueda,
} from '../../services/busquedasPropiedadService';
import { getAllPropiedades } from '../../services/propiedadesService';
import { computeMatches, type BusquedaMatchResult } from '../../utils/busquedaMatching';
import type { PropiedadBusqueda, SupabasePropiedad } from '../../types';

type DbCol = (typeof PROPIEDAD_BUSQUEDA_DB_COLUMNS)[number];

const VISIBLE_COLUMNS: DbCol[] = [
  'tipo_de_propiedad',
  'direccion',
  'zona',
  'valor',
  'dormitorios',
  'banos',
  'patio_parque',
  'garage',
  'mts_const',
  'lote',
  'piso',
  'apto_banco',
];

const COLUMN_LABELS: Record<DbCol, string> = {
  tipo_de_propiedad: 'Tipo',
  direccion: 'Dirección',
  zona: 'Zona',
  valor: 'Valor',
  dormitorios: 'Dormitorios',
  banos: 'Baños',
  patio_parque: 'Patio/Parque',
  garage: 'Garage',
  mts_const: 'm² const.',
  lote: 'Lote',
  piso: 'Piso',
  link: 'Link',
  columna_1: 'Columna 1',
  apto_banco: 'Apto banco',
  alternativa_menor_1: 'Alt. menor 1',
  alternativa_menor_2: 'Alt. menor 2',
  alternativa_menor_3: 'Alt. menor 3',
  alterniva_menor_4: 'Alt. menor 4',
  alternativa_menor_5: 'Alt. menor 5',
  alternativa_mayor: 'Alt. mayor',
  alternativa_mayor_2: 'Alt. mayor 2',
  alternativa_mayor_3: 'Alt. mayor 3',
  alternativa_mayor_4: 'Alt. mayor 4',
  alternativa_mayor_5: 'Alt. mayor 5',
  notas: 'Notas',
};

const emptyForm = (): Record<DbCol, string> =>
  Object.fromEntries(PROPIEDAD_BUSQUEDA_DB_COLUMNS.map((k) => [k, ''])) as Record<DbCol, string>;

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

function csvEscape(value: string): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(rows: PropiedadBusqueda[]): string {
  const exportCols: (keyof PropiedadBusqueda)[] = ['id', ...VISIBLE_COLUMNS];
  const header = exportCols.join(',');
  const body = rows
    .map((r) =>
      exportCols.map((c) => csvEscape((r[c] ?? '') as string)).join(',')
    )
    .join('\n');
  return `${header}\n${body}`;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function PropiedadBusquedasImportPage() {
  const [busquedas, setBusquedas] = useState<PropiedadBusqueda[]>([]);
  const [propiedades, setPropiedades] = useState<SupabasePropiedad[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState(emptyForm());
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const loadLista = useCallback(async () => {
    setIsLoadingLista(true);
    const [rows, props] = await Promise.all([
      getAllPropiedadBusquedas(),
      getAllPropiedades(),
    ]);
    setBusquedas(rows);
    setPropiedades(props);
    setIsLoadingLista(false);
  }, []);

  const matchesByBusquedaId = useMemo(() => {
    const map = new Map<string, BusquedaMatchResult>();
    for (const b of busquedas) {
      map.set(b.id, computeMatches(b, propiedades));
    }
    return map;
  }, [busquedas, propiedades]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
          'No se reconoció ninguna columna compatible. Encabezados esperados: ' +
            PROPIEDAD_BUSQUEDA_DB_COLUMNS.join(', ')
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
      setImportMessage(`Error: ${error}. Si la tabla no existe o tiene esquema viejo, ejecutá SUPABASE_propiedad_busquedas.sql en Supabase.`);
    } else {
      setImportMessage(`Se guardaron ${inserted} búsqueda(s).`);
      setAllRecords([]);
      setPreviewRows([]);
      setFileName(null);
      setMappedHeaders([]);
      await loadLista();
    }
  };

  const handleManualField = (key: DbCol, value: string) => {
    setManualForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveManual = async () => {
    setManualError(null);
    setIsSavingManual(true);
    const result = editingId
      ? await updatePropiedadBusqueda(editingId, manualForm)
      : await (async () => {
          const r = await insertPropiedadBusquedas([manualForm], 'manual');
          return { ok: !r.error, error: r.error };
        })();
    setIsSavingManual(false);
    if (!result.ok) {
      setManualError(result.error || 'Error al guardar');
      return;
    }
    setManualForm(emptyForm());
    setEditingId(null);
    setIsModalOpen(false);
    await loadLista();
  };

  const openEdit = (b: PropiedadBusqueda) => {
    const filled = emptyForm();
    for (const k of PROPIEDAD_BUSQUEDA_DB_COLUMNS) {
      filled[k] = (b[k] ?? '') as string;
    }
    setManualForm(filled);
    setEditingId(b.id);
    setManualError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setManualForm(emptyForm());
    setManualError(null);
  };

  const handleExport = () => {
    if (busquedas.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadCsv(`propiedad_busquedas_${stamp}.csv`, buildCsv(busquedas));
  };

  const tableColumns = useMemo(() => VISIBLE_COLUMNS, []);

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
                  setEditingId(null);
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
              <button
                type="button"
                onClick={handleExport}
                disabled={busquedas.length === 0}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 8l-4-4m4 4l4-4" />
                </svg>
                Exportar CSV
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
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap"></th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">Coincidencias</th>
                    {tableColumns.map((c) => (
                      <th key={c} className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                        {COLUMN_LABELS[c]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoadingLista ? (
                    <tr>
                      <td colSpan={tableColumns.length + 3} className="px-3 py-8 text-center text-gray-500">
                        Cargando…
                      </td>
                    </tr>
                  ) : busquedas.length === 0 ? (
                    <tr>
                      <td colSpan={tableColumns.length + 3} className="px-3 py-8 text-center text-gray-500">
                        No hay búsquedas. Agregá una manualmente o importá un CSV.
                      </td>
                    </tr>
                  ) : (
                    busquedas.flatMap((b) => {
                      const result = matchesByBusquedaId.get(b.id);
                      const isExpanded = expandedIds.has(b.id);
                      const hasMatches = !!result && result.totalCount > 0;
                      const rows: React.ReactNode[] = [
                        <tr key={b.id} className="hover:bg-slate-50/80">
                          <td className="px-3 py-2 text-gray-600 font-mono text-xs whitespace-nowrap">{b.id}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openEdit(b)}
                              className="inline-flex items-center justify-center p-1 rounded text-gray-500 hover:text-indigo-700 hover:bg-indigo-50"
                              title="Editar búsqueda"
                              aria-label="Editar búsqueda"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {result && result.criteriaCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(b.id)}
                                disabled={!hasMatches}
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                                  hasMatches
                                    ? result.topScore > 5
                                      ? 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100 cursor-pointer'
                                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 cursor-pointer'
                                    : 'bg-gray-50 text-gray-500 border-gray-200 cursor-default'
                                }`}
                                title={
                                  hasMatches
                                    ? `${result.totalCount} propiedad(es) coinciden. Mejor score ${result.topScore}/${result.criteriaCount}.`
                                    : 'Sin coincidencias en propiedades.'
                                }
                              >
                                <span>★ {result.topScore}/{result.criteriaCount}</span>
                                <span className="text-[10px] opacity-75">·</span>
                                <span>{result.totalCount} match{result.totalCount === 1 ? '' : 'es'}</span>
                                {hasMatches && (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                )}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          {tableColumns.map((c) => {
                            const value = (b[c] ?? '') as string;
                            return (
                              <td
                                key={c}
                                className="px-3 py-2 text-gray-900 max-w-[180px] truncate"
                                title={value}
                              >
                                {value || '—'}
                              </td>
                            );
                          })}
                        </tr>,
                      ];

                      if (isExpanded && hasMatches && result) {
                        const top = result.matches.slice(0, 10);
                        rows.push(
                          <tr key={`${b.id}-detail`} className="bg-amber-50/30">
                            <td colSpan={tableColumns.length + 3} className="px-4 py-3">
                              <div className="text-xs text-gray-600 mb-2">
                                Top {top.length} de {result.totalCount} coincidencia{result.totalCount === 1 ? '' : 's'} (de {result.criteriaCount} criterio{result.criteriaCount === 1 ? '' : 's'} activo{result.criteriaCount === 1 ? '' : 's'}):
                              </div>
                              <div className="overflow-x-auto rounded border border-amber-200 bg-white">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-amber-100/60 text-amber-900">
                                    <tr>
                                      <th className="text-left px-2 py-1.5 font-semibold">Score</th>
                                      <th className="text-left px-2 py-1.5 font-semibold">Tipo</th>
                                      <th className="text-left px-2 py-1.5 font-semibold">Dirección</th>
                                      <th className="text-left px-2 py-1.5 font-semibold">Zona</th>
                                      <th className="text-left px-2 py-1.5 font-semibold">Valor</th>
                                      <th className="text-left px-2 py-1.5 font-semibold">Dorm.</th>
                                      <th className="text-left px-2 py-1.5 font-semibold">Baños</th>
                                      <th className="text-left px-2 py-1.5 font-semibold">m²</th>
                                      <th className="text-left px-2 py-1.5 font-semibold">Campos coincidentes</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-amber-100">
                                    {top.map((m) => (
                                      <tr key={m.propiedad.id}>
                                        <td className="px-2 py-1.5 font-semibold text-amber-800 whitespace-nowrap">
                                          {m.score}/{result.criteriaCount}
                                        </td>
                                        <td className="px-2 py-1.5">{m.propiedad.tipo_de_propiedad || '—'}</td>
                                        <td className="px-2 py-1.5 max-w-[220px] truncate" title={m.propiedad.direccion}>
                                          {m.propiedad.direccion || '—'}
                                        </td>
                                        <td className="px-2 py-1.5">{m.propiedad.zona || '—'}</td>
                                        <td className="px-2 py-1.5 whitespace-nowrap">{m.propiedad.valor || '—'}</td>
                                        <td className="px-2 py-1.5 whitespace-nowrap">{m.propiedad.dormitorios || '—'}</td>
                                        <td className="px-2 py-1.5 whitespace-nowrap">{m.propiedad.banos || '—'}</td>
                                        <td className="px-2 py-1.5 whitespace-nowrap">{m.propiedad.mts_const || '—'}</td>
                                        <td className="px-2 py-1.5">
                                          <div className="flex flex-wrap gap-1">
                                            {m.matchedFields.map((f) => (
                                              <span
                                                key={f}
                                                className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]"
                                              >
                                                {f}
                                              </span>
                                            ))}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
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

          {showImportPanel && (
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50/80 mb-6">
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
                    <strong>{fileName}</strong> — {allRecords.length} fila(s) — columnas: {mappedHeaders.join(', ')}
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {editingId ? `Editar búsqueda #${editingId}` : 'Nueva búsqueda'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">Completá los campos que correspondan.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VISIBLE_COLUMNS.map((key) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {COLUMN_LABELS[key]}
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
                onClick={closeModal}
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
                {isSavingManual ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
