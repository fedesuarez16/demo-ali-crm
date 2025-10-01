'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import LeadCards from '../components/LeadCards';
import LeadFilter from '../components/LeadFilter';
import { Lead, FilterOptions, LeadStatus } from '../types';
import { 
  getAllLeads, 
  filterLeads, 
  getUniqueZones,
  getUniqueStatuses,
  getUniquePropertyTypes,
  getUniqueInterestReasons,
  updateLeadStatus
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
            <div className="flex space-x-3">
              <button
                onClick={toggleFilterVisibility}
                className="bg-white/60 hover:bg-white border border-gray-200 text-slate-700 py-1 px-2 rounded-lg text-sm font-medium flex items-center justify-center shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {isFilterVisible ? 'Ocultar filtros' : 'Mostrar filtros'}
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
        </div>
        
        {/* Panel principal */}
        <div className="bg-white mb-8 overflow-hidden ">
          <div className="">
            <LeadCards 
              leads={filteredLeads} 
              onLeadStatusChange={handleLeadStatusChange}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
} 