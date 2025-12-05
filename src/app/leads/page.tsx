'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import LeadCards from '../components/LeadCards';
import LeadFilter from '../components/LeadFilter';
import LeadEditSidebar from '../components/LeadEditSidebar';
import AgentStatusToggle from '../components/AgentStatusToggle';
import { Lead, FilterOptions, LeadStatus } from '../types';
import { 
  getAllLeads, 
  filterLeads, 
  getUniqueZones,
  getUniqueStatuses,
  getUniquePropertyTypes,
  getUniqueInterestReasons,
  getUniquePropertyInterests,
  updateLeadStatus,
  createLead,
  updateLead
} from '../services/leadService';
import { exportLeadsToCSV } from '../utils/exportUtils';
import { getKanbanColumns, saveKanbanColumns, migrateColumnsFromLocalStorage } from '../services/columnService';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function LeadsKanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({});
  const [isFilterVisible, setIsFilterVisible] = useState(false); // Por defecto cerrado
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [zonas, setZonas] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>([]);
  const [tiposPropiedad, setTiposPropiedad] = useState<string[]>([]);
  const [motivosInteres, setMotivosInteres] = useState<string[]>([]);
  const [propiedadesInteres, setPropiedadesInteres] = useState<string[]>([]);
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
  
  // Estados para el sidebar de edición
  const [isEditSidebarOpen, setIsEditSidebarOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  
  // Estados para columnas personalizadas
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [isAddColumnModalVisible, setIsAddColumnModalVisible] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#3b82f6'); // Color por defecto (azul)
  const [isColumnSelectorVisible, setIsColumnSelectorVisible] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['frío', 'tibio', 'caliente', 'llamada', 'visita']);
  const [columnColors, setColumnColors] = useState<Record<string, string>>({});

  // Cargar columnas personalizadas desde Supabase al inicializar
  useEffect(() => {
    const loadColumns = async () => {
      try {
        // Primero intentar migrar desde localStorage si existe
        await migrateColumnsFromLocalStorage();
        
        // Cargar columnas desde Supabase
        const { customColumns: loadedCustom, visibleColumns: loadedVisible, columnColors: loadedColors } = await getKanbanColumns();
        setCustomColumns(loadedCustom);
        setVisibleColumns(loadedVisible);
        setColumnColors(loadedColors);
      } catch (error) {
        console.error('Error loading columns from Supabase:', error);
        // Fallback a valores por defecto
        setCustomColumns([]);
        setVisibleColumns(['frío', 'tibio', 'caliente', 'llamada', 'visita']);
      }
    };
    
    loadColumns();
  }, []);
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Simulamos una carga asíncrona para mostrar el efecto de carga
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const allLeads = await getAllLeads();
      setLeads(allLeads);
      setFilteredLeads(allLeads);
      
      // Cargar opciones para los filtros
      setZonas(getUniqueZones());
      setEstados(getUniqueStatuses());
      setTiposPropiedad(getUniquePropertyTypes());
      setMotivosInteres(getUniqueInterestReasons());
      setPropiedadesInteres(getUniquePropertyInterests());
      
      setIsLoading(false);
    };
    
    loadData();
  }, []);
  
  // Aplicar filtros y búsqueda cuando cambien las opciones
  useEffect(() => {
    let filtered = filterLeads(filterOptions);
    
    // Aplicar búsqueda por texto si hay término de búsqueda
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(lead => {
        const nombre = (lead.nombreCompleto || (lead as any).nombre || '').toLowerCase();
        const telefono = ((lead as any).whatsapp_id || lead.telefono || '').toString();
        const email = (lead.email || '').toLowerCase();
        
        return nombre.includes(searchLower) || 
               telefono.includes(searchTerm.trim()) ||
               email.includes(searchLower);
      });
    }
    
    setFilteredLeads(filtered);
  }, [filterOptions, searchTerm]);
  
  const handleFilterChange = (newFilterOptions: FilterOptions) => {
    setFilterOptions(newFilterOptions);
  };
  
  const handleResetFilters = () => {
    setFilterOptions({});
    setSearchTerm('');
  };

  const handleExportCSV = () => {
    exportLeadsToCSV(filteredLeads, 'leads_inmobiliaria');
  };

  const toggleFilterVisibility = () => {
    setIsFilterVisible(!isFilterVisible);
  };

  const handleLeadStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      console.log(`Updating lead ${leadId} from status to ${newStatus}`);
      
      // Actualizar el estado del lead en el servicio
      const success = await updateLeadStatus(leadId, newStatus);
      
      if (success) {
        console.log(`Successfully updated lead ${leadId} to ${newStatus}`);
        
        // Actualizar el estado local
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId ? { ...lead, estado: newStatus as LeadStatus } : lead
          )
        );
        
        // Actualizar los leads filtrados
        setFilteredLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId ? { ...lead, estado: newStatus as LeadStatus } : lead
          )
        );
        
        // Actualizar estados únicos para incluir el nuevo estado personalizado
        setEstados(getUniqueStatuses());
      } else {
        console.error(`Failed to update lead ${leadId} status in database`);
        // Aquí podrías mostrar una notificación de error al usuario
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
      // Aquí podrías mostrar una notificación de error al usuario
    }
  };

  const handleOpenNewLead = () => {
    setLeadToEdit(null);
    setIsEditSidebarOpen(true);
  };

  const handleOpenEditLead = (lead: Lead) => {
    setLeadToEdit(lead);
    setIsEditSidebarOpen(true);
  };

  const handleCloseEditSidebar = () => {
    setIsEditSidebarOpen(false);
    setLeadToEdit(null);
  };

  // Funciones para manejar columnas personalizadas
  const handleAddColumn = async () => {
    if (newColumnName.trim() && !visibleColumns.includes(newColumnName.trim().toLowerCase())) {
      const newColumn = newColumnName.trim().toLowerCase();
      const updatedCustomColumns = [...customColumns, newColumn];
      const updatedVisibleColumns = [...visibleColumns, newColumn];
      const updatedColumnColors = { ...columnColors, [newColumn]: newColumnColor };
      
      setCustomColumns(updatedCustomColumns);
      setVisibleColumns(updatedVisibleColumns);
      setColumnColors(updatedColumnColors);
      
      // Guardar en Supabase
      const success = await saveKanbanColumns(updatedCustomColumns, updatedVisibleColumns, updatedColumnColors);
      if (!success) {
        console.error('Error saving columns to Supabase');
        alert('Error al guardar la columna. Por favor intenta nuevamente.');
        // Revertir cambios locales
        setCustomColumns(customColumns);
        setVisibleColumns(visibleColumns);
        setColumnColors(columnColors);
        return;
      }
      
      setNewColumnName('');
      setNewColumnColor('#3b82f6'); // Resetear a color por defecto
      setIsAddColumnModalVisible(false);
    }
  };

  const handleDeleteCustomColumn = async (columnName: string) => {
    const updatedCustomColumns = customColumns.filter(col => col !== columnName);
    const updatedVisibleColumns = visibleColumns.filter(col => col !== columnName);
    const updatedColumnColors = { ...columnColors };
    delete updatedColumnColors[columnName];
    
    setCustomColumns(updatedCustomColumns);
    setVisibleColumns(updatedVisibleColumns);
    setColumnColors(updatedColumnColors);
    
    // Guardar en Supabase
    const success = await saveKanbanColumns(updatedCustomColumns, updatedVisibleColumns, updatedColumnColors);
    if (!success) {
      console.error('Error saving columns to Supabase');
      alert('Error al eliminar la columna. Por favor intenta nuevamente.');
      // Revertir cambios locales
      setCustomColumns(customColumns);
      setVisibleColumns(visibleColumns);
      setColumnColors(columnColors);
    }
  };

  const handleColumnToggle = async (column: string) => {
    const updatedVisibleColumns = visibleColumns.includes(column) 
      ? visibleColumns.filter(col => col !== column)
      : [...visibleColumns, column];
    
    setVisibleColumns(updatedVisibleColumns);
    
    // Guardar en Supabase
    await saveKanbanColumns(customColumns, updatedVisibleColumns, columnColors);
  };

  const toggleColumnSelector = () => {
    setIsColumnSelectorVisible(!isColumnSelectorVisible);
  };

  const allColumns = ['frío', 'tibio', 'caliente', 'llamada', 'visita', ...customColumns];

  const handleSaveLead = async (leadData: Partial<Lead>) => {
    try {
      if (leadToEdit) {
        // Actualizar lead existente
        const updatedLead = await updateLead(leadToEdit.id, leadData);
        if (updatedLead) {
          // Actualizar en el estado local
          setLeads(prevLeads => 
            prevLeads.map(lead => lead.id === updatedLead.id ? updatedLead : lead)
          );
          setFilteredLeads(prevLeads => 
            prevLeads.map(lead => lead.id === updatedLead.id ? updatedLead : lead)
          );
          alert('Lead actualizado exitosamente');
        } else {
          alert('Error al actualizar el lead');
        }
      } else {
        // Crear nuevo lead
        const newLead = await createLead(leadData);
        if (newLead) {
          // Agregar al estado local
          setLeads(prevLeads => [newLead, ...prevLeads]);
          setFilteredLeads(prevLeads => [newLead, ...prevLeads]);
          
          // Actualizar opciones de filtros
          setZonas(getUniqueZones());
          setEstados(getUniqueStatuses());
          setTiposPropiedad(getUniquePropertyTypes());
          setMotivosInteres(getUniqueInterestReasons());
          
          alert('Lead creado exitosamente');
        } else {
          alert('Error al crear el lead');
        }
      }
    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Error al guardar el lead');
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="mb-8">
          {/* Breadcrumbs skeleton */}
          <div className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200 mb-6">
            <div className="px-2 py-2">
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="px-6 py-2 flex justify-between items-center border-t border-gray-200">
              <Skeleton className="h-6 w-40" />
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-8 rounded-xl" />
                <Skeleton className="h-8 w-8 rounded-xl" />
                <Skeleton className="h-8 w-8 rounded-xl" />
                <Skeleton className="h-8 w-8 rounded-xl" />
                <Skeleton className="h-8 w-8 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Kanban board skeleton */}
          <div className="w-full overflow-x-auto pb-1">
            <div className="flex gap-2 min-w-max pr-2">
              {[1, 2, 3, 4, 5].map((col) => (
                <div key={col} className="min-w-[240px] bg-slate-100 border-gray-400 rounded-xl flex flex-col">
                  {/* Column header skeleton */}
                  <div className="m-2 bg-white p-1.5 rounded-xl flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-8 rounded-full" />
                  </div>
                  
                  {/* Cards skeleton */}
                  <div className="flex-1 px-2 pb-2 space-y-2">
                    {[1, 2, 3].map((card) => (
                      <div key={card} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8  ">
        {/* Nueva topbar con breadcrumbs */}
        <div className="sticky top-0 z-10 backdrop-blur bg-white border-b border-slate-200 mb-6">
          {/* Breadcrumbs */}
          <div className="px-2  bg-slate-100 py-3">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                    </svg>
                    Inicio
                  </Link>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                    </svg>
                    <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Leads</span>
                  </div>
                </li>
                <li aria-current="page">
                  <div className="flex items-center">
                    <svg className="w-6 h-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                    </svg>
                    <span className="ml-1 text-sm font-regular text-gray-600 md:ml-2">Tablero Kanban</span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>

          {/* Título y acciones */}
          <div className="px-6 py-2  flex justify-between items-center border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <h1 className="text-md font-semibold text-slate-800 tracking-tight">Tablero de Leads</h1>
                {searchTerm && (
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                    {filteredLeads.length} resultado{filteredLeads.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              {/* Barra de búsqueda */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nombre o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-64 pl-10 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    title="Limpiar búsqueda"
                  >
                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <AgentStatusToggle className="py-1 px-2 text-sm" />
              
              <button
                onClick={() => setIsAddColumnModalVisible(true)}
                className="bg-gray-600 hover:bg-gray-700 px-3 py-0.5 text-white p-2 rounded-xl flex items-center justify-center"
                title="Agregar Columna"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              
              <button
                onClick={handleOpenNewLead}
                className=" hover:bg-gray-800 text-BLACK p-2 rounded-xl text-black border border-gray-200 flex items-center justify-center"
                title="Nuevo Lead"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              
              <button
                onClick={toggleColumnSelector}
                className={`p-2 rounded-xl flex items-center justify-center border ${
                  isColumnSelectorVisible 
                    ? ' border-gray-300 text-gray-700' 
                    : 'bg-white/60 hover:bg-white border-gray-200 text-slate-700'
                }`}
                title={isColumnSelectorVisible ? 'Ocultar columnas' : 'Mostrar columnas'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              
              <button
                onClick={toggleFilterVisibility}
                className={`p-2 rounded-lg flex items-center justify-center border ${
                  isFilterVisible 
                    ? 'bg-gray-100 border-gray-300 text-gray-700' 
                    : 'bg-white/60 hover:bg-white border-gray-200 text-slate-700'
                }`}
                title={isFilterVisible ? 'Ocultar filtros' : 'Mostrar filtros'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              
            </div>
          </div>

          {/* Barra de campañas */}
          {propiedadesInteres.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-200 bg-white/70">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-xs font-medium text-gray-600 mr-1 whitespace-nowrap">Campañas:</span>
                <button
                  onClick={() => handleFilterChange({ ...filterOptions, propiedadInteres: undefined })}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors whitespace-nowrap ${
                    !filterOptions.propiedadInteres
                      ? 'bg-gray-600 text-white border-gray-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Todas
                </button>
                {(showAllCampaigns ? propiedadesInteres : propiedadesInteres.slice(0, 5)).map((propiedad) => (
                  <button
                    key={propiedad}
                    onClick={() => handleFilterChange({ ...filterOptions, propiedadInteres: propiedad })}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors whitespace-nowrap ${
                      filterOptions.propiedadInteres === propiedad
                        ? 'bg-gray-600 text-white border-gray-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {propiedad}
                  </button>
                ))}
                {propiedadesInteres.length > 5 && (
                  <button
                    onClick={() => setShowAllCampaigns(!showAllCampaigns)}
                    className="px-3 py-1 text-xs rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    {showAllCampaigns ? 'Mostrar menos' : `Mostrar todas (${propiedadesInteres.length - 5})`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Barra de filtros plegable */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFilterVisible ? 'max-h-96' : 'max-h-0'}`}>
            <LeadFilter
              filterOptions={filterOptions}
              onFilterChange={handleFilterChange}
              zonas={zonas}
              estados={estados}
              tiposPropiedad={tiposPropiedad}
              motivosInteres={motivosInteres}
              propiedadesInteres={propiedadesInteres}
              onResetFilters={handleResetFilters}
            />
          </div>

          {/* Selector de columnas plegable */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isColumnSelectorVisible ? 'max-h-96' : 'max-h-0'}`}>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Seleccionar columnas visibles</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={async () => {
                      setVisibleColumns(allColumns);
                      await saveKanbanColumns(customColumns, allColumns);
                    }}
                    className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Seleccionar todas
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={async () => {
                      setVisibleColumns([]);
                      await saveKanbanColumns(customColumns, []);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Deseleccionar todas
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {allColumns.map((column) => (
                  <div key={column} className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(column)}
                        onChange={() => handleColumnToggle(column)}
                        className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{column}</span>
                    </label>
                    {customColumns.includes(column) && (
                      <button
                        onClick={() => handleDeleteCustomColumn(column)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Panel principal */}
        <div className="bg-white px-2 mb-8 overflow-hidden ">
          <div className="">
            <LeadCards 
              leads={filteredLeads} 
              onLeadStatusChange={handleLeadStatusChange}
              onEditLead={handleOpenEditLead}
              visibleColumns={visibleColumns}
              columnColors={columnColors}
            />
          </div>
        </div>

        {/* Modal para agregar columnas */}
        {isAddColumnModalVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agregar Nueva Columna</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la columna
                </label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Ej: seguimiento, negociación, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddColumn()}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color de la columna
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newColumnColor}
                    onChange={(e) => setNewColumnColor(e.target.value)}
                    className="h-10 w-20 border border-gray-300 rounded-md cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newColumnColor}
                    onChange={(e) => setNewColumnColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm font-mono"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Selecciona un color para los badges de esta columna</p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsAddColumnModalVisible(false);
                    setNewColumnName('');
                    setNewColumnColor('#3b82f6');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddColumn}
                  disabled={!newColumnName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar de edición/creación */}
      <LeadEditSidebar
        lead={leadToEdit}
        isOpen={isEditSidebarOpen}
        onClose={handleCloseEditSidebar}
        onSave={handleSaveLead}
      />
    </AppLayout>
  );
}
