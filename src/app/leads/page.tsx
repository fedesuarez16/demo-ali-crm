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
  updateLeadStatus,
  createLead,
  updateLead
} from '../services/leadService';
import { exportLeadsToCSV } from '../utils/exportUtils';
import Link from 'next/link';

export default function LeadsKanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({});
  const [isFilterVisible, setIsFilterVisible] = useState(false); // Por defecto cerrado
  const [isLoading, setIsLoading] = useState(true);
  
  const [zonas, setZonas] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>([]);
  const [tiposPropiedad, setTiposPropiedad] = useState<string[]>([]);
  const [motivosInteres, setMotivosInteres] = useState<string[]>([]);
  
  // Estados para el sidebar de edición
  const [isEditSidebarOpen, setIsEditSidebarOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  
  // Estados para columnas personalizadas
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [isAddColumnModalVisible, setIsAddColumnModalVisible] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [isColumnSelectorVisible, setIsColumnSelectorVisible] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['frío', 'tibio', 'caliente', 'llamada', 'visita']);

  // Cargar columnas personalizadas desde localStorage al inicializar
  useEffect(() => {
    const savedCustomColumns = localStorage.getItem('customColumns');
    const savedVisibleColumns = localStorage.getItem('visibleColumns');
    
    if (savedCustomColumns) {
      try {
        const parsed = JSON.parse(savedCustomColumns);
        setCustomColumns(parsed);
      } catch (error) {
        console.error('Error parsing saved custom columns:', error);
      }
    }
    
    if (savedVisibleColumns) {
      try {
        const parsed = JSON.parse(savedVisibleColumns);
        setVisibleColumns(parsed);
      } catch (error) {
        console.error('Error parsing saved visible columns:', error);
      }
    }
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
      
      setIsLoading(false);
    };
    
    loadData();
  }, []);
  
  // Aplicar filtros cuando cambien las opciones
  useEffect(() => {
    const filtered = filterLeads(filterOptions);
    setFilteredLeads(filtered);
  }, [filterOptions]);
  
  const handleFilterChange = (newFilterOptions: FilterOptions) => {
    setFilterOptions(newFilterOptions);
  };
  
  const handleResetFilters = () => {
    setFilterOptions({});
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
            lead.id === leadId ? { ...lead, estado: newStatus } : lead
          )
        );
        
        // Actualizar los leads filtrados
        setFilteredLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId ? { ...lead, estado: newStatus } : lead
          )
        );
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
  const handleAddColumn = () => {
    if (newColumnName.trim() && !visibleColumns.includes(newColumnName.trim().toLowerCase())) {
      const newColumn = newColumnName.trim().toLowerCase();
      const updatedCustomColumns = [...customColumns, newColumn];
      const updatedVisibleColumns = [...visibleColumns, newColumn];
      
      setCustomColumns(updatedCustomColumns);
      setVisibleColumns(updatedVisibleColumns);
      
      // Guardar en localStorage
      localStorage.setItem('customColumns', JSON.stringify(updatedCustomColumns));
      localStorage.setItem('visibleColumns', JSON.stringify(updatedVisibleColumns));
      
      setNewColumnName('');
      setIsAddColumnModalVisible(false);
    }
  };

  const handleDeleteCustomColumn = (columnName: string) => {
    const updatedCustomColumns = customColumns.filter(col => col !== columnName);
    const updatedVisibleColumns = visibleColumns.filter(col => col !== columnName);
    
    setCustomColumns(updatedCustomColumns);
    setVisibleColumns(updatedVisibleColumns);
    
    // Guardar en localStorage
    localStorage.setItem('customColumns', JSON.stringify(updatedCustomColumns));
    localStorage.setItem('visibleColumns', JSON.stringify(updatedVisibleColumns));
  };

  const handleColumnToggle = (column: string) => {
    const updatedVisibleColumns = visibleColumns.includes(column) 
      ? visibleColumns.filter(col => col !== column)
      : [...visibleColumns, column];
    
    setVisibleColumns(updatedVisibleColumns);
    
    // Guardar en localStorage
    localStorage.setItem('visibleColumns', JSON.stringify(updatedVisibleColumns));
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
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-slate-800">Cargando datos...</h2>
            <p className="text-slate-500 mt-2">Preparando el tablero Kanban</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8 ">
        {/* Nueva topbar con breadcrumbs */}
        <div className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200 mb-6">
          {/* Breadcrumbs */}
          <div className="px-2 py-2">
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
            <h1 className="text-md font-semibold text-slate-800 tracking-tight">Tablero de Leads</h1>
            <div className="flex space-x-2">
              <AgentStatusToggle className="py-1 px-2 text-sm" />
              
              <button
                onClick={() => setIsAddColumnModalVisible(true)}
                className="bg-indigo-600 hover:bg-indigo-700 px-3 py-0.5 text-white p-2 rounded-xl flex items-center justify-center"
                title="Agregar Columna"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              
              <button
                onClick={handleOpenNewLead}
                className=" hover:bg-gray-800 text-white p-2 rounded-xl text-black border border-gray-200 flex items-center justify-center"
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
                    ? ' border-indigo-300 text-indigo-700' 
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
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700' 
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

          {/* Barra de filtros plegable */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFilterVisible ? 'max-h-96' : 'max-h-0'}`}>
            <LeadFilter
              filterOptions={filterOptions}
              onFilterChange={handleFilterChange}
              zonas={zonas}
              estados={estados}
              tiposPropiedad={tiposPropiedad}
              motivosInteres={motivosInteres}
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
                    onClick={() => {
                      setVisibleColumns(allColumns);
                      localStorage.setItem('visibleColumns', JSON.stringify(allColumns));
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Seleccionar todas
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => {
                      setVisibleColumns([]);
                      localStorage.setItem('visibleColumns', JSON.stringify([]));
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
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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
        <div className="bg-white mb-8 overflow-hidden ">
          <div className="">
            <LeadCards 
              leads={filteredLeads} 
              onLeadStatusChange={handleLeadStatusChange}
              onEditLead={handleOpenEditLead}
              visibleColumns={visibleColumns}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddColumn()}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsAddColumnModalVisible(false);
                    setNewColumnName('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddColumn}
                  disabled={!newColumnName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
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