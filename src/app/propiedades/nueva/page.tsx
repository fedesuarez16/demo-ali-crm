'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../../components/AppLayout';
import { createPropiedad } from '../../services/propiedadesService';
import { SupabasePropiedad } from '../../types';
import Link from 'next/link';

export default function NewPropertyPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  
  const [propiedad, setPropiedad] = useState<Omit<SupabasePropiedad, 'id'>>({
    tipo_de_propiedad: '',
    direccion: '',
    zona: '',
    valor: '',
    dormitorios: '',
    banos: '',
    patio_parque: '',
    garage: '',
    mts_const: '',
    lote: '',
    piso: '',
    link: '',
    columna_1: '',
    apto_banco: '',
    alternativa_menor_1: '',
    alternativa_menor_2: '',
    alternativa_menor_3: '',
    alterniva_menor_4: '',
    alternativa_menor_5: '',
    alternativa_mayor: '',
    alternativa_mayor_2: '',
    alternativa_mayor_3: '',
    alternativa_mayor_4: '',
    alternativa_mayor_5: '',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPropiedad({
      ...propiedad,
      [name]: value
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const newPropiedad = await createPropiedad(propiedad);
      if (newPropiedad) {
        router.push('/propiedades');
      } else {
        alert('Error al guardar la propiedad');
        setIsSaving(false);
      }
    } catch (error) {
      console.error('Error al guardar la propiedad:', error);
      alert('Error al guardar la propiedad');
      setIsSaving(false);
    }
  };
  
  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Nueva Propiedad</h1>
        <Link 
          href="/propiedades" 
          className="text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Volver a propiedades
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <form onSubmit={handleSubmit}>
          {/* Campos principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label htmlFor="tipo_de_propiedad" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Propiedad
              </label>
              <input
                type="text"
                id="tipo_de_propiedad"
                name="tipo_de_propiedad"
                value={propiedad.tipo_de_propiedad}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                type="text"
                id="direccion"
                name="direccion"
                value={propiedad.direccion}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="zona" className="block text-sm font-medium text-gray-700 mb-1">
                Zona
              </label>
              <input
                type="text"
                id="zona"
                name="zona"
                value={propiedad.zona}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-1">
                Valor
              </label>
              <input
                type="text"
                id="valor"
                name="valor"
                value={propiedad.valor}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="dormitorios" className="block text-sm font-medium text-gray-700 mb-1">
                Dormitorios
              </label>
              <input
                type="text"
                id="dormitorios"
                name="dormitorios"
                value={propiedad.dormitorios}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="banos" className="block text-sm font-medium text-gray-700 mb-1">
                Baños
              </label>
              <input
                type="text"
                id="banos"
                name="banos"
                value={propiedad.banos}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="patio_parque" className="block text-sm font-medium text-gray-700 mb-1">
                Patio/Parque
              </label>
              <input
                type="text"
                id="patio_parque"
                name="patio_parque"
                value={propiedad.patio_parque}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="garage" className="block text-sm font-medium text-gray-700 mb-1">
                Garage
              </label>
              <input
                type="text"
                id="garage"
                name="garage"
                value={propiedad.garage}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="mts_const" className="block text-sm font-medium text-gray-700 mb-1">
                Metros Construidos
              </label>
              <input
                type="text"
                id="mts_const"
                name="mts_const"
                value={propiedad.mts_const}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="lote" className="block text-sm font-medium text-gray-700 mb-1">
                Lote
              </label>
              <input
                type="text"
                id="lote"
                name="lote"
                value={propiedad.lote}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="piso" className="block text-sm font-medium text-gray-700 mb-1">
                Piso
              </label>
              <input
                type="text"
                id="piso"
                name="piso"
                value={propiedad.piso}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-1">
                Link
              </label>
              <input
                type="url"
                id="link"
                name="link"
                value={propiedad.link}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="columna_1" className="block text-sm font-medium text-gray-700 mb-1">
                Columna 1
              </label>
              <input
                type="text"
                id="columna_1"
                name="columna_1"
                value={propiedad.columna_1}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="apto_banco" className="block text-sm font-medium text-gray-700 mb-1">
                Apto Banco
              </label>
              <input
                type="text"
                id="apto_banco"
                name="apto_banco"
                value={propiedad.apto_banco}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
          </div>

          {/* Alternativas menores */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Alternativas Menores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="alternativa_menor_1" className="block text-sm font-medium text-gray-700 mb-1">
                  Alternativa Menor 1
                </label>
                <input
                  type="text"
                  id="alternativa_menor_1"
                  name="alternativa_menor_1"
                  value={propiedad.alternativa_menor_1}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
                />
              </div>
              <div>
                <label htmlFor="alternativa_menor_2" className="block text-sm font-medium text-gray-700 mb-1">
                  Alternativa Menor 2
                </label>
                <input
                  type="text"
                  id="alternativa_menor_2"
                  name="alternativa_menor_2"
                  value={propiedad.alternativa_menor_2}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
                />
              </div>
              <div>
                <label htmlFor="alternativa_menor_3" className="block text-sm font-medium text-gray-700 mb-1">
                  Alternativa Menor 3
                </label>
                <input
                  type="text"
                  id="alternativa_menor_3"
                  name="alternativa_menor_3"
                  value={propiedad.alternativa_menor_3}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
                />
              </div>
              <div>
                <label htmlFor="alterniva_menor_4" className="block text-sm font-medium text-gray-700 mb-1">
                  Alternativa Menor 4
                </label>
                <input
                  type="text"
                  id="alterniva_menor_4"
                  name="alterniva_menor_4"
                  value={propiedad.alterniva_menor_4}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
                />
              </div>
              <div>
                <label htmlFor="alternativa_menor_5" className="block text-sm font-medium text-gray-700 mb-1">
                  Alternativa Menor 5
                </label>
                <input
                  type="text"
                  id="alternativa_menor_5"
                  name="alternativa_menor_5"
                  value={propiedad.alternativa_menor_5}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
                />
              </div>
            </div>
          </div>

          {/* Alternativas mayores */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Alternativas Mayores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="alternativa_mayor" className="block text-sm font-medium text-gray-700 mb-1">
                  Alternativa Mayor
                </label>
                <input
                  type="text"
                  id="alternativa_mayor"
                  name="alternativa_mayor"
                  value={propiedad.alternativa_mayor}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
                />
              </div>
              <div>
                <label htmlFor="alternativa_mayor_2" className="block text-sm font-medium text-gray-700 mb-1">
                  Alternativa Mayor 2
                </label>
                <input
                  type="text"
                  id="alternativa_mayor_2"
                  name="alternativa_mayor_2"
                  value={propiedad.alternativa_mayor_2}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
                />
              </div>
              <div>
                <label htmlFor="alternativa_mayor_3" className="block text-sm font-medium text-gray-700 mb-1">
                  Alternativa Mayor 3
                </label>
                <input
                  type="text"
                  id="alternativa_mayor_3"
                  name="alternativa_mayor_3"
                  value={propiedad.alternativa_mayor_3}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
                />
              </div>
              <div>
                <label htmlFor="alternativa_mayor_4" className="block text-sm font-medium text-gray-700 mb-1">
                  Alternativa Mayor 4
                </label>
                <input
                  type="text"
                  id="alternativa_mayor_4"
                  name="alternativa_mayor_4"
                  value={propiedad.alternativa_mayor_4}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
                />
              </div>
              <div>
                <label htmlFor="alternativa_mayor_5" className="block text-sm font-medium text-gray-700 mb-1">
                  Alternativa Mayor 5
                </label>
                <input
                  type="text"
                  id="alternativa_mayor_5"
                  name="alternativa_mayor_5"
                  value={propiedad.alternativa_mayor_5}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
                />
              </div>
            </div>
          </div>
          
          {/* Botones de acción */}
          <div className="flex justify-end space-x-3">
            <Link
              href="/propiedades"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSaving ? 'Guardando...' : 'Guardar Propiedad'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
