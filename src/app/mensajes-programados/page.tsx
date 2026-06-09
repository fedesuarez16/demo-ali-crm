'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { SeguimientoPipeline } from '../components/SeguimientoPipeline';
import { cn } from '@/lib/utils';
import { getMensajesProgramados, eliminarMensajeProgramado, actualizarPlantillaMensaje, actualizarFechaProgramada, ColaSeguimiento } from '../services/mensajeService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link';

// Plantillas disponibles
// 8 toques fríos (1-8) → seguimientos_count = 1-8
// 8 toques tibios (1-8 en nombre) → seguimientos_count = 9-16
const PLANTILLAS = [
  // Toques fríos (1-8)
  { value: 'toque_1_frio', label: 'Toque 1 Frio' },
  { value: 'toque_2_frio', label: 'Toque 2 Frio' },
  { value: 'toque_3_frio', label: 'Toque 3 Frio' },
  { value: 'toque_4_frio', label: 'Toque 4 Frio' },
  { value: 'toque_5_frio', label: 'Toque 5 Frio' },
  { value: 'toque_6_frio', label: 'Toque 6 Frio' },
  { value: 'toque_7_frio', label: 'Toque 7 Frio' },
  { value: 'toque_8_frio', label: 'Toque 8 Frio' },
  // Toques tibios (1-8 en nombre, pero seguimientos_count = 9-16)
  { value: 'toque_1_tibio', label: 'Toque 1 Tibio' },
  { value: 'toque_2_tibio', label: 'Toque 2 Tibio' },
  { value: 'toque_3_tibio', label: 'Toque 3 Tibio' },
  { value: 'toque_4_tibio', label: 'Toque 4 Tibio' },
  { value: 'toque_5_tibio', label: 'Toque 5 Tibio' },
  { value: 'toque_6_tibio', label: 'Toque 6 Tibio' },
  { value: 'toque_7_tibio', label: 'Toque 7 Tibio' },
  { value: 'toque_8_tibio', label: 'Toque 8 Tibio' },
  { value: 'generico_01', label: 'Generico 01' },
];

function labelByState(active: boolean | null, error: string | null): string {
  if (active === null) return error ? 'Estado no disponible' : 'Cargando...';
  return active ? 'Detener seguimientos' : 'Reactivar seguimientos';
}

