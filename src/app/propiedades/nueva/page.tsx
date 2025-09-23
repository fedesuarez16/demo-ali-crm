'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../../components/AppLayout';
import { saveProperty } from '../../services/propertyService';
import { Property, PropertyType, PropertyOperation, PropertyStatus } from '../../types';
import Link from 'next/link';

export default function NewPropertyPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  
  // Estado para la propiedad nueva
  const [property, setProperty] = useState<Omit<Property, 'id' | 'fechaPublicacion'>>({
    titulo: '',
    descripcion: '',
    tipo: 'departamento',
    operacion: 'venta',
    estado: 'disponible',
    precio: 0,
    moneda: 'USD',
    direccion: '',
    zona: '',
    superficie: 0,
    ambientes: 0,
    dormitorios: 0,
    banos: 0,
    cochera: false,
    cocherasCount: 0,
    antiguedad: 0,
    orientacion: '',
    amenities: [],
    imagenes: [],
    destacada: false
  });
  
  // Estado para manejar amenities temporales
  const [amenity, setAmenity] = useState('');
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      setProperty({
        ...property,
        [name]: (e.target as HTMLInputElement).checked
      });
    } else if (type === 'number') {
      setProperty({
        ...property,
        [name]: value === '' ? 0 : Number(value)
      });
    } else {
      setProperty({
        ...property,
        [name]: value
      });
    }
  };
  
  const handleAddAmenity = () => {
    if (amenity.trim()) {
      setProperty({
        ...property,
        amenities: [...property.amenities, amenity.trim()]
      });
      setAmenity('');
    }
  };
  
  const handleRemoveAmenity = (index: number) => {
    const newAmenities = [...property.amenities];
    newAmenities.splice(index, 1);
    setProperty({
      ...property,
      amenities: newAmenities
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Guardar la propiedad
      await saveProperty(property as Property);
      
      // Redirigir a la página de propiedades
      router.push('/propiedades');
    } catch (error) {
      console.error('Error al guardar la propiedad:', error);
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
          {/* Detalles principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
                Título *
              </label>
              <input
                type="text"
                id="titulo"
                name="titulo"
                value={property.titulo}
                onChange={handleChange}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="zona" className="block text-sm font-medium text-gray-700 mb-1">
                Zona *
              </label>
              <input
                type="text"
                id="zona"
                name="zona"
                value={property.zona}
                onChange={handleChange}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Propiedad *
              </label>
              <select
                id="tipo"
                name="tipo"
                value={property.tipo}
                onChange={handleChange}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              >
                <option value="departamento">Departamento</option>
                <option value="casa">Casa</option>
                <option value="PH">PH</option>
                <option value="terreno">Terreno</option>
                <option value="local">Local</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-1">
                Dirección *
              </label>
              <input
                type="text"
                id="direccion"
                name="direccion"
                value={property.direccion}
                onChange={handleChange}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="operacion" className="block text-sm font-medium text-gray-700 mb-1">
                Operación *
              </label>
              <select
                id="operacion"
                name="operacion"
                value={property.operacion}
                onChange={handleChange}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              >
                <option value="venta">Venta</option>
                <option value="alquiler">Alquiler</option>
                <option value="venta/alquiler">Venta/Alquiler</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">
                Estado *
              </label>
              <select
                id="estado"
                name="estado"
                value={property.estado}
                onChange={handleChange}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              >
                <option value="disponible">Disponible</option>
                <option value="reservada">Reservada</option>
                <option value="vendida">Vendida</option>
                <option value="alquilada">Alquilada</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-1">
                Precio *
              </label>
              <div className="flex">
                <select
                  id="moneda"
                  name="moneda"
                  value={property.moneda}
                  onChange={handleChange}
                  className="w-24 rounded-l-md border-r-0 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
                >
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
                <input
                  type="number"
                  id="precio"
                  name="precio"
                  value={property.precio || ''}
                  onChange={handleChange}
                  min="0"
                  required
                  className="flex-1 rounded-r-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="destacada" className="flex items-center">
                <input
                  type="checkbox"
                  id="destacada"
                  name="destacada"
                  checked={property.destacada}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 h-4 w-4 mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Propiedad destacada</span>
              </label>
            </div>
          </div>
          
          {/* Descripción */}
          <div className="mb-8">
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={property.descripcion}
              onChange={handleChange}
              required
              rows={4}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
            />
          </div>
          
          {/* Información de la propiedad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label htmlFor="superficie" className="block text-sm font-medium text-gray-700 mb-1">
                Superficie (m²) *
              </label>
              <input
                type="number"
                id="superficie"
                name="superficie"
                value={property.superficie || ''}
                onChange={handleChange}
                min="0"
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="ambientes" className="block text-sm font-medium text-gray-700 mb-1">
                Ambientes
              </label>
              <input
                type="number"
                id="ambientes"
                name="ambientes"
                value={property.ambientes || ''}
                onChange={handleChange}
                min="0"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="dormitorios" className="block text-sm font-medium text-gray-700 mb-1">
                Dormitorios
              </label>
              <input
                type="number"
                id="dormitorios"
                name="dormitorios"
                value={property.dormitorios || ''}
                onChange={handleChange}
                min="0"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="banos" className="block text-sm font-medium text-gray-700 mb-1">
                Baños
              </label>
              <input
                type="number"
                id="banos"
                name="banos"
                value={property.banos || ''}
                onChange={handleChange}
                min="0"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="antiguedad" className="block text-sm font-medium text-gray-700 mb-1">
                Antigüedad (años)
              </label>
              <input
                type="number"
                id="antiguedad"
                name="antiguedad"
                value={property.antiguedad || ''}
                onChange={handleChange}
                min="0"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
            
            <div>
              <label htmlFor="orientacion" className="block text-sm font-medium text-gray-700 mb-1">
                Orientación
              </label>
              <input
                type="text"
                id="orientacion"
                name="orientacion"
                value={property.orientacion || ''}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
            </div>
          </div>
          
          {/* Cocheras */}
          <div className="mb-8">
            <div className="flex items-center mb-2">
              <label htmlFor="cochera" className="flex items-center">
                <input
                  type="checkbox"
                  id="cochera"
                  name="cochera"
                  checked={property.cochera}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 h-4 w-4 mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Tiene cochera</span>
              </label>
            </div>
            
            {property.cochera && (
              <div className="mt-2">
                <label htmlFor="cocherasCount" className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad de cocheras
                </label>
                <input
                  type="number"
                  id="cocherasCount"
                  name="cocherasCount"
                  value={property.cocherasCount || ''}
                  onChange={handleChange}
                  min="1"
                  className="block w-full md:w-1/3 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
                />
              </div>
            )}
          </div>
          
          {/* Amenities */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amenities
            </label>
            
            <div className="flex items-center mb-2">
              <input
                type="text"
                value={amenity}
                onChange={(e) => setAmenity(e.target.value)}
                placeholder="Agregar amenity..."
                className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 border"
              />
              <button
                type="button"
                onClick={handleAddAmenity}
                className="rounded-r-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors"
              >
                Agregar
              </button>
            </div>
            
            {property.amenities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {property.amenities.map((item, index) => (
                  <div key={index} className="bg-indigo-50 rounded-full py-1 px-3 flex items-center">
                    <span className="text-indigo-800 text-sm">{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAmenity(index)}
                      className="ml-2 text-indigo-400 hover:text-indigo-600"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Imágenes (en una app real, aquí habría un sistema de carga de imágenes) */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imágenes
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-1 text-sm text-gray-500">
                (Esta funcionalidad estaría disponible en la aplicación completa)
              </p>
              <p className="mt-2 text-xs text-gray-500">
                PNG, JPG, GIF hasta 10MB
              </p>
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