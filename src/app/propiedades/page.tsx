'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout';
import DocumentCards from '../components/DocumentCards';
import PropertyDocFilter from '../components/PropertyDocFilter';
import { PropertyDocument, DocumentFilterOptions } from '../types';
import { 
  getAllDocuments, 
  filterDocuments, 
  getUniqueDocumentZones,
  getUniqueDocumentTypes
} from '../services/documentService';
import { exportDocumentsToCSV } from '../utils/exportUtils';

export default function PropertiesKanbanPage() {
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<PropertyDocument[]>([]);
  const [filterOptions, setFilterOptions] = useState<DocumentFilterOptions>({});
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zonas, setZonas] = useState<string[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      const allDocs = await getAllDocuments();
      setDocuments(allDocs);
      setFilteredDocuments(allDocs);
      setZonas(getUniqueDocumentZones());
      setTipos(getUniqueDocumentTypes());
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const filtered = filterDocuments(filterOptions);
    setFilteredDocuments(filtered);
  }, [filterOptions]);

  const handleFilterChange = (newFilterOptions: DocumentFilterOptions) => {
    setFilterOptions(newFilterOptions);
  };

  const handleResetFilters = () => {
    setFilterOptions({});
  };

  const handleExportCSV = () => {
    exportDocumentsToCSV(filteredDocuments, 'propiedades_documents');
  };

  const toggleFilterVisibility = () => {
    setIsFilterVisible(!isFilterVisible);
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
      <div className="mb-8">
        <div className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200 mb-6">
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
                    <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Propiedades</span>
                  </div>
                </li>
                <li aria-current="page">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                    </svg>
                    <span className="ml-1 text-sm font-regular text-gray-600 md:ml-2">Tablero Kanban</span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>

          <div className="px-6 py-4 flex justify-between items-center border-t border-slate-100">
            <h1 className="text-lg font-semibold text-slate-800 tracking-tight">Tablero Kanban de Propiedades</h1>
            <div className="flex space-x-3">
              <button
                onClick={toggleFilterVisibility}
                className="bg-white/60 hover:bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {isFilterVisible ? 'Ocultar filtros' : 'Mostrar filtros'}
              </button>
              <button
                onClick={handleExportCSV}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center"
                disabled={filteredDocuments.length === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar a CSV
              </button>
            </div>
          </div>

          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFilterVisible ? 'max-h-96' : 'max-h-0'}`}>
            <PropertyDocFilter
              filterOptions={filterOptions}
              onFilterChange={handleFilterChange}
              zonas={zonas}
              tipos={tipos}
              onResetFilters={handleResetFilters}
            />
          </div>
        </div>

        <div className="bg-transparent mb-8 overflow-hidden ">
          <div className="">
            <DocumentCards documents={filteredDocuments} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}