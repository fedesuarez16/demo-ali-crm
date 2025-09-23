import React from 'react';
import { DocumentFilterOptions } from '../types';

interface PropertyDocFilterProps {
  filterOptions: DocumentFilterOptions;
  onFilterChange: (opts: DocumentFilterOptions) => void;
  zonas: string[];
  tipos: string[];
  onResetFilters: () => void;
}

const PropertyDocFilter: React.FC<PropertyDocFilterProps> = ({
  filterOptions,
  onFilterChange,
  zonas,
  tipos,
  onResetFilters
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let updatedValue: string | number | undefined = value;
    if (name === 'valorMaximo' || name === 'dormitoriosMin' || name === 'banosMin') {
      updatedValue = value === '' ? undefined : Number(value);
    }
    if (value === '' && name !== 'valorMaximo' && name !== 'dormitoriosMin' && name !== 'banosMin') {
      updatedValue = undefined;
    }
    onFilterChange({
      ...filterOptions,
      [name]: updatedValue
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filterOptions.zona) count++;
    if (filterOptions.tipoDePropiedad) count++;
    if (filterOptions.valorMaximo) count++;
    if (filterOptions.dormitoriosMin) count++;
    if (filterOptions.banosMin) count++;
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label htmlFor="zona" className="block text-xs font-medium text-gray-500 mb-1">Zona</label>
          <select
            id="zona"
            name="zona"
            value={filterOptions.zona || ''}
            onChange={handleInputChange}
            className="block w-full rounded-lg border-slate-200 bg-white/70 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-2 text-sm text-gray-700"
          >
            <option value="">Todas las zonas</option>
            {zonas.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tipoDePropiedad" className="block text-xs font-medium text-gray-500 mb-1">Tipo de Propiedad</label>
          <select
            id="tipoDePropiedad"
            name="tipoDePropiedad"
            value={filterOptions.tipoDePropiedad || ''}
            onChange={handleInputChange}
            className="block w-full rounded-lg border-slate-200 bg-white/70 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-2 text-sm text-gray-700"
          >
            <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="valorMaximo" className="block text-xs font-medium text-gray-500 mb-1">Valor Máximo (numérico)</label>
          <input
            type="number"
            id="valorMaximo"
            name="valorMaximo"
            value={filterOptions.valorMaximo || ''}
            onChange={handleInputChange}
            className="block w-full rounded-lg border-slate-200 bg-white/70 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-2 text-sm text-gray-700"
            placeholder="Sin límite"
          />
        </div>

        <div>
          <label htmlFor="dormitoriosMin" className="block text-xs font-medium text-gray-500 mb-1">Dormitorios mínimos</label>
          <input
            type="number"
            id="dormitoriosMin"
            name="dormitoriosMin"
            value={filterOptions.dormitoriosMin || ''}
            onChange={handleInputChange}
            min="0"
            className="block w-full rounded-lg border-slate-200 bg-white/70 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-2 text-sm text-gray-700"
            placeholder="Mínimo"
          />
        </div>

        <div>
          <label htmlFor="banosMin" className="block text-xs font-medium text-gray-500 mb-1">Baños mínimos</label>
          <input
            type="number"
            id="banosMin"
            name="banosMin"
            value={filterOptions.banosMin || ''}
            onChange={handleInputChange}
            min="0"
            className="block w-full rounded-lg border-slate-200 bg-white/70 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-2 text-sm text-gray-700"
            placeholder="Mínimo"
          />
        </div>
      </div>
    </div>
  );
};

export default PropertyDocFilter;


