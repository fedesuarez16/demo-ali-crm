'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from './components/AppLayout';
import { Lead, FilterOptions } from './types';
import { 
  getAllLeads, 
  filterLeads, 
  getUniqueZones,
  getUniqueStatuses,
  getUniquePropertyTypes,
  getUniqueInterestReasons
} from './services/leadService';

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Simulamos una carga asíncrona para mostrar el efecto de carga
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const allLeads = await getAllLeads();
      setLeads(allLeads);
      setFilteredLeads(allLeads);
      
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  // Calcular estadísticas
  const getStatusCount = (status: string) => {
    return filteredLeads.filter(lead => lead.estado === status).length;
  };

  const newLeadsCount = getStatusCount('nuevo');
  const contactedLeadsCount = getStatusCount('contactado');
  const coldLeadsCount = getStatusCount('frío');
  const warmLeadsCount = getStatusCount('tibio');
  const hotLeadsCount = getStatusCount('caliente');
  const closedLeadsCount = getStatusCount('cerrado');
  const discardedLeadsCount = getStatusCount('descartado');

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-slate-800">Cargando datos...</h2>
            <p className="text-slate-500 mt-2">Preparando tu CRM Inmobiliario</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
        
        {/* Dashboard cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">Total Leads</span>
                <span className="text-3xl text-slate-800 font-bold mt-2 block">{filteredLeads.length}</span>
              </div>
              <div className="p-2 bg-indigo-50 rounded-lg">
                <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${leads.length > 0 ? Math.round((filteredLeads.length / leads.length) * 100) : 0}%` }}></div>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex justify-between">
                <span>{leads.length > 0 ? `${Math.round((filteredLeads.length / leads.length) * 100)}% del total` : '0%'}</span>
                <span>{leads.length} total</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p- rounded-lg shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">Leads Nuevos</span>
                <span className="text-3xl font-bold mt-2 text-purple-600 block">{newLeadsCount}</span>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${filteredLeads.length > 0 ? Math.round((newLeadsCount / filteredLeads.length) * 100) : 0}%` }}></div>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex justify-between">
                <span>{filteredLeads.length > 0 ? `${Math.round((newLeadsCount / filteredLeads.length) * 100)}% del filtrado` : '0%'}</span>
                <span className="text-purple-600 font-medium">{newLeadsCount} leads</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">Contactados</span>
                <span className="text-3xl font-bold mt-2 text-indigo-600 block">{contactedLeadsCount}</span>
              </div>
              <div className="p-2 bg-indigo-50 rounded-lg">
                <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${filteredLeads.length > 0 ? Math.round((contactedLeadsCount / filteredLeads.length) * 100) : 0}%` }}></div>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex justify-between">
                <span>{filteredLeads.length > 0 ? `${Math.round((contactedLeadsCount / filteredLeads.length) * 100)}% del filtrado` : '0%'}</span>
                <span className="text-indigo-600 font-medium">{contactedLeadsCount} leads</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">Cerrados</span>
                <span className="text-3xl font-bold mt-2 text-green-600 block">{closedLeadsCount}</span>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${filteredLeads.length > 0 ? Math.round((closedLeadsCount / filteredLeads.length) * 100) : 0}%` }}></div>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex justify-between">
                <span>{filteredLeads.length > 0 ? `${Math.round((closedLeadsCount / filteredLeads.length) * 100)}% del filtrado` : '0%'}</span>
                <span className="text-green-600 font-medium">{closedLeadsCount} leads</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">Leads Fríos</span>
                <span className="text-3xl font-bold mt-2 text-blue-600 block">{coldLeadsCount}</span>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${filteredLeads.length > 0 ? Math.round((coldLeadsCount / filteredLeads.length) * 100) : 0}%` }}></div>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex justify-between">
                <span>{filteredLeads.length > 0 ? `${Math.round((coldLeadsCount / filteredLeads.length) * 100)}% del filtrado` : '0%'}</span>
                <span className="text-blue-600 font-medium">{coldLeadsCount} leads</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">Leads Tibios</span>
                <span className="text-3xl font-bold mt-2 text-yellow-600 block">{warmLeadsCount}</span>
              </div>
              <div className="p-2 bg-yellow-50 rounded-lg">
                <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${filteredLeads.length > 0 ? Math.round((warmLeadsCount / filteredLeads.length) * 100) : 0}%` }}></div>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex justify-between">
                <span>{filteredLeads.length > 0 ? `${Math.round((warmLeadsCount / filteredLeads.length) * 100)}% del filtrado` : '0%'}</span>
                <span className="text-yellow-600 font-medium">{warmLeadsCount} leads</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">Leads Calientes</span>
                <span className="text-3xl font-bold mt-2 text-red-600 block">{hotLeadsCount}</span>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${filteredLeads.length > 0 ? Math.round((hotLeadsCount / filteredLeads.length) * 100) : 0}%` }}></div>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex justify-between">
                <span>{filteredLeads.length > 0 ? `${Math.round((hotLeadsCount / filteredLeads.length) * 100)}% del filtrado` : '0%'}</span>
                <span className="text-red-600 font-medium">{hotLeadsCount} leads</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-1 gap-5 mb-8">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">Leads Descartados</span>
                <span className="text-3xl font-bold mt-2 text-gray-600 block">{discardedLeadsCount}</span>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-gray-500 h-1.5 rounded-full" style={{ width: `${filteredLeads.length > 0 ? Math.round((discardedLeadsCount / filteredLeads.length) * 100) : 0}%` }}></div>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex justify-between">
                <span>{filteredLeads.length > 0 ? `${Math.round((discardedLeadsCount / filteredLeads.length) * 100)}% del filtrado` : '0%'}</span>
                <span className="text-gray-600 font-medium">{discardedLeadsCount} leads</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Panel principal con enlaces a vistas */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <h2 className="text-xl font-semibold text-slate-800 mb-4 md:mb-0">
                Gestión de Leads
              </h2>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/leads" className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-indigo-50 rounded-lg mr-4">
                    <svg className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Vista Kanban</h3>
                </div>
                <p className="text-gray-600">Gestiona tus leads con un tablero Kanban para visualizar y mover leads entre diferentes estados.</p>
                <div className="mt-4 flex justify-end">
                  <span className="text-indigo-600 font-medium flex items-center">
                    Ver tablero
                    <svg className="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </div>
              </Link>
              
              <Link href="/leads/tabla" className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-green-50 rounded-lg mr-4">
                    <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Vista de Tabla</h3>
                </div>
                <p className="text-gray-600">Visualiza todos tus leads en formato de tabla con información detallada y opciones de filtrado.</p>
                <div className="mt-4 flex justify-end">
                  <span className="text-green-600 font-medium flex items-center">
                    Ver tabla
                    <svg className="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
