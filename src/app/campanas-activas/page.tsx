'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
interface Pauta {
  id: number;
  texto: string;
  created_at?: string;
}

export default function CampanasActivasPage() {
  const [pauta, setPauta] = useState('');
  const [pautas, setPautas] = useState<Pauta[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cargar pautas al montar el componente
  useEffect(() => {
    fetchPautas();
  }, []);

  const fetchPautas = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pautas');
      if (response.ok) {
        const data = await response.json();
        setPautas(data);
      } else {
        console.error('Error al cargar pautas');
      }
    } catch (error) {
      console.error('Error al cargar pautas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pauta.trim()) return;

    setSaving(true);
    try {
      const response = await fetch('/api/pautas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ texto: pauta.trim() }),
      });

      if (response.ok) {
        setPauta('');
        fetchPautas(); // Recargar la lista
      } else {
        console.error('Error al guardar pauta');
      }
    } catch (error) {
      console.error('Error al guardar pauta:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta pauta?')) return;

    try {
      const response = await fetch(`/api/pautas?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchPautas(); // Recargar la lista
      } else {
        console.error('Error al eliminar pauta');
      }
    } catch (error) {
      console.error('Error al eliminar pauta:', error);
    }
  };

  return (
    <AppLayout>

       {/* Breadcrumbs */}
       <div className="px-2 py-2 z-10 backdrop-blur bg-white/70 border-b border-slate-200 mb-6">
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
                    <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Campañas Activas</span>
                  </div>
                </li>
               
              </ol>
            </nav>
          </div>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Campañas Activas</h1>
          <p className="text-sm text-gray-600">Gestiona las pautas de tus campañas</p>
        </div>

        <Card className="p-6 mb-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="pauta" className="block text-sm font-medium text-gray-700 mb-2">
                Pauta
              </label>
              <Input
                id="pauta"
                type="text"
                value={pauta}
                onChange={(e) => setPauta(e.target.value)}
                placeholder="Ingresa una nueva pauta..."
                className="w-full"
                disabled={saving}
              />
            </div>
            <Button type="submit" disabled={saving || !pauta.trim()}>
              {saving ? 'Guardando...' : 'Guardar Pauta'}
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pautas Guardadas</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Cargando pautas...</p>
          ) : pautas.length === 0 ? (
            <p className="text-sm text-gray-500">No hay pautas guardadas aún.</p>
          ) : (
            <div className="space-y-3">
              {pautas.map((pauta) => (
                <div
                  key={pauta.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <p className="text-sm text-gray-900 flex-1">{pauta.texto}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(pauta.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