function labelByStateGenerico(active: boolean | null, error: string | null): string {
  if (active === null) return error ? 'Estado no disponible' : 'Cargando...';
  return active ? 'Detener seguimiento genérico' : 'Reactivar seguimiento genérico';
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function StateIcon({ active }: { active: boolean | null }) {
  if (active === true) {
    return (
      <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
    );
  }
  if (active === false) {
    return (
      <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <polygon points="5,3 19,12 5,21" />
      </svg>
    );
  }
  return null;
}

export default function MensajesProgramadosPage() {
  const [mensajes, setMensajes] = useState<ColaSeguimiento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [updatingPlantilla, setUpdatingPlantilla] = useState<number | null>(null);
  const [editingFecha, setEditingFecha] = useState<number | null>(null);
  const [tempFecha, setTempFecha] = useState<string>('');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedPipelines, setExpandedPipelines] = useState<Set<string>>(new Set());
  const [genericosExpanded, setGenericosExpanded] = useState(false);
  const [workflowActivoSeguimientos, setWorkflowActivoSeguimientos] = useState<boolean | null>(null);
  const [workflowActivoGenerico, setWorkflowActivoGenerico] = useState<boolean | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [isTogglingSeguimientos, setIsTogglingSeguimientos] = useState(false);
  const [isTogglingGenerico, setIsTogglingGenerico] = useState(false);

  useEffect(() => {
    void Promise.all([loadMensajes(), loadWorkflowState()]);
  }, []);

  const loadMensajes = async () => {
    setIsLoading(true);
    try {
      const data = await getMensajesProgramados();
      setMensajes(data);
    } catch (error) {
      console.error('Error loading mensajes programados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkflowState = async () => {
    try {
      const res = await fetch('/api/n8n/seguimiento-workflow', { method: 'GET', cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setWorkflowActivoSeguimientos(data.active);
        setWorkflowActivoGenerico(data.active);
        setWorkflowError(null);
      } else {
        setWorkflowActivoSeguimientos(null);
        setWorkflowActivoGenerico(null);
        setWorkflowError(data.error ?? 'No se pudo cargar el estado del workflow');
      }
    } catch {
      setWorkflowActivoSeguimientos(null);
      setWorkflowActivoGenerico(null);
      setWorkflowError('No se pudo cargar el estado del workflow');
    }
  };

  const handleDelete = async (id: number, tablaOrigen?: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este mensaje programado?')) {
      return;
    }

    setIsDeleting(id);
    try {
      const success = await eliminarMensajeProgramado(id, tablaOrigen);
      if (success) {
        setMensajes(mensajes.filter(m => m.id !== id));
      } else {
        alert('Error al eliminar el mensaje');
      }
    } catch (error) {
      console.error('Error deleting mensaje:', error);
      alert('Error al eliminar el mensaje');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleSeguimientos = async () => {
    if (workflowActivoSeguimientos === null) return;
    if (workflowActivoSeguimientos === true) {
      const ok = window.confirm('¿Detener el envío automático de seguimientos? Los mensajes pendientes no se borran, simplemente dejan de enviarse hasta que reactives el workflow.');
      if (!ok) return;
    }
    setIsTogglingSeguimientos(true);
    try {
      const res = await fetch('/api/n8n/seguimiento-workflow', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: workflowActivoSeguimientos ? 'deactivate' : 'activate' }),
      });
      const data = await res.json();
      if (res.ok) {
        setWorkflowActivoSeguimientos(data.active);
        setWorkflowError(null);
      } else {
        window.alert('No se pudo cambiar el estado: ' + (data.error ?? res.statusText));
      }
    } catch {
      window.alert('Error de red al cambiar el estado del workflow.');
    } finally {
      setIsTogglingSeguimientos(false);
    }
  };

  const handleToggleGenerico = async () => {
    if (workflowActivoGenerico === null) return;
    if (workflowActivoGenerico === true) {
      const ok = window.confirm('¿Detener el envío automático de seguimientos genéricos? Los mensajes pendientes no se borran, simplemente dejan de enviarse hasta que reactives el workflow.');
      if (!ok) return;
    }
    setIsTogglingGenerico(true);
    try {
      const res = await fetch('/api/n8n/seguimiento-workflow', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: workflowActivoGenerico ? 'deactivate' : 'activate' }),
      });
      const data = await res.json();
      if (res.ok) {
        setWorkflowActivoGenerico(data.active);
        setWorkflowError(null);
      } else {
        window.alert('No se pudo cambiar el estado: ' + (data.error ?? res.statusText));
      }
    } catch {
      window.alert('Error de red al cambiar el estado del workflow.');
    } finally {
      setIsTogglingGenerico(false);
    }
  };

  const handleRefreshAll = async () => {
    await Promise.all([loadMensajes(), loadWorkflowState()]);
  };

  const handleUpdatePlantilla = async (mensajeId: number, plantilla: string | null, tablaOrigen?: string) => {
    setUpdatingPlantilla(mensajeId);
    try {
      const plantillaValue = plantilla === 'none' || plantilla === null ? null : plantilla;
      const result = await actualizarPlantillaMensaje(mensajeId, plantillaValue, tablaOrigen);
      if (result.success) {
        // Si se movió entre tablas, necesitamos recargar los mensajes
        if (result.nuevaTabla && result.nuevaTabla !== tablaOrigen && result.nuevoId) {
          console.log(`✅ Mensaje movido de ${tablaOrigen} a ${result.nuevaTabla}. Recargando mensajes...`);
          // Recargar todos los mensajes para reflejar el cambio
          await loadMensajes();
        } else {
          // Si solo se actualizó la plantilla sin mover, actualizar el estado local
          setMensajes(mensajes.map(m => 
            m.id === mensajeId 
              ? { ...m, plantilla: plantillaValue }
              : m
          ));
        }
      } else {
        alert('Error al actualizar la plantilla');
      }
    } catch (error) {
      console.error('Error updating plantilla:', error);
      alert('Error al actualizar la plantilla');
    } finally {
      setUpdatingPlantilla(null);
    }
  };

  const handleStartEditFecha = (mensaje: ColaSeguimiento) => {
    if (!mensaje.id) return;
    
    const fechaProgramada = mensaje.fecha_programada || mensaje.scheduled_at;
    if (fechaProgramada) {
      // Convertir a formato datetime-local (YYYY-MM-DDTHH:mm)
      const date = new Date(fechaProgramada);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      setTempFecha(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      // Si no hay fecha, usar la fecha actual
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTempFecha(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
    setEditingFecha(mensaje.id);
  };

  const handleSaveFecha = async (mensajeId: number, tablaOrigen?: string) => {
    if (!tempFecha) {
      alert('Por favor ingresa una fecha y hora válida');
      return;
    }

    try {
      // El input datetime-local devuelve el formato "YYYY-MM-DDTHH:mm"
      // Necesitamos convertirlo a formato timestamp sin timezone (YYYY-MM-DD HH:mm:ss)
      // Sin convertir a UTC para evitar problemas de zona horaria
      const fechaLocal = new Date(tempFecha);
      
      // Obtener componentes en hora local (no UTC)
      const year = fechaLocal.getFullYear();
      const month = String(fechaLocal.getMonth() + 1).padStart(2, '0');
      const day = String(fechaLocal.getDate()).padStart(2, '0');
      const hours = String(fechaLocal.getHours()).padStart(2, '0');
      const minutes = String(fechaLocal.getMinutes()).padStart(2, '0');
      const seconds = String(fechaLocal.getSeconds()).padStart(2, '0');
      
      // Formato: YYYY-MM-DD HH:mm:ss (sin timezone)
      const fechaFormateada = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      
      // Crear ISO string para actualizar el estado local (usando hora local)
      const fechaISO = fechaLocal.toISOString();
      
      const success = await actualizarFechaProgramada(mensajeId, fechaFormateada, tablaOrigen);
      
      if (success) {
        // Actualizar el mensaje en el estado local
        setMensajes(mensajes.map(m => 
          m.id === mensajeId 
            ? { ...m, fecha_programada: fechaISO }
            : m
        ));
        setEditingFecha(null);
        setTempFecha('');
      } else {
        alert('Error al actualizar la fecha programada');
      }
    } catch (error) {
      console.error('Error updating fecha:', error);
      alert('Error al actualizar la fecha programada');
    }
  };

  const handleCancelEditFecha = () => {
    setEditingFecha(null);
    setTempFecha('');
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatDateShort = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-AR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    }).format(date);
  };

  const normalizePhoneNumber = (phone: string | undefined) => {
    if (!phone) return 'N/A';
    // Remover @s.whatsapp.net si existe
    let normalized = phone.replace('@s.whatsapp.net', '');
    // Remover WAID: si existe
    normalized = normalized.replace(/^WAID:/, '');
    normalized = normalized.replace(/^whatsapp:/, '');
    return normalized;
  };

  const getDayKey = (dateString: string | undefined): string => {
    if (!dateString) return 'sin-fecha';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const formatDayLabel = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayKey = getDayKey(dateString);
    const todayKey = getDayKey(today.toISOString());
    const tomorrowKey = getDayKey(tomorrow.toISOString());
    
    if (dayKey === todayKey) return 'Hoy';
    if (dayKey === tomorrowKey) return 'Mañana';
    
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    }).format(date);
  };

  const formatTimeOnly = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Función para obtener el número de toque basado en seguimientos_count
  const getToqueNumber = (mensaje: ColaSeguimiento): number => {
    // seguimientos_count = 0 → Toque 1
    // seguimientos_count = 1 → Toque 2
    // seguimientos_count = 2 → Toque 3
    // etc.
    // seguimientos_count = null → Toque 1
    if (mensaje.seguimientos_count !== undefined && mensaje.seguimientos_count !== null) {
      return mensaje.seguimientos_count + 1;
    }
    // Si es null, mostrar Toque 1
    return 1;
  };

  const SEGUIMIENTOS_COUNT_PLANTILLA_GENERICO_DEFAULT = new Set([100, 101, 102, 103, 105]);

  const getMensajePreview = (count: number | null | undefined): string | null => {
    if (count === null || count === undefined || count === 0) {
      return 'Mensaje generado por IA (seguimiento personalizado basado en historial de conversación)';
    }
    const map: Record<number, string> = {
      1: 'Hola! Solo paso a confirmar si seguís interesado/a. A veces los tiempos corren y se nos escapan oportunidades... cualquier duda que tengas, contá conmigo',
      2: 'Hola 👋 Solo para asegurarme que recibiste bien todo. Si la info te sirvió y querés avanzar, coordinamos cuando te quede cómodo. Si no es lo que buscabas, decime y te afino la búsqueda.',
      3: '¡Buenas! Consulto para saber si esta propiedad sigue en tu radar. Varias consultas aparecieron esta semana, avisame si querés reservar día para verla 😉',
      4: 'Hola 👋 ¿Cómo va? Hace un mes te compartí la info. Contame si seguís buscando —tengo movimientos nuevos en cartera que quizás te cierren más.',
      200: 'Hola! Solo paso a confirmar si seguís interesado/a. A veces los tiempos corren y se nos escapan oportunidades... cualquier duda que tengas, contá conmigo',
      201: 'Seguimiento genérico (toque 2)',
      999: 'Seguimiento genérico (reactivación)',
    };
    return map[count] ?? null;
  };

  /** Valor del Select: para count 100–102 sin plantilla en BD, mostrar Generico 01 por defecto. */
  const plantillaSelectValue = (mensaje: ColaSeguimiento): string => {
    const c = mensaje.seguimientos_count;
    const p = mensaje.plantilla;
    if (c !== undefined && c !== null && SEGUIMIENTOS_COUNT_PLANTILLA_GENERICO_DEFAULT.has(c)) {
      if (p === null || p === undefined || p === '') {
        return 'generico_01';
      }
    }
    return p || 'none';
  };

  // Función para toggle del acordeón
  const toggleDay = (dayKey: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayKey)) {
        newSet.delete(dayKey);
      } else {
        newSet.add(dayKey);
      }
      return newSet;
    });
  };

  const togglePipeline = (key: string) => {
    setExpandedPipelines(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const esSeguimientoGenericoCola = (m: ColaSeguimiento) =>
    m.seguimientos_count === 100 ||
    m.seguimientos_count === 101 ||
    m.seguimientos_count === 102 ||
    m.seguimientos_count === 103 ||
    m.seguimientos_count === 105;

  const mensajesPrioridadCola = mensajes.filter(esSeguimientoGenericoCola);
  const mensajesPrioridadColaOrdenados = [...mensajesPrioridadCola].sort((a, b) => {
    const fechaA = a.fecha_programada || a.scheduled_at || a.enviado_at;
    const fechaB = b.fecha_programada || b.scheduled_at || b.enviado_at;
    if (!fechaA) return 1;
    if (!fechaB) return -1;
    return new Date(fechaA).getTime() - new Date(fechaB).getTime();
  });

  // Pendientes: solo desde hoy en adelante (misma lógica que antes del fix de carga)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const mensajesPendientes = mensajes.filter(m => {
    if (esSeguimientoGenericoCola(m)) return false;
    if (m.estado !== 'pendiente') return false;

    const fechaProgramada = m.fecha_programada || m.scheduled_at;
    if (!fechaProgramada) return true;

    const fechaMensaje = new Date(fechaProgramada);
    fechaMensaje.setHours(0, 0, 0, 0);
    return fechaMensaje >= hoy;
  });
  
  const mensajesCompletados = mensajes.filter(
    m => m.seguimientos_count === 8 && !esSeguimientoGenericoCola(m)
  );

  // Agrupar mensajes pendientes por día
  const mensajesPendientesPorDia = mensajesPendientes.reduce((acc, mensaje) => {
    const fechaProgramada = mensaje.fecha_programada || mensaje.scheduled_at;
    const dayKey = getDayKey(fechaProgramada);
    
    if (!acc[dayKey]) {
      acc[dayKey] = [];
    }
    acc[dayKey].push(mensaje);
    return acc;
  }, {} as Record<string, ColaSeguimiento[]>);

  // Agrupar mensajes enviados por día
  const mensajesCompletadosPorDia = mensajesCompletados.reduce((acc, mensaje) => {
    const fechaProgramada = mensaje.fecha_programada || mensaje.scheduled_at || mensaje.enviado_at || undefined;
    const dayKey = getDayKey(fechaProgramada ?? undefined);
    
    if (!acc[dayKey]) {
      acc[dayKey] = [];
    }
    acc[dayKey].push(mensaje);
    return acc;
  }, {} as Record<string, ColaSeguimiento[]>);

  // Ordenar los días (más antiguos primero)
  const ordenarDias = (dias: string[]) => {
    return dias.sort((a, b) => {
      if (a === 'sin-fecha') return 1;
      if (b === 'sin-fecha') return -1;
      return a.localeCompare(b);
    });
  };

  const diasPendientesOrdenados = ordenarDias(Object.keys(mensajesPendientesPorDia));
  const diasCompletadosOrdenados = ordenarDias(Object.keys(mensajesCompletadosPorDia));

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-slate-800">Cargando mensajes programados...</h2>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8 ">
        <div className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200 mb-2">
          <div className="pl-16 pr-2 py-2 lg:px-2">
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
                    <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Mensajes Programados</span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>

          <div className="px-3 sm:px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t border-slate-100">
            <div>
              <h1 className="text-lg font-semibold text-slate-800 tracking-tight">Mensajes Programados</h1>
              <p className="text-sm text-gray-500 mt-1">
                {mensajes.filter(m => m.estado === 'pendiente').length} pendiente(s) ·{' '}
                {mensajes.filter(m => m.seguimientos_count === 8).length} completado(s)
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleSeguimientos}
                disabled={isTogglingSeguimientos || workflowActivoSeguimientos === null}
                className={
                  workflowActivoSeguimientos === true
                    ? 'text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800'
                    : ''
                }
                title={
                  workflowError ??
                  (workflowActivoSeguimientos === null ? 'Cargando estado del workflow…' : undefined)
                }
              >
                {isTogglingSeguimientos ? <SpinnerIcon /> : <StateIcon active={workflowActivoSeguimientos} />}
                {labelByState(workflowActivoSeguimientos, workflowError)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleGenerico}
                disabled={isTogglingGenerico || workflowActivoGenerico === null}
                className={
                  workflowActivoGenerico === true
                    ? 'text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800'
                    : ''
                }
                title={
                  workflowError ??
                  (workflowActivoGenerico === null ? 'Cargando estado del workflow…' : undefined)
                }
              >
                {isTogglingGenerico ? <SpinnerIcon /> : <StateIcon active={workflowActivoGenerico} />}
                {labelByStateGenerico(workflowActivoGenerico, workflowError)}
              </Button>
              <Button onClick={handleRefreshAll} variant="outline" size="sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-3 sm:p-6">
          {mensajesPrioridadCola.length > 0 && (
            <Card className="border-2 border-amber-200 shadow-md ring-1 ring-amber-100/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setGenericosExpanded((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-6 py-4 bg-amber-50/90 border-b border-amber-200 hover:bg-amber-100/60 transition-colors text-left"
                aria-expanded={genericosExpanded}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <svg
                    className={`h-5 w-5 text-amber-800/70 flex-shrink-0 transition-transform ${genericosExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-amber-950 font-semibold">
                      <span className="h-2.5 w-2.5 bg-amber-500 rounded-full flex-shrink-0" aria-hidden />
                      Seguimientos genéricos
                    </div>
                    <p className="text-xs text-amber-900/75 mt-0.5">
                      {mensajesPrioridadCola.length} ítem{mensajesPrioridadCola.length !== 1 ? 's' : ''} · sin agrupar por fecha
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-200/80 text-amber-950 border border-amber-300 flex-shrink-0">
                  {mensajesPrioridadCola.length}
                </span>
              </button>
              {genericosExpanded && (
              <CardContent className="pt-4 border-t border-amber-100">
                <div className="space-y-3 max-h-[min(70vh,520px)] overflow-y-auto pr-1">
                  {mensajesPrioridadColaOrdenados.map((mensaje) => {
                    const isEnviado = mensaje.estado === 'enviado';
                    const fechaProgramada = mensaje.fecha_programada || mensaje.scheduled_at;
                    const fechaEnviado = mensaje.enviado_at;
                    const telefono = normalizePhoneNumber(mensaje.remote_jid || String(mensaje.lead_id || ''));
                    const toqueNumber = getToqueNumber(mensaje);

                    return (
                      <div
                        key={mensaje.id}
                        className="border border-amber-200 rounded-md p-3 bg-white shadow-sm"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                              <div className="flex items-center gap-1.5">
                                <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="text-sm font-medium text-gray-900 truncate">{telefono}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  Toque {toqueNumber}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                                    isEnviado
                                      ? 'bg-green-100 text-green-800 border-green-200'
                                      : 'bg-orange-100 text-orange-800 border-orange-200'
                                  }`}
                                >
                                  {isEnviado ? 'Enviado' : 'Pendiente'}
                                </span>
                              </div>
                            </div>

                            {(() => {
                              const preview = getMensajePreview(mensaje.seguimientos_count);
                              return preview ? (
                                <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-100 rounded px-2 py-1.5 mb-2 leading-relaxed">
                                  {preview}
                                </p>
                              ) : null;
                            })()}
                            <div className={isEnviado ? 'mb-2' : 'mb-1.5'}>
                              {isEnviado ? (
                                <label className="block text-xs font-medium text-gray-700 mb-1">Plantilla</label>
                              ) : null}
                              <Select
                                value={plantillaSelectValue(mensaje)}
                                onValueChange={(value) => mensaje.id && handleUpdatePlantilla(mensaje.id, value, mensaje.tabla_origen)}
                                disabled={updatingPlantilla === mensaje.id}
                              >
                                <SelectTrigger className={isEnviado ? 'h-8 text-xs' : 'h-7 text-xs'}>
                                  <SelectValue placeholder="Sin plantilla" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Sin plantilla</SelectItem>
                                  {PLANTILLAS.map((plantilla) => (
                                    <SelectItem key={plantilla.value} value={plantilla.value}>
                                      {plantilla.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {isEnviado ? (
                              <div className="space-y-2">
                                {fechaProgramada && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Fecha programada</label>
                                    {editingFecha === mensaje.id ? (
                                      <div className="space-y-2">
                                        <input
                                          type="datetime-local"
                                          value={tempFecha}
                                          onChange={(e) => setTempFecha(e.target.value)}
                                          className="w-full px-2 py-1.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          autoFocus
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => mensaje.id && handleSaveFecha(mensaje.id, mensaje.tabla_origen)}
                                            className="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                          >
                                            Guardar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={handleCancelEditFecha}
                                            className="flex-1 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-blue-900 cursor-pointer hover:bg-blue-100 transition-colors"
                                        onClick={() => handleStartEditFecha(mensaje)}
                                        title="Click para editar fecha y hora"
                                      >
                                        <svg className="h-4 w-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-xs font-semibold">{formatTimeOnly(fechaProgramada)}</span>
                                        <svg className="h-4 w-4 text-blue-600 flex-shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {fechaEnviado && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Fecha enviado</label>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded text-green-900">
                                      <svg className="h-4 w-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span className="text-xs font-semibold">{formatTimeOnly(fechaEnviado)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : editingFecha === mensaje.id ? (
                              <div className="space-y-1">
                                <input
                                  type="datetime-local"
                                  value={tempFecha}
                                  onChange={(e) => setTempFecha(e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  autoFocus
                                />
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => mensaje.id && handleSaveFecha(mensaje.id, mensaje.tabla_origen)}
                                    className="flex-1 px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditFecha}
                                    className="flex-1 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-blue-900 cursor-pointer hover:bg-blue-100 transition-colors w-fit"
                                onClick={() => handleStartEditFecha(mensaje)}
                                title="Click para editar fecha y hora"
                              >
                                <svg className="h-3 w-3 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs font-semibold">
                                  {fechaProgramada ? formatTimeOnly(fechaProgramada) : 'Sin fecha'}
                                </span>
                                <svg className="h-3 w-3 text-blue-600 flex-shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => mensaje.id && handleDelete(mensaje.id, mensaje.tabla_origen)}
                            disabled={isDeleting === mensaje.id}
                            className={`text-red-600 hover:text-red-700 hover:bg-red-50 p-0 flex-shrink-0 ${isEnviado ? 'h-8 w-8' : 'h-6 w-6'}`}
                            title="Eliminar mensaje programado"
                          >
                            {isDeleting === mensaje.id ? (
                              <div className={`animate-spin rounded-full border-b-2 border-red-600 ${isEnviado ? 'h-4 w-4' : 'h-3 w-3'}`} />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className={isEnviado ? 'h-4 w-4' : 'h-3 w-3'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </Button>
                        </div>
                        {(() => {
                          if (mensaje.id === undefined) return null;
                          const key = `${mensaje.tabla_origen ?? 'cola_seguimientos'}-${mensaje.id}`;
                          return (
                            <div className="mt-2 border-t border-slate-100 pt-2">
                              <button
                                type="button"
                                onClick={() => togglePipeline(key)}
                                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 transition-colors"
                                aria-expanded={expandedPipelines.has(key)}
                                aria-controls={`pipeline-${key}`}
                              >
                                <svg
                                  className={cn('h-3 w-3 transition-transform', expandedPipelines.has(key) && 'rotate-90')}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  aria-hidden
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                Pipeline de seguimientos
                              </button>
                              {expandedPipelines.has(key) && (
                                <div id={`pipeline-${key}`} className="mt-2">
                                  <SeguimientoPipeline count={mensaje.seguimientos_count ?? null} />
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
              )}
            </Card>
          )}

          {/* Mensajes Pendientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="h-2 w-2 bg-orange-500 rounded-full"></span>
                Seguimiento organico  ({mensajesPendientes.length})
              </CardTitle>
              <CardDescription>
                Mensajes programados que aún no se han enviado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mensajesPendientes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No hay mensajes pendientes</p>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {diasPendientesOrdenados.map((dayKey) => {
                    const mensajesDelDia = mensajesPendientesPorDia[dayKey];
                    const isExpanded = expandedDays.has(dayKey);
                    
                    return (
                      <div
                        key={dayKey}
                        className="flex-shrink-0 w-[85vw] sm:w-80 border border-gray-200 rounded-lg bg-white overflow-hidden"
                      >
                        {/* Encabezado del acordeón */}
                        <button
                          onClick={() => toggleDay(dayKey)}
                          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <svg
                              className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <div className="text-left">
                              <h3 className="text-sm font-semibold text-gray-900">
                                {formatDayLabel(dayKey === 'sin-fecha' ? new Date().toISOString() : dayKey)}
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {mensajesDelDia.length} mensaje{mensajesDelDia.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                            Pendiente
                          </span>
                        </button>
                        
                        {/* Contenido desplegable */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 p-4 bg-gray-50 max-h-[600px] overflow-y-auto">
                            <div className="space-y-3">
                              {mensajesDelDia
                                .sort((a, b) => {
                                  const fechaA = a.fecha_programada || a.scheduled_at;
                                  const fechaB = b.fecha_programada || b.scheduled_at;
                                  if (!fechaA) return 1;
                                  if (!fechaB) return -1;
                                  return new Date(fechaA).getTime() - new Date(fechaB).getTime();
                                })
                                .map((mensaje) => {
                                  const fechaProgramada = mensaje.fecha_programada || mensaje.scheduled_at;
                                  const telefono = normalizePhoneNumber(mensaje.remote_jid || String(mensaje.lead_id || ''));
                                  const toqueNumber = getToqueNumber(mensaje);
                                  
                                  return (
                                    <div
                                      key={mensaje.id}
                                      className="border border-gray-200 rounded-md p-3 hover:shadow-sm transition-shadow bg-white"
                                    >
                                      <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                          {/* Teléfono y Toque */}
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                              <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                              </svg>
                                              <span className="text-sm font-medium text-gray-900 truncate">
                                                {telefono}
                                              </span>
                                            </div>
                                            {/* Badge de Toque */}
                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                              Toque {toqueNumber}
                                            </span>
                                          </div>
                                        
                                        {(() => {
                                          const preview = getMensajePreview(mensaje.seguimientos_count);
                                          return preview ? (
                                            <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-100 rounded px-2 py-1.5 mb-2 leading-relaxed">
                                              {preview}
                                            </p>
                                          ) : null;
                                        })()}
                                        {/* Selector de Plantilla */}
                                        <div className="mb-1.5">
                                          <Select
                                            value={plantillaSelectValue(mensaje)}
                                            onValueChange={(value) => mensaje.id && handleUpdatePlantilla(mensaje.id, value, mensaje.tabla_origen)}
                                            disabled={updatingPlantilla === mensaje.id}
                                          >
                                            <SelectTrigger className="h-7 text-xs">
                                              <SelectValue placeholder="Sin plantilla" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="none">Sin plantilla</SelectItem>
                                              {PLANTILLAS.map((plantilla) => (
                                                <SelectItem key={plantilla.value} value={plantilla.value}>
                                                  {plantilla.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        
                                        {/* Hora programada - Editable */}
                                        {editingFecha === mensaje.id ? (
                                          <div className="space-y-1">
                                            <input
                                              type="datetime-local"
                                              value={tempFecha}
                                              onChange={(e) => setTempFecha(e.target.value)}
                                              className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                              autoFocus
                                            />
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => mensaje.id && handleSaveFecha(mensaje.id, mensaje.tabla_origen)}
                                                className="flex-1 px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                              >
                                                Guardar
                                              </button>
                                              <button
                                                onClick={handleCancelEditFecha}
                                                className="flex-1 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                              >
                                                Cancelar
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div 
                                            className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-blue-900 cursor-pointer hover:bg-blue-100 transition-colors"
                                            onClick={() => handleStartEditFecha(mensaje)}
                                            title="Click para editar fecha y hora"
                                          >
                                            <svg className="h-3 w-3 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-xs font-semibold">
                                              {fechaProgramada ? formatTimeOnly(fechaProgramada) : 'Sin fecha'}
                                            </span>
                                            <svg className="h-3 w-3 text-blue-600 flex-shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => mensaje.id && handleDelete(mensaje.id, mensaje.tabla_origen)}
                                        disabled={isDeleting === mensaje.id}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0 flex-shrink-0"
                                        title="Eliminar mensaje programado"
                                      >
                                        {isDeleting === mensaje.id ? (
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                        ) : (
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        )}
                                      </Button>
                                    </div>
                                    {(() => {
                                      if (mensaje.id === undefined) return null;
                                      const key = `${mensaje.tabla_origen ?? 'cola_seguimientos'}-${mensaje.id}`;
                                      return (
                                        <div className="mt-2 border-t border-slate-100 pt-2">
                                          <button
                                            type="button"
                                            onClick={() => togglePipeline(key)}
                                            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 transition-colors"
                                            aria-expanded={expandedPipelines.has(key)}
                                            aria-controls={`pipeline-${key}`}
                                          >
                                            <svg
                                              className={cn('h-3 w-3 transition-transform', expandedPipelines.has(key) && 'rotate-90')}
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                              aria-hidden
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                            Pipeline de seguimientos
                                          </button>
                                          {expandedPipelines.has(key) && (
                                            <div id={`pipeline-${key}`} className="mt-2">
                                              <SeguimientoPipeline count={mensaje.seguimientos_count ?? null} />
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mensajes Completados (count=8, final del pipeline frío) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                Completados ({mensajesCompletados.length})
              </CardTitle>
              <CardDescription>
                Leads que llegaron al toque 8 (final del pipeline frío)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mensajesCompletados.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No hay mensajes completados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {diasCompletadosOrdenados.map((dayKey) => {
                    const mensajesDelDia = mensajesCompletadosPorDia[dayKey];
                    const isExpanded = expandedDays.has(`completado-${dayKey}`);
                    
                    return (
                      <div
                        key={dayKey}
                        className="border border-gray-200 rounded-lg bg-white overflow-hidden"
                      >
                        {/* Encabezado del acordeón */}
                        <button
                          onClick={() => toggleDay(`completado-${dayKey}`)}
                          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <svg
                              className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <div className="text-left">
                              <h3 className="text-sm font-semibold text-gray-900">
                                {formatDayLabel(dayKey === 'sin-fecha' ? new Date().toISOString() : dayKey)}
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {mensajesDelDia.length} mensaje{mensajesDelDia.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            Completado
                          </span>
                        </button>
                        
                        {/* Contenido desplegable */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 p-4 bg-gray-50">
                            <div className="space-y-3">
                              {mensajesDelDia
                                .sort((a, b) => {
                                  const fechaA = a.enviado_at || a.fecha_programada || a.scheduled_at;
                                  const fechaB = b.enviado_at || b.fecha_programada || b.scheduled_at;
                                  if (!fechaA) return 1;
                                  if (!fechaB) return -1;
                                  return new Date(fechaB).getTime() - new Date(fechaA).getTime(); // Más recientes primero
                                })
                                .map((mensaje) => {
                                  const fechaProgramada = mensaje.fecha_programada || mensaje.scheduled_at;
                                  const fechaEnviado = mensaje.enviado_at;
                                  const telefono = normalizePhoneNumber(mensaje.remote_jid || String(mensaje.lead_id || ''));
                                  const toqueNumber = getToqueNumber(mensaje);
                                  
                                  return (
                                    <div
                                      key={mensaje.id}
                                      className="border border-gray-200 rounded-md p-3 hover:shadow-sm transition-shadow bg-white"
                                    >
                                      <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                          {/* Teléfono y Toque */}
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                              <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                              </svg>
                                              <span className="text-sm font-medium text-gray-900 truncate">
                                                {telefono}
                                              </span>
                                            </div>
                                            {/* Badge de Toque */}
                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                              Toque {toqueNumber}
                                            </span>
                                          </div>
                                          
                                          {(() => {
                                            const preview = getMensajePreview(mensaje.seguimientos_count);
                                            return preview ? (
                                              <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-100 rounded px-2 py-1.5 mb-2 leading-relaxed">
                                                {preview}
                                              </p>
                                            ) : null;
                                          })()}
                                          {/* Selector de Plantilla */}
                                          <div className="mb-2">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              Plantilla
                                            </label>
                                            <Select
                                              value={plantillaSelectValue(mensaje)}
                                              onValueChange={(value) => mensaje.id && handleUpdatePlantilla(mensaje.id, value, mensaje.tabla_origen)}
                                              disabled={updatingPlantilla === mensaje.id}
                                            >
                                              <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Sin plantilla" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="none">Sin plantilla</SelectItem>
                                                {PLANTILLAS.map((plantilla) => (
                                                  <SelectItem key={plantilla.value} value={plantilla.value}>
                                                    {plantilla.label}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          
                                          {/* Fechas */}
                                          <div className="space-y-2">
                                            {/* Hora programada - Editable */}
                                            {fechaProgramada && (
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                  Fecha Programada
                                                </label>
                                                {editingFecha === mensaje.id ? (
                                                  <div className="space-y-2">
                                                    <input
                                                      type="datetime-local"
                                                      value={tempFecha}
                                                      onChange={(e) => setTempFecha(e.target.value)}
                                                      className="w-full px-2 py-1.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                      autoFocus
                                                    />
                                                    <div className="flex gap-2">
                                                      <button
                                                        onClick={() => mensaje.id && handleSaveFecha(mensaje.id, mensaje.tabla_origen)}
                                                        className="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                                      >
                                                        Guardar
                                                      </button>
                                                      <button
                                                        onClick={handleCancelEditFecha}
                                                        className="flex-1 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                                      >
                                                        Cancelar
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div 
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-blue-900 cursor-pointer hover:bg-blue-100 transition-colors"
                                                    onClick={() => handleStartEditFecha(mensaje)}
                                                    title="Click para editar fecha y hora"
                                                  >
                                                    <svg className="h-4 w-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="text-xs font-semibold">
                                                      {formatTimeOnly(fechaProgramada)}
                                                    </span>
                                                    <svg className="h-4 w-4 text-blue-600 flex-shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                            
                                            {/* Hora enviado */}
                                            {fechaEnviado && (
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                  Fecha Enviado
                                                </label>
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded text-green-900">
                                                  <svg className="h-4 w-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                  </svg>
                                                  <span className="text-xs font-semibold">
                                                    {formatTimeOnly(fechaEnviado)}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => mensaje.id && handleDelete(mensaje.id, mensaje.tabla_origen)}
                                          disabled={isDeleting === mensaje.id}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 flex-shrink-0"
                                          title="Eliminar mensaje"
                                        >
                                          {isDeleting === mensaje.id ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                          ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </AppLayout>
  );
}

