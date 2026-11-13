'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PROPIEDAD_BUSQUEDA_DB_COLUMNS } from '../../../utils/propiedadBusquedaCsvMap';
import {
  insertPropiedadBusquedas,
  getAllPropiedadBusquedas,
  updatePropiedadBusqueda,
  deletePropiedadBusqueda,
  deletePropiedadBusquedasBulk,
  updateEtiquetaBulk,
} from '../../../services/busquedasPropiedadService';
import { dispararRueda } from '../../../services/ruedaService';
import type { PropiedadBusqueda } from '../../../types';
import {
  buildCsv,
  copyToClipboard,
  downloadCsv,
  emptyForm,
  type DbCol,
} from '../busquedasFormat';

/** Estado y acciones de la lista de búsquedas: filtros, selección, CRUD manual, notas, bulk y copiado. */
export function useBusquedas() {
  const [busquedas, setBusquedas] = useState<PropiedadBusqueda[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoadingLista, setIsLoadingLista] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState(emptyForm());
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const [detailBusqueda, setDetailBusqueda] = useState<PropiedadBusqueda | null>(null);
  const [detailNotas, setDetailNotas] = useState('');
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isTagging, setIsTagging] = useState(false);
  const [etiquetaFilter, setEtiquetaFilter] = useState<string>('__all__');

  const loadLista = useCallback(async () => {
    setIsLoadingLista(true);
    const rows = await getAllPropiedadBusquedas();
    setBusquedas(rows);
    setIsLoadingLista(false);
  }, []);

  useEffect(() => {
    loadLista();
  }, [loadLista]);

  const etiquetasDisponibles = useMemo(() => {
    const groups = new Map<string, { label: string; count: number }>();
    let untagged = 0;
    for (const b of busquedas) {
      const raw = (b.etiqueta ?? '').trim();
      if (!raw) {
        untagged++;
        continue;
      }
      const key = raw.toLowerCase();
      const prev = groups.get(key);
      if (prev) prev.count++;
      else groups.set(key, { label: raw, count: 1 });
    }
    const items = Array.from(groups.entries())
      .map(([key, v]) => ({ key, label: v.label, count: v.count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
    return { items, untagged };
  }, [busquedas]);

  const busquedasFiltradas = useMemo(() => {
    if (etiquetaFilter === '__all__') return busquedas;
    if (etiquetaFilter === '__none__') {
      return busquedas.filter((b) => !((b.etiqueta ?? '').trim()));
    }
    return busquedas.filter(
      (b) => (b.etiqueta ?? '').trim().toLowerCase() === etiquetaFilter
    );
  }, [busquedas, etiquetaFilter]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [etiquetaFilter]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === busquedasFiltradas.length && busquedasFiltradas.length > 0) {
        return new Set();
      }
      return new Set(busquedasFiltradas.map((b) => b.id));
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkTag = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const input = window.prompt(
      `Etiqueta para ${count} búsqueda${count === 1 ? '' : 's'} seleccionada${count === 1 ? '' : 's'} (dejá vacío para quitar la etiqueta):`,
      ''
    );
    if (input === null) return;
    setIsTagging(true);
    const result = await updateEtiquetaBulk(Array.from(selectedIds), input);
    setIsTagging(false);
    if (!result.ok) {
      window.alert(
        `Error al etiquetar (${result.updated}/${count} actualizadas): ${result.error || 'desconocido'}`
      );
      return;
    }
    clearSelection();
    await loadLista();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const ok = window.confirm(
      `¿Borrar ${count} búsqueda${count === 1 ? '' : 's'} seleccionada${count === 1 ? '' : 's'}? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    setIsBulkDeleting(true);
    const result = await deletePropiedadBusquedasBulk(Array.from(selectedIds));
    setIsBulkDeleting(false);
    if (!result.ok) {
      window.alert(
        `Error al borrar (${result.deleted}/${count} eliminadas): ${result.error || 'desconocido'}`
      );
    }
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) next.delete(id);
      return next;
    });
    clearSelection();
    await loadLista();
  };

  const handleDeleteBusqueda = async (b: PropiedadBusqueda) => {
    const summary =
      [b.tipo_de_propiedad, b.direccion || b.zona].filter(Boolean).join(' · ') ||
      `#${b.id}`;
    const ok = window.confirm(`¿Borrar la búsqueda "${summary}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    setDeletingId(b.id);
    const result = await deletePropiedadBusqueda(b.id);
    setDeletingId(null);
    if (!result.ok) {
      window.alert(`Error al borrar: ${result.error || 'desconocido'}`);
      return;
    }
    setExpandedIds((prev) => {
      if (!prev.has(b.id)) return prev;
      const next = new Set(prev);
      next.delete(b.id);
      return next;
    });
    await loadLista();
  };

  const handleCopyText = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 1500);
    }
  };

  const handleManualField = (key: DbCol, value: string) => {
    setManualForm((prev) => ({ ...prev, [key]: value }));
  };

  const openCreate = () => {
    setManualError(null);
    setManualForm(emptyForm());
    setEditingId(null);
    setIsModalOpen(true);
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

  const handleSaveManual = async () => {
    setManualError(null);
    setIsSavingManual(true);
    let busquedaIdsRueda: Array<number | string> = [];
    const result = editingId
      ? await updatePropiedadBusqueda(editingId, manualForm)
      : await (async () => {
          const r = await insertPropiedadBusquedas([manualForm], 'manual');
          busquedaIdsRueda = r.ids;
          return { ok: !r.error, error: r.error };
        })();
    setIsSavingManual(false);
    if (!result.ok) {
      setManualError(result.error || 'Error al guardar');
      return;
    }
    if (editingId) busquedaIdsRueda = [editingId];
    void dispararRueda({ busquedaIds: busquedaIdsRueda });
    setManualForm(emptyForm());
    setEditingId(null);
    setIsModalOpen(false);
    await loadLista();
  };

  const openDetail = (b: PropiedadBusqueda) => {
    setDetailBusqueda(b);
    setDetailNotas((b.notas ?? '') as string);
    setDetailError(null);
  };

  const closeDetail = () => {
    setDetailBusqueda(null);
    setDetailNotas('');
    setDetailError(null);
  };

  const handleSaveDetailNotas = async () => {
    if (!detailBusqueda) return;
    setDetailError(null);
    setIsSavingDetail(true);
    const payload = emptyForm();
    for (const k of PROPIEDAD_BUSQUEDA_DB_COLUMNS) {
      payload[k] = (detailBusqueda[k] ?? '') as string;
    }
    payload.notas = detailNotas;
    const result = await updatePropiedadBusqueda(detailBusqueda.id, payload);
    setIsSavingDetail(false);
    if (!result.ok) {
      setDetailError(result.error || 'Error al guardar las notas');
      return;
    }
    void dispararRueda({ busquedaIds: [detailBusqueda.id] });
    closeDetail();
    await loadLista();
  };

  const handleExport = () => {
    if (busquedasFiltradas.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadCsv(`propiedad_busquedas_${stamp}.csv`, buildCsv(busquedasFiltradas));
  };

  return {
    busquedas,
    busquedasFiltradas,
    isLoadingLista,
    loadLista,
    etiquetasDisponibles,
    etiquetaFilter,
    setEtiquetaFilter,
    expandedIds,
    toggleExpanded,
    selectedIds,
    toggleSelected,
    toggleSelectAll,
    clearSelection,
    isBulkDeleting,
    isTagging,
    handleBulkTag,
    handleBulkDelete,
    deletingId,
    handleDeleteBusqueda,
    copiedKey,
    handleCopyText,
    modal: { isModalOpen, editingId, manualForm, isSavingManual, manualError, handleManualField, openCreate, openEdit, closeModal, handleSaveManual },
    detail: { detailBusqueda, detailNotas, setDetailNotas, isSavingDetail, detailError, openDetail, closeDetail, handleSaveDetailNotas },
    handleExport,
  };
}
