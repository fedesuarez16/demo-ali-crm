'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '../components/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

interface Pauta {
  id: number;
  texto: string;
  activo?: boolean;
  created_at?: string;
}

function isPautaActiva(p: Pauta): boolean {
  return p.activo !== false;
}

export default function CampanasActivasPage() {
  const [pauta, setPauta] = useState('');
  const [nuevaComoActiva, setNuevaComoActiva] = useState(true);
  const [pautas, setPautas] = useState<Pauta[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    fetchPautas();
  }, []);

  const { activas, inactivas } = useMemo(() => {
    const a: Pauta[] = [];
    const i: Pauta[] = [];
    for (const p of pautas) {
      if (isPautaActiva(p)) a.push(p);
      else i.push(p);
    }
    return { activas: a, inactivas: i };
  }, [pautas]);

  const fetchPautas = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pautas');
      if (response.ok) {
        const data = await response.json();
        setPautas(Array.isArray(data) ? data : []);
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
        body: JSON.stringify({ texto: pauta.trim(), activo: nuevaComoActiva }),
      });

      if (response.ok) {
        setPauta('');
        fetchPautas();
      } else {
        console.error('Error al guardar pauta');
      }
    } catch (error) {
      console.error('Error al guardar pauta:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (id: number, siguienteActivo: boolean) => {
    setTogglingId(id);
    try {
      const response = await fetch('/api/pautas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, activo: siguienteActivo }),
      });
      if (response.ok) {
        fetchPautas();
      } else {
        console.error('Error al cambiar estado de la pauta');
      }
    } catch (error) {
      console.error('Error al cambiar estado de la pauta:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta pauta?')) return;

    try {
      const response = await fetch(`/api/pautas?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchPautas();
      } else {
        console.error('Error al eliminar pauta');
      }
    } catch (error) {
      console.error('Error al eliminar pauta:', error);
    }
  };

  const renderLista = (items: Pauta[], columnaActiva: boolean) => (
    <div className="space-y-3 min-h-[120px]">
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded-lg">
          {columnaActiva ? 'No hay campañas activas.' : 'No hay campañas inactivas.'}
        </p>
      ) : (
        items.map((p) => (
          <div
            key={p.id}
            className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <p className="text-sm text-gray-900 flex-1 min-w-0 break-words">{p.texto}</p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8"
                disabled={togglingId === p.id}
                onClick={() => handleToggleActivo(p.id, !columnaActiva)}
              >
                {togglingId === p.id
                  ? '...'
                  : columnaActiva
                    ? 'Marcar inactiva'
                    : 'Marcar activa'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(p.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                title="Eliminar"
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
          </div>
        ))
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="pl-16 pr-2 py-2 lg:px-2 z-10 backdrop-blur bg-white/70 border-b border-slate-200 mb-6">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link
                href="/"
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-600"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                </svg>
                Inicio
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Campañas</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      <div className="container mx-auto p-3 sm:p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Campañas</h1>
          <p className="text-sm text-gray-600">
            Pautas agrupadas en activas e inactivas. Las nuevas pueden crearse como activas o no.
          </p>
        </div>

        <Card className="p-3 sm:p-6 mb-8">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="pauta" className="block text-sm font-medium text-gray-700 mb-2">
                Nueva pauta (campaña)
              </label>
              <Input
                id="pauta"
                type="text"
                value={pauta}
                onChange={(e) => setPauta(e.target.value)}
                placeholder="Ingresa el texto de la pauta..."
                className="w-full"
                disabled={saving}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={nuevaComoActiva}
                onChange={(e) => setNuevaComoActiva(e.target.checked)}
                className="rounded border-gray-300"
                disabled={saving}
              />
              Crear como campaña activa
            </label>
            <Button type="submit" disabled={saving || !pauta.trim()}>
              {saving ? 'Guardando...' : 'Guardar pauta'}
            </Button>
          </form>
        </Card>

        {loading ? (
          <p className="text-sm text-gray-500">Cargando pautas...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
                  Campañas activas
                </CardTitle>
                <CardDescription>
                  {activas.length} {activas.length === 1 ? 'pauta' : 'pautas'}
                </CardDescription>
              </CardHeader>
              <CardContent>{renderLista(activas, true)}</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" aria-hidden />
                  Campañas inactivas
                </CardTitle>
                <CardDescription>
                  {inactivas.length} {inactivas.length === 1 ? 'pauta' : 'pautas'}
                </CardDescription>
              </CardHeader>
              <CardContent>{renderLista(inactivas, false)}</CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
