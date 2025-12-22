'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout';
import PropiedadCards from '../components/PropiedadCards';
import PropertyDocFilter from '../components/PropertyDocFilter';
import PropiedadEditSidebar from '../components/PropiedadEditSidebar';
import { SupabasePropiedad } from '../types';
import { DocumentFilterOptions } from '../types';
import { getAllPropiedades, deletePropiedad, updatePropiedad, createPropiedad } from '../services/propiedadesService';

export default function PropertiesKanbanPage() {
  const [propiedades, setPropiedades] = useState<SupabasePropiedad[]>([]);
  const [filteredPropiedades, setFilteredPropiedades] = useState<SupabasePropiedad[]>([]);
  const [filterOptions, setFilterOptions] = useState<DocumentFilterOptions>({});
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [propiedadToEdit, setPropiedadToEdit] = useState<SupabasePropiedad | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    loadPropiedades();
  }, []);

  const loadPropiedades = async () => {
    setIsLoading(true);
    try {
      const data = await getAllPropiedades();
      setPropiedades(data);
      setFilteredPropiedades(data);
    } catch (error) {
      console.error('Error loading propiedades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...propiedades];

    if (filterOptions.zona) {
      filtered = filtered.filter(p => p.zona?.toLowerCase().includes(filterOptions.zona!.toLowerCase()));
    }

    if (filterOptions.tipoDePropiedad) {
      filtered = filtered.filter(p => p.tipo_de_propiedad?.toLowerCase().includes(filterOptions.tipoDePropiedad!.toLowerCase()));
    }

    if (filterOptions.valorMaximo) {
      // Intentar extraer números del string de valor
      filtered = filtered.filter(p => {
        const valorStr = p.valor?.replace(/[^0-9]/g, '');
        if (!valorStr) return false;
        const valor = parseInt(valorStr);
        return !isNaN(valor) && valor <= filterOptions.valorMaximo!;
      });
    }

    if (filterOptions.dormitoriosMin) {
      filtered = filtered.filter(p => {
        const dorm = parseInt(p.dormitorios || '0');
        return !isNaN(dorm) && dorm >= filterOptions.dormitoriosMin!;
      });
    }

    if (filterOptions.banosMin) {
      filtered = filtered.filter(p => {
        const banos = parseInt(p.banos || '0');
        return !isNaN(banos) && banos >= filterOptions.banosMin!;
      });
    }

    setFilteredPropiedades(filtered);
  }, [filterOptions, propiedades]);

  const handleFilterChange = (newFilterOptions: DocumentFilterOptions) => {
    setFilterOptions(newFilterOptions);
  };

  const handleResetFilters = () => {
    setFilterOptions({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta propiedad?')) {
      return;
    }

    setIsDeleting(id);
    try {
      const success = await deletePropiedad(id);
      if (success) {
        setPropiedades(propiedades.filter(p => p.id !== id));
        setFilteredPropiedades(filteredPropiedades.filter(p => p.id !== id));
      } else {
        alert('Error al eliminar la propiedad');
      }
    } catch (error) {
      console.error('Error deleting propiedad:', error);
      alert('Error al eliminar la propiedad');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditPropiedad = (propiedad: SupabasePropiedad) => {
    setPropiedadToEdit(propiedad);
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    setPropiedadToEdit(null);
  };

  const handleSavePropiedad = async (propiedadData: Partial<SupabasePropiedad>) => {
    try {
      if (propiedadToEdit) {
        // Actualizar propiedad existente
        const updatedPropiedad = await updatePropiedad(propiedadToEdit.id, propiedadData);
        if (updatedPropiedad) {
          setPropiedades(prev => 
            prev.map(p => p.id === updatedPropiedad.id ? updatedPropiedad : p)
          );
          setFilteredPropiedades(prev => 
            prev.map(p => p.id === updatedPropiedad.id ? updatedPropiedad : p)
          );
        } else {
          alert('Error al actualizar la propiedad');
          throw new Error('Error al actualizar la propiedad');
        }
      } else {
        // Crear nueva propiedad
        const newPropiedad = await createPropiedad(propiedadData as Omit<SupabasePropiedad, 'id'>);
        if (newPropiedad) {
          setPropiedades(prev => [newPropiedad, ...prev]);
          setFilteredPropiedades(prev => [newPropiedad, ...prev]);
        } else {
          alert('Error al crear la propiedad');
          throw new Error('Error al crear la propiedad');
        }
      }
    } catch (error) {
      console.error('Error saving propiedad:', error);
      throw error;
    }
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
                onClick={() => {
                  setPropiedadToEdit(null);
                  setIsSidebarOpen(true);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Propiedad
              </button>
            </div>
          </div>

          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFilterVisible ? 'max-h-96' : 'max-h-0'}`}>
            <PropertyDocFilter
              filterOptions={filterOptions}
              onFilterChange={handleFilterChange}
              zonas={Array.from(new Set(propiedades.map(p => p.zona).filter(Boolean)))}
              tipos={Array.from(new Set(propiedades.map(p => p.tipo_de_propiedad).filter(Boolean)))}
              onResetFilters={handleResetFilters}
            />
          </div>
        </div>

        <div className="bg-transparent m-2 overflow-hidden ">
          <div className="">
            <PropiedadCards 
              propiedades={filteredPropiedades} 
              onDelete={handleDelete}
              isDeleting={isDeleting}
              onEdit={handleEditPropiedad}
            />
          </div>
        </div>
      </div>

      {/* Sidebar de edición */}
      <PropiedadEditSidebar
        propiedad={propiedadToEdit}
        onClose={handleCloseSidebar}
        onSave={handleSavePropiedad}
        isOpen={isSidebarOpen}
      />
    </AppLayout>
  );
}
