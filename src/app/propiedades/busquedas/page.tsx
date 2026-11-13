'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppLayout from '../../components/AppLayout';
import { RuedaConfigDialog } from '../../components/rueda/RuedaConfigDialog';
import { useRuedaNuevosCount } from '../../components/rueda/useRuedaNuevosCount';
import { useBusquedas } from './hooks/useBusquedas';
import { useCsvImport } from './hooks/useCsvImport';
import { useRuedaMatches, useBackfillRueda } from './hooks/useRuedaMatches';
import { BusquedasToolbar } from './components/BusquedasToolbar';
import { BusquedasTable } from './components/BusquedasTable';
import { CsvImportPanel } from './components/CsvImportPanel';
import { BusquedaForm } from './components/BusquedaForm';
import { BusquedaDetailDialog } from './components/BusquedaDetailDialog';
import { NuevosMatchesList } from './components/NuevosMatchesList';

function BusquedasContainer() {
  const tab = useSearchParams().get('tab') === 'nuevos' ? 'nuevos' : 'busquedas';
  const [mostrarDescartados, setMostrarDescartados] = useState(false);
  const [configAbierta, setConfigAbierta] = useState(false);

  const lista = useBusquedas();
  const csv = useCsvImport(lista.loadLista);
  const matches = useRuedaMatches({ incluirDescartados: mostrarDescartados }, tab === 'busquedas');
  const nuevos = useRuedaMatches({ estado: 'nuevo' }, tab === 'nuevos');
  const backfill = useBackfillRueda();
  const nuevosCount = useRuedaNuevosCount();

  return (
    <AppLayout>
      <div className="mb-8">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
          <div className="pl-16 pr-4 py-[13.5px] bg-slate-100 border-b border-slate-200 lg:px-6">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3 text-sm">
                <li>
                  <Link href="/" className="text-gray-600 hover:text-indigo-600">Inicio</Link>
                </li>
                <li className="flex items-center text-gray-400">
                  <span className="mx-1">/</span>
                  <Link href="/propiedades" className="text-gray-600 hover:text-indigo-600">Propiedades</Link>
                </li>
                <li className="flex items-center text-gray-400">
                  <span className="mx-1">/</span>
                  <span className="text-slate-800 font-medium">Búsquedas</span>
                </li>
              </ol>
            </nav>
          </div>

          <BusquedasToolbar
            tab={tab}
            total={lista.busquedas.length}
            totalFiltradas={lista.busquedasFiltradas.length}
            etiquetaFilter={lista.etiquetaFilter}
            onEtiquetaFilter={lista.setEtiquetaFilter}
            etiquetas={lista.etiquetasDisponibles}
            showImportPanel={csv.showImportPanel}
            onToggleImport={() => csv.setShowImportPanel((v) => !v)}
            onCreate={lista.modal.openCreate}
            onExport={lista.handleExport}
            mostrarDescartados={mostrarDescartados}
            onMostrarDescartados={setMostrarDescartados}
            nuevosCount={nuevosCount}
            onConfig={() => setConfigAbierta(true)}
            backfill={backfill}
          />
        </div>

        <div className="px-2 sm:px-4 py-6 max-w-[1800px] mx-auto">
          {tab === 'nuevos' ? (
            <NuevosMatchesList matches={nuevos.matches} loading={nuevos.loading} error={nuevos.error} onChange={nuevos.aplicarCambio} />
          ) : (
            <>
              <BusquedasTable
                busquedas={lista.busquedasFiltradas}
                totalSinFiltrar={lista.busquedas.length}
                isLoading={lista.isLoadingLista}
                matchesPorBusqueda={matches.porBusqueda}
                matchesLoading={matches.loading}
                expandedIds={lista.expandedIds}
                selectedIds={lista.selectedIds}
                deletingId={lista.deletingId}
                isBulkDeleting={lista.isBulkDeleting}
                isTagging={lista.isTagging}
                copiedKey={lista.copiedKey}
                onToggleExpanded={lista.toggleExpanded}
                onToggleSelected={lista.toggleSelected}
                onToggleSelectAll={lista.toggleSelectAll}
                onClearSelection={lista.clearSelection}
                onBulkTag={lista.handleBulkTag}
                onBulkDelete={lista.handleBulkDelete}
                onEdit={lista.modal.openEdit}
                onDelete={lista.handleDeleteBusqueda}
                onOpenDetail={lista.detail.openDetail}
                onCopy={lista.handleCopyText}
                onMatchChange={matches.aplicarCambio}
              />
              {csv.showImportPanel && (
                <CsvImportPanel
                  fileName={csv.fileName}
                  parseError={csv.parseError}
                  mappedHeaders={csv.mappedHeaders}
                  previewRows={csv.previewRows}
                  recordCount={csv.allRecords.length}
                  isImporting={csv.isImporting}
                  importMessage={csv.importMessage}
                  onFile={csv.onFile}
                  onImport={csv.handleImport}
                />
              )}
            </>
          )}
        </div>
      </div>

      {lista.detail.detailBusqueda && (
        <BusquedaDetailDialog
          busqueda={lista.detail.detailBusqueda}
          notas={lista.detail.detailNotas}
          error={lista.detail.detailError}
          isSaving={lista.detail.isSavingDetail}
          onNotas={lista.detail.setDetailNotas}
          onClose={lista.detail.closeDetail}
          onSave={lista.detail.handleSaveDetailNotas}
        />
      )}

      {lista.modal.isModalOpen && (
        <BusquedaForm
          editingId={lista.modal.editingId}
          form={lista.modal.manualForm}
          error={lista.modal.manualError}
          isSaving={lista.modal.isSavingManual}
          onField={lista.modal.handleManualField}
          onClose={lista.modal.closeModal}
          onSave={lista.modal.handleSaveManual}
        />
      )}

      <RuedaConfigDialog open={configAbierta} onOpenChange={setConfigAbierta} />
    </AppLayout>
  );
}

export default function PropiedadBusquedasImportPage() {
  return (
    <Suspense fallback={null}>
      <BusquedasContainer />
    </Suspense>
  );
}
