'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EventoVista, PersonaPublica, TipoEvento } from '@/lib/calendario/servicio';

export type { EventoVista, PersonaPublica, TipoEvento };

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `Error ${res.status}`) as Error & { codigo?: string; status?: number };
    err.codigo = data?.codigo;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  personas: () => pedir<{ personas: PersonaPublica[] }>('/api/calendario/personas'),
  actualizarPersona: (id: number, cambios: Partial<PersonaPublica>) =>
    pedir(`/api/calendario/personas/${id}`, { method: 'PATCH', body: JSON.stringify(cambios) }),
  desconectarPersona: (id: number) => pedir(`/api/calendario/personas/${id}`, { method: 'DELETE' }),
  tipos: () => pedir<{ tipos: TipoEvento[] }>('/api/calendario/tipos'),
  crearTipo: (tipo: Partial<TipoEvento>) => pedir<{ tipo: TipoEvento }>('/api/calendario/tipos', { method: 'POST', body: JSON.stringify(tipo) }),
  actualizarTipo: (id: number, cambios: Partial<TipoEvento>) =>
    pedir<{ tipo: TipoEvento }>(`/api/calendario/tipos/${id}`, { method: 'PATCH', body: JSON.stringify(cambios) }),
  borrarTipo: (id: number) => pedir(`/api/calendario/tipos/${id}`, { method: 'DELETE' }),
  eventos: (desde: Date, hasta: Date, personaId?: number | null) => {
    const q = new URLSearchParams({ desde: desde.toISOString(), hasta: hasta.toISOString() });
    if (personaId) q.set('persona_id', String(personaId));
    return pedir<{ eventos: EventoVista[]; errores: { persona_nombre: string; error: string; codigo?: string }[] }>(`/api/calendario/eventos?${q}`);
  },
  disponibilidad: (tipo: string, desde?: string, dias?: number) => {
    const q = new URLSearchParams({ tipo, max: '80' });
    if (desde) q.set('desde', desde);
    if (dias) q.set('dias', String(dias));
    return pedir<{ slots: { inicio: string; fin: string; texto: string }[]; persona: { nombre: string }; resumen: string }>(
      `/api/calendario/disponibilidad?${q}`,
    );
  },
  crearEvento: (body: Record<string, unknown>) =>
    pedir<{ confirmacion: string }>('/api/calendario/eventos', { method: 'POST', body: JSON.stringify(body) }),
  cancelarEvento: (id: number) => pedir(`/api/calendario/eventos/${id}`, { method: 'DELETE' }),
};

/** Datos de configuración: personas vinculadas y tipos de evento */
export function useConfigCalendario() {
  const [personas, setPersonas] = useState<PersonaPublica[]>([]);
  const [tipos, setTipos] = useState<TipoEvento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setError(null);
    try {
      const [p, t] = await Promise.all([api.personas(), api.tipos()]);
      setPersonas(p.personas);
      setTipos(t.tipos);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { personas, tipos, cargando, error, recargar };
}

/** Eventos de Google de la semana que arranca en `lunes` (YYYY-MM-DD, hora local del navegador) */
export function useEventosSemana(lunes: string, personaId: number | null, habilitado: boolean) {
  const [eventos, setEventos] = useState<EventoVista[]>([]);
  const [errores, setErrores] = useState<{ persona_nombre: string; error: string; codigo?: string }[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!habilitado) return;
    setCargando(true);
    setError(null);
    try {
      const desde = new Date(`${lunes}T00:00:00`);
      const hasta = new Date(desde.getTime() + 7 * 86_400_000);
      const r = await api.eventos(desde, hasta, personaId);
      setEventos(r.eventos);
      setErrores(r.errores);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [lunes, personaId, habilitado]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { eventos, errores, cargando, error, recargar };
}
