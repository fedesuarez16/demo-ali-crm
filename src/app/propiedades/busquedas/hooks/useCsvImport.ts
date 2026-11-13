'use client';

import React, { useState } from 'react';
import { parseCsv } from '../../../utils/csvParse';
import {
  buildColumnIndexMap,
  rowToBusquedaRecord,
  PROPIEDAD_BUSQUEDA_DB_COLUMNS,
} from '../../../utils/propiedadBusquedaCsvMap';
import { insertPropiedadBusquedas } from '../../../services/busquedasPropiedadService';
import { dispararRueda } from '../../../services/ruedaService';

/** Importación de búsquedas desde CSV. `onImported` recarga la lista tras guardar. */
export function useCsvImport(onImported: () => Promise<void> | void) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mappedHeaders, setMappedHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [allRecords, setAllRecords] = useState<ReturnType<typeof rowToBusquedaRecord>[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [showImportPanel, setShowImportPanel] = useState(false);

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
    const { inserted, ids, error } = await insertPropiedadBusquedas(allRecords, fileName);
    setIsImporting(false);
    if (error) {
      setImportMessage(`Error: ${error}. Si la tabla no existe o tiene esquema viejo, ejecutá SUPABASE_propiedad_busquedas.sql en Supabase.`);
    } else {
      setImportMessage(`Se guardaron ${inserted} búsqueda(s).`);
      void dispararRueda({ busquedaIds: ids });
      setAllRecords([]);
      setPreviewRows([]);
      setFileName(null);
      setMappedHeaders([]);
      await onImported();
    }
  };

  return {
    fileName, parseError, mappedHeaders, previewRows, allRecords,
    isImporting, importMessage, showImportPanel, setShowImportPanel,
    onFile, handleImport,
  };
}
