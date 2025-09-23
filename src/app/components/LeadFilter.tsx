import React from 'react';
import { FilterOptions, LeadStatus, PropertyType, InterestReason } from '../types';

interface LeadFilterProps {
  filterOptions: FilterOptions;
  onFilterChange: (filterOptions: FilterOptions) => void;
  zonas: string[];
  estados: string[];
  tiposPropiedad: string[];
  motivosInteres: string[];
  onResetFilters: () => void;
}

const LeadFilter: React.FC<LeadFilterProps> = ({
  filterOptions,
  onFilterChange,
  zonas,
  estados,
  tiposPropiedad,
  motivosInteres,
  onResetFilters
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let updatedValue: string | number | undefined = value;
    
    // Convertir valores numéricos
    if (name === 'presupuestoMaximo' || name === 'cantidadAmbientesMinima') {
      updatedValue = value === '' ? undefined : Number(value);
    }
    
    // Manejar valores vacíos en selects
    if (value === '' && name !== 'presupuestoMaximo' && name !== 'cantidadAmbientesMinima') {
      updatedValue = undefined;
    }
    
    onFilterChange({
      ...filterOptions,
      [name]: updatedValue
    });
  };
  
  // Renderiza un estado como badge
  const renderStatusBadge = (status: string, isSelected: boolean) => {
    const baseClasses = "px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer border";
    let colorClasses = "";
    
    switch (status) {
      case 'nuevo':
        colorClasses = isSelected 
          ? "bg-purple-100 border-purple-500 text-black-800" 
          : "border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700";
        break;
      case 'contactado':
        colorClasses = isSelected 
          ? "bg-indigo-100 border-indigo-500 text-black-800" 
          : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700";
        break;
      case 'frío':
        colorClasses = isSelected 
          ? "bg-blue-100 border-blue-500 text-black-800" 
          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700";
        break;
      case 'tibio':
        colorClasses = isSelected 
          ? "bg-yellow-100 border-yellow-500 text-black-800" 
          : "border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 text-gray-700";
        break;
      case 'caliente':
        colorClasses = isSelected 
          ? "bg-red-100 border-red-500 text-black-800" 
          : "border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-700";
        break;
      case 'cerrado':
        colorClasses = isSelected 
          ? "bg-green-100 border-green-500 text-black-800" 
          : "border-gray-200 hover:border-green-300 hover:bg-green-50 text-gray-700";
        break;
      case 'descartado':
        colorClasses = isSelected 
          ? "bg-gray-100 border-gray-500 text-black-800" 
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700";
        break;
      default:
        colorClasses = isSelected 
          ? "bg-indigo-100 border-indigo-500 text-indigo-800" 
          : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700";
    }
    
    return `${baseClasses} ${colorClasses}`;
  };
  
  // Manejador para los filtros de estado que se pueden seleccionar con badges
  const handleStatusClick = (status: LeadStatus) => {
    onFilterChange({
      ...filterOptions,
      estado: filterOptions.estado === status ? undefined : status
    });
  };

  // Contar filtros activos
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filterOptions.zona) count++;
    if (filterOptions.presupuestoMaximo) count++;
    if (filterOptions.tipoPropiedad) count++;
    if (filterOptions.estado) count++;
    if (filterOptions.cantidadAmbientesMinima) count++;
    if (filterOptions.motivoInteres) count++;
    return count;
  };

  const activeFilters = getActiveFiltersCount();

  return (
    <div className="px-6 py-4 bg-white/70 backdrop-blur border-t border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h3 className="text-sm font-medium text-gray-800">Filtros</h3>
          {activeFilters > 0 && (
            <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {activeFilters}
            </span>
          )}
        </div>
        <button
          onClick={onResetFilters}
          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center"
          disabled={activeFilters === 0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Limpiar filtros
        </button>
      </div>
      
      <div className="flex flex-col space-y-4">
        {/* Estado del lead como badges */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Estado del lead</p>
          <div className="flex flex-wrap gap-1.5">
            {estados.map((estado) => (
              <button
                key={estado}
                className={renderStatusBadge(estado, filterOptions.estado === estado)}
                onClick={() => handleStatusClick(estado as LeadStatus)}
              >
                {estado}
              </button>
            ))}
          </div>
        </div>
        
        {/* Resto de filtros en grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Zona */}
          <div>
            <label htmlFor="zona" className="block text-xs font-medium text-gray-500 mb-1">
              Zona
            </label>
            <select
              id="zona"
              name="zona"
              value={filterOptions.zona || ''}
              onChange={handleInputChange}
              className="block w-full rounded-lg border-slate-200 bg-white/70 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-2 text-sm text-gray-700"
            >
              <option value="">Todas las zonas</option>
              {zonas.map((zona) => (
                <option key={zona} value={zona}>
                  {zona}
                </option>
              ))}
            </select>
          </div>
          
          {/* Presupuesto Máximo */}
          <div>
            <label htmlFor="presupuestoMaximo" className="block text-xs font-medium text-gray-500 mb-1">
              Presupuesto Máximo (USD)
            </label>
            <input
              type="number"
              id="presupuestoMaximo"
              name="presupuestoMaximo"
              value={filterOptions.presupuestoMaximo || ''}
              onChange={handleInputChange}
              className="block w-full rounded-lg border-slate-200 bg-white/70 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-2 text-sm text-gray-700"
              placeholder="Sin límite"
            />
          </div>
          
          {/* Tipo de Propiedad */}
          <div>
            <label htmlFor="tipoPropiedad" className="block text-xs font-medium text-gray-500 mb-1">
              Tipo de Propiedad
            </label>
            <select
              id="tipoPropiedad"
              name="tipoPropiedad"
              value={filterOptions.tipoPropiedad || ''}
              onChange={handleInputChange}
              className="block w-full rounded-lg border-slate-200 bg-white/70 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-2 text-sm text-gray-700"
            >
              <option value="">Todos los tipos</option>
              {tiposPropiedad.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
          
          {/* Cantidad de Ambientes Mínima */}
          <div>
            <label htmlFor="cantidadAmbientesMinima" className="block text-xs font-medium text-gray-500 mb-1">
              Ambientes Mínimos
            </label>
            <input
              type="number"
              id="cantidadAmbientesMinima"
              name="cantidadAmbientesMinima"
              value={filterOptions.cantidadAmbientesMinima || ''}
              onChange={handleInputChange}
              min="1"
              className="block w-full rounded-lg border-slate-200 bg-white/70 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-2 text-sm text-gray-700"
              placeholder="Mínimo"
            />
          </div>
          
          {/* Motivo de Interés */}
          <div>
            <label htmlFor="motivoInteres" className="block text-xs font-medium text-gray-500 mb-1">
              Motivo de Interés
            </label>
            <select
              id="motivoInteres"
              name="motivoInteres"
              value={filterOptions.motivoInteres || ''}
              onChange={handleInputChange}
              className="block w-full rounded-lg border-slate-200 bg-white/70 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-2 text-sm text-gray-700"
            >
              <option value="">Todos los motivos</option>
              {motivosInteres.map((motivo) => (
                <option key={motivo} value={motivo as InterestReason}>
                  {motivo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadFilter; 