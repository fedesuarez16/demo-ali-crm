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
import { insertPropiedadBusquedas, countPropiedadBusquedas } from '../../services/busquedasPropiedadService';

export default function PropiedadBusquedasImportPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mappedHeaders, setMappedHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [allRecords, setAllRecords] = useState<ReturnType<typeof rowToBusquedaRecord>[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [totalEnTabla, setTotalEnTabla] = useState<number | null>(null);

  const refreshCount = useCallback(async () => {
    setTotalEnTabla(await countPropiedadBusquedas());
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

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
      setImportMessage(`Se guardaron ${inserted} búsqueda(s) en la base de datos.`);
      setAllRecords([]);
      setPreviewRows([]);
      setFileName(null);
      setMappedHeaders([]);
      await refreshCount();
    }
  };

  return (
    <AppLayout>
      <div className="mb-8 px-4 py-6 max-w-4xl mx-start justify-center">
        <nav className="text-sm text-gray-600 mb-4">
          <Link href="/propiedades" className="hover:text-indigo-600">
            Propiedades
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">Búsquedas (importar)</span>
        </nav>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">Importar búsquedas desde CSV</h1>
        <p className="text-gray-600 text-sm mb-6">
          La primera fila debe ser encabezados. Columnas esperadas:{' '}
          <strong>valor, zona, patio, piscina, habitaciones, baños, mts2</strong> (en la base el campo de baños es{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">banos</code>).
        </p>

        {totalEnTabla !== null && (
          <p className="text-sm text-gray-700 mb-4">
            Registros actuales en <code className="text-xs bg-gray-100 px-1 rounded">propiedad_busquedas</code>:{' '}
            <strong>{totalEnTabla}</strong>
          </p>
        )}

        <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Archivo CSV</label>
          <input
            type="file"
            accept=".csv,.txt,text/csv"
            onChange={onFile}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {parseError && <p className="mt-3 text-sm text-red-600">{parseError}</p>}
          {fileName && !parseError && mappedHeaders.length > 0 && (
            <p className="mt-3 text-sm text-green-700">
              Archivo: <strong>{fileName}</strong> — {allRecords.length} fila(s) — columnas reconocidas:{' '}
              {mappedHeaders.join(', ')}
            </p>
          )}
        </div>

        <details className="mb-6 text-sm text-gray-700 border border-gray-100 rounded-lg p-4 bg-gray-50">
          <summary className="cursor-pointer font-medium text-gray-800">Columnas admitidas (exportá desde Excel como CSV)</summary>
          <p className="mt-2 text-xs text-gray-600 leading-relaxed">
            {PROPIEDAD_BUSQUEDA_DB_COLUMNS.join(', ')}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Alias útiles: precio → valor, dormitorios → habitaciones, m2 / metros → mts2, patio_parque → patio.
          </p>
        </details>

        {previewRows.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Vista previa (primeras 5 filas)</h2>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {mappedHeaders.map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-medium text-gray-700 capitalize">
                        {h.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {mappedHeaders.map((h) => (
                        <td key={h} className="px-3 py-2 text-gray-800 max-w-[200px] truncate" title={row[h]}>
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
          <p className={`text-sm mb-4 ${importMessage.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
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
    </AppLayout>
  );
}
