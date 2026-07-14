import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lead, Property } from '../types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Phone, Mail, Calendar, MapPin, DollarSign, Home, User, Clock, FileText, Building, Plus, Minus, Wifi, WifiOff, Bell, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { programarSeguimiento, getSeguimientosPendientes, actualizarFechaProgramada, ColaSeguimiento, existeSeguimientoParaLead, eliminarTodosSeguimientosPendientes } from '../services/mensajeService';
import { useChatStatus } from '../../hooks/useChatStatus';
import { updateLead, getLeadById, deleteLead } from '../services/leadService';

interface LeadDetailSidebarProps {
  lead: Lead | null;
  onClose: () => void;
  matchingProperties: Property[];
  isOpen: boolean;
  onEditLead?: (lead: Lead) => void;
  columnColors?: Record<string, string>;
  onLeadRefreshed?: (lead: Lead) => void;
  onLeadDeleted?: (leadId: string) => void;
}

const LeadDetailSidebar: React.FC<LeadDetailSidebarProps> = ({
  lead,
  onClose,
  matchingProperties,
  isOpen,
  onEditLead,
  columnColors = {},
  onLeadRefreshed,
  onLeadDeleted
}) => {
  const [notas, setNotas] = useState(lead?.notas || '');
  const [isSavingNotas, setIsSavingNotas] = useState(false);
  const [seguimientosCount, setSeguimientosCount] = useState(lead?.seguimientos_count || 0);
  const [isSavingSeguimientos, setIsSavingSeguimientos] = useState(false);
  // localLead mirrors the lead prop so agent button flips immediately without reopening the sidebar (ADR-1).
  // Note: localLead and the parent prop can diverge if the parent re-fetches and sends a different value.
  const [localLead, setLocalLead] = useState<Lead | null>(lead);
  const [isUpdatingAgente, setIsUpdatingAgente] = useState(false);
  const [tieneSeguimiento, setTieneSeguimiento] = useState<boolean>(false);
  const [isUpdatingSeguimiento, setIsUpdatingSeguimiento] = useState(false);
  const [seguimientoPendiente, setSeguimientoPendiente] = useState<ColaSeguimiento | null>(null);
  const [fechaProgramadaEdit, setFechaProgramadaEdit] = useState<string>('');
  const [isEditingFechaProgramada, setIsEditingFechaProgramada] = useState(false);
  const [isSavingFechaProgramada, setIsSavingFechaProgramada] = useState(false);
  const [isRefreshingLead, setIsRefreshingLead] = useState(false);
  const [isDeletingLead, setIsDeletingLead] = useState(false);

  // Hook para verificar el estado del chat via n8n webhook
  const phoneNumber = (lead as any)?.whatsapp_id || lead?.telefono;
  const { lastActivity, loading: chatLoading, refreshChatStatus, source, chatData } = useChatStatus(phoneNumber);
  const isChatActive = (localLead?.estado_chat ?? 1) !== 0;
  
  // Sincronizar el mirror local cuando el lead prop cambia (por ejemplo, el padre re-fetches)
  useEffect(() => {
    setLocalLead(lead);
  }, [lead?.id]);

  // Actualizar notas cuando cambia el lead
  useEffect(() => {
    if (lead?.notas !== undefined) {
      setNotas(lead.notas || '');
    }
    if (lead?.seguimientos_count !== undefined && lead?.seguimientos_count !== null) {
      setSeguimientosCount(lead.seguimientos_count);
    }
  }, [lead?.id, lead?.notas, lead?.seguimientos_count]);

  const loadSeguimientoPendienteFor = async (target: Lead | null) => {
    if (!target) {
      setSeguimientoPendiente(null);
      return;
    }

    try {
      const remoteJid = (target as any).whatsapp_id || target.telefono || '';
      if (!remoteJid) {
        setSeguimientoPendiente(null);
        return;
      }

      const seguimientos = await getSeguimientosPendientes(remoteJid);
      if (seguimientos.length > 0) {
        const seguimiento = seguimientos[0];
        setSeguimientoPendiente(seguimiento);

        const fechaProgramada = seguimiento.fecha_programada || seguimiento.scheduled_at;
        if (fechaProgramada) {
          const date = new Date(fechaProgramada);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          setFechaProgramadaEdit(`${year}-${month}-${day}T${hours}:${minutes}`);
        } else {
          setFechaProgramadaEdit('');
        }
      } else {
        setSeguimientoPendiente(null);
        setFechaProgramadaEdit('');
      }
    } catch (error) {
      console.error('Error loading seguimiento pendiente:', error);
      setSeguimientoPendiente(null);
    }
  };

  // Cargar seguimiento pendiente cuando cambia el lead
  useEffect(() => {
    if (isOpen && lead) {
      loadSeguimientoPendienteFor(lead);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id, (lead as any)?.whatsapp_id, lead?.telefono, isOpen]);

  // Verificar si el lead tiene seguimientos pendientes al abrir o cambiar de lead
  useEffect(() => {
    if (!lead) {
      setTieneSeguimiento(false);
      return;
    }
    const remoteJid = (lead as any).whatsapp_id || lead.telefono || '';
    if (!remoteJid) {
      setTieneSeguimiento(false);
      return;
    }
    let cancelled = false;
    existeSeguimientoParaLead(remoteJid)
      .then(existe => { if (!cancelled) setTieneSeguimiento(existe); })
      .catch(err => {
        console.error('Error verificando seguimiento existente:', err);
        if (!cancelled) setTieneSeguimiento(false);
      });
    return () => { cancelled = true; };
  }, [lead?.id, (lead as any)?.whatsapp_id, lead?.telefono, isOpen]);

  // Refresca toda la información del lead desde Supabase y los datos relacionados.
  const handleRefreshLead = async () => {
    if (!lead?.id || isRefreshingLead) return;
    setIsRefreshingLead(true);
    try {
      const fresh = await getLeadById(lead.id);
      if (fresh) {
        setLocalLead(fresh);
        if (fresh.notas !== undefined) setNotas(fresh.notas || '');
        if (fresh.seguimientos_count !== undefined && fresh.seguimientos_count !== null) {
          setSeguimientosCount(fresh.seguimientos_count);
        }
        onLeadRefreshed?.(fresh);
        await loadSeguimientoPendienteFor(fresh);
      }
      await refreshChatStatus();
    } catch (err) {
      console.error('Error refrescando información del lead:', err);
    } finally {
      setIsRefreshingLead(false);
    }
  };

  // Elimina el lead (hard delete) y sus seguimientos pendientes. Pide confirmación.
  const handleDeleteLead = async () => {
    if (!lead || isDeletingLead) return;
    const nombre = lead.nombreCompleto || (lead as any).nombre || (lead as any).whatsapp_id || lead.telefono || 'este lead';
    const confirmed = window.confirm(
      `¿Eliminar a "${nombre}"? Esta acción es irreversible y borrará también todos sus seguimientos pendientes.`
    );
    if (!confirmed) return;

    setIsDeletingLead(true);
    try {
      const remoteJid = (lead as any).whatsapp_id || lead.telefono || '';
      if (remoteJid) {
        try {
          await eliminarTodosSeguimientosPendientes(remoteJid);
        } catch (err) {
          console.error('Error limpiando seguimientos pendientes antes de eliminar lead:', err);
        }
      }
      const ok = await deleteLead(lead.id);
      if (ok) {
        onLeadDeleted?.(lead.id);
        onClose();
      } else {
        window.alert('No se pudo eliminar el lead. Revisá la consola para más detalles.');
      }
    } catch (err) {
      console.error('Error eliminando lead:', err);
      window.alert('Error eliminando lead.');
    } finally {
      setIsDeletingLead(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getStatusVariant = (status: string) => {
    // Si hay un color personalizado, usar estilo personalizado
    if (columnColors[status]) {
      return 'custom';
    }
    // Fallback a variantes por defecto
    switch (status) {
      case 'frío':
        return 'secondary';
      case 'tibio':
        return 'default';
      case 'caliente':
        return 'destructive';
      case 'llamada':
        return 'outline';
      case 'visita':
        return 'default';
      default:
        return 'secondary';
    }
  };
  
  const getStatusBadgeStyle = (status: string) => {
    if (columnColors[status]) {
      const color = columnColors[status];
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const bgColor = `rgba(${r}, ${g}, ${b}, 0.15)`;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const textColor = luminance > 0.5 ? color : color;
      
      return {
        backgroundColor: bgColor,
        color: textColor,
        borderColor: color
      };
    }
    return {};
  };

  // Función para guardar notas
  const handleSaveNotas = async () => {
    if (!lead) return;
    
    setIsSavingNotas(true);
    try {
      const updatedLead = await updateLead(lead.id, { notas });
      if (updatedLead) {
        // Las notas se actualizaron exitosamente
        // El componente padre debería actualizar el lead si es necesario
      }
    } catch (error) {
      console.error('Error saving notas:', error);
      alert('Error al guardar las notas');
    } finally {
      setIsSavingNotas(false);
    }
  };
  
  // Función para guardar seguimientos_count
  const handleSaveSeguimientos = async () => {
    if (!lead) return;
    
    const count = Number(seguimientosCount);
    if (isNaN(count) || count < 0) {
      alert('Por favor ingresa un número válido (0 o mayor)');
      return;
    }
    
    setIsSavingSeguimientos(true);
    try {
      const updatedLead = await updateLead(lead.id, { seguimientos_count: count });
      if (updatedLead) {
        // El seguimientos_count se actualizó exitosamente
      }
    } catch (error) {
      console.error('Error saving seguimientos_count:', error);
      alert('Error al guardar el contador de seguimientos');
    } finally {
      setIsSavingSeguimientos(false);
    }
  };

  // Activa o desactiva el seguimiento para el lead.
  // Desactivar: irreversible (borra filas de cola_seguimientos y cola_seguimientos_dos) — pide confirmación.
  // Activar: programa un nuevo seguimiento para dentro de 23 horas — sin confirmación.
  const handleSeguimientoToggle = async () => {
    if (!lead) return;

    const remoteJid = (lead as any).whatsapp_id || lead.telefono || '';
    if (!remoteJid) {
      alert('❌ No se encontró un número de teléfono válido para este lead');
      return;
    }

    setIsUpdatingSeguimiento(true);
    try {
      if (tieneSeguimiento) {
        // DESACTIVAR (irreversible) — confirmar antes de borrar
        if (!confirm('¿Desactivar seguimiento? Se borrarán los seguimientos programados.')) {
          return;
        }
        const ok = await eliminarTodosSeguimientosPendientes(remoteJid);
        if (ok) {
          setTieneSeguimiento(false);
          setSeguimientoPendiente(null);
          setFechaProgramadaEdit('');
        } else {
          alert('❌ Error al desactivar el seguimiento. Intenta nuevamente.');
        }
      } else {
        // ACTIVAR: programar nuevo seguimiento
        const seguimientoData: any = {
          remote_jid: remoteJid,
          tipo_lead: lead.estado || null,
          seguimientos_count: (seguimientosCount || 0) + 1
        };

        if (lead.ultima_interaccion) {
          seguimientoData.fecha_ultima_interaccion = lead.ultima_interaccion;
        } else if (lead.fechaContacto) {
          seguimientoData.fecha_ultima_interaccion = lead.fechaContacto;
        }

        // leads no tiene columna chatwoot_conversation_id: los seguimientos del CRM
        // se agendan sin conv_id y n8n lo resuelve contra Chatwoot al procesarlos
        const result = await programarSeguimiento(seguimientoData);

        if (result.success) {
          setTieneSeguimiento(true);
          if (result.actualizado) {
            alert('✅ Seguimiento actualizado exitosamente (fecha programada modificada)');
          } else {
            alert('✅ Seguimiento programado exitosamente para dentro de 23 horas');
            // Solo incrementar el contador si se creó un nuevo seguimiento
            const newCount = (seguimientosCount || 0) + 1;
            setSeguimientosCount(newCount);
            await updateLead(lead.id, { seguimientos_count: newCount });
          }

          // Recargar seguimiento pendiente en ambos casos
          const seguimientos = await getSeguimientosPendientes(remoteJid);
          if (seguimientos.length > 0) {
            const seguimiento = seguimientos[0];
            setSeguimientoPendiente(seguimiento);
            const fechaProgramada = seguimiento.fecha_programada || seguimiento.scheduled_at;
            if (fechaProgramada) {
              const date = new Date(fechaProgramada);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              setFechaProgramadaEdit(`${year}-${month}-${day}T${hours}:${minutes}`);
            }
          }
        } else {
          alert('❌ Error al programar el seguimiento. Intenta nuevamente.');
        }
      }
    } catch (error) {
      console.error('Error en handleSeguimientoToggle:', error);
      alert('❌ Error al procesar el seguimiento. Intenta nuevamente.');
    } finally {
      setIsUpdatingSeguimiento(false);
    }
  };

  // Función para guardar la fecha programada del seguimiento
  const handleSaveFechaProgramada = async () => {
    if (!seguimientoPendiente || !seguimientoPendiente.id || !fechaProgramadaEdit) {
      alert('Por favor ingresa una fecha y hora válida');
      return;
    }

    setIsSavingFechaProgramada(true);
    try {
      // El input datetime-local devuelve el formato "YYYY-MM-DDTHH:mm"
      // Necesitamos convertirlo a formato timestamp sin timezone (YYYY-MM-DD HH:mm:ss)
      // Sin convertir a UTC para evitar problemas de zona horaria
      const fechaLocal = new Date(fechaProgramadaEdit);
      
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
      
      const success = await actualizarFechaProgramada(
        seguimientoPendiente.id,
        fechaFormateada, // Enviar formato timestamp sin timezone
        seguimientoPendiente.tabla_origen
      );

      if (success) {
        // Actualizar el seguimiento local con la fecha ISO
        setSeguimientoPendiente({
          ...seguimientoPendiente,
          fecha_programada: fechaISO
        });
        setIsEditingFechaProgramada(false);
        alert('✅ Fecha programada actualizada exitosamente');
      } else {
        alert('❌ Error al actualizar la fecha programada');
      }
    } catch (error) {
      console.error('Error updating fecha programada:', error);
      alert('❌ Error al actualizar la fecha programada');
    } finally {
      setIsSavingFechaProgramada(false);
    }
  };

  // Función para formatear fecha y hora
  const formatDateTime = (dateString: string | undefined) => {
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
  
  // Función helper para normalizar números de teléfono (consistente con ChatList.js)
  const normalizePhoneNumber = (phone: string) => {
    if (!phone) return '';
    
    // Remover @s.whatsapp.net si existe
    let normalized = phone.replace('@s.whatsapp.net', '');
    
    // Remover prefijos comunes
    normalized = normalized.replace(/^WAID:/, '');
    normalized = normalized.replace(/^whatsapp:/, '');
    
    // Remover todo lo que no sean números y el símbolo +
    normalized = normalized.replace(/[^\d+]/g, '');
    
    // Remover + al inicio para comparación consistente (igual que ChatList.js)
    normalized = normalized.replace(/^\+/, '');
    
    return normalized;
  };

  // Activa o desactiva el agente para el lead actualizando leads.estado_chat en Supabase.
  // NOTA: El sidebar ya no escribe en los sets Redis JID. estado_chat es la única fuente de verdad
  // aquí. Si un flujo posterior necesita sincronizar Redis, debe agregarse explícitamente.
  // RIESGO ACEPTADO: updateLead puede disparar recalificación automática de Kanban (estado) si el lead
  // tiene chatwoot_conversation_id y está en frío/tibio/caliente (leadService.ts:1118-1149).
  const handleToggleAgente = async () => {
    if (!localLead) return;
    const currentEstadoChat = (localLead.estado_chat ?? 1);
    const next = currentEstadoChat === 0 ? 1 : 0;
    const capturedId = localLead.id;
    setIsUpdatingAgente(true);
    try {
      const updated = await updateLead(localLead.id, { estado_chat: next });
      if (updated && localLead.id === capturedId) {
        setLocalLead(prev => (prev ? { ...prev, estado_chat: next } : prev));
      } else if (!updated) {
        alert('Error al actualizar el estado del agente. Intenta nuevamente.');
      }
    } catch (e) {
      console.error('Error toggling agente:', e);
      alert('Error al actualizar el estado del agente.');
    } finally {
      setIsUpdatingAgente(false);
    }
  };

  if (!lead) return null;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-[500px] bg-background shadow-xl z-50 transform transition-transform duration-300 ease-in-out border-l flex flex-col",
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="p-6 border-b bg-card flex-shrink-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">
                  {lead.nombreCompleto || (lead as any).nombre || (lead as any).whatsapp_id}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={getStatusVariant(lead.estado) === 'custom' ? 'outline' : (getStatusVariant(lead.estado) as 'default' | 'destructive' | 'outline' | 'secondary')}
                  style={getStatusVariant(lead.estado) === 'custom' ? getStatusBadgeStyle(lead.estado) : {}}
                  className={getStatusVariant(lead.estado) === 'custom' ? 'border' : ''}
                >
                  {lead.estado}
                </Badge>
                {/* Chat Status Indicator */}
                {chatLoading ? (
                  <Badge variant="outline" className="text-xs">
                    <div className="animate-spin rounded-full h-2 w-2 border-b border-gray-400 mr-1"></div>
                    Consultando n8n...
                  </Badge>
                ) : (
                  <Badge 
                    variant={isChatActive ? "default" : "secondary"}
                    className={cn(
                      "text-xs",
                      isChatActive 
                        ? "bg-green-100 text-green-800 border-green-200" 
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    )}
                    title={source === 'n8n-webhook' ? 'Estado obtenido desde n8n webhook' : 'Estado local'}
                  >
                    {isChatActive ? (
                      <>
                        <Wifi className="h-3 w-3 mr-1" />
                        Chat Activo
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3 mr-1" />
                        Chat Inactivo
                      </>
                    )}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteLead}
                disabled={isDeletingLead}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                title="Eliminar lead"
              >
                {isDeletingLead ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Chat Status Details */}
          {!chatLoading && (
            <div className="mt-2 space-y-1">
              {lastActivity && (
                <div className="text-xs text-muted-foreground">
                  Última actividad: {new Intl.DateTimeFormat('es-AR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).format(lastActivity)}
                </div>
              )}
             
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="p-6 bg-muted/50 border-b flex-shrink-0">
          <div className="space-y-3">
            {/* Editar Lead */}
            {onEditLead && lead && (
              <Button 
                variant="default" 
                className="w-full"
                onClick={() => {
                  onEditLead(lead);
                  onClose();
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar Lead
              </Button>
            )}
            
            {/* Agente management */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px bg-border flex-1"></div>
                <span className="text-xs text-muted-foreground font-medium">Agente management</span>
                <div className="h-px bg-border flex-1"></div>
              </div>
              
              <div>
                {(localLead?.estado_chat ?? 1) !== 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleAgente}
                    disabled={isUpdatingAgente}
                    className="text-red-700 border-red-200 hover:bg-red-50 w-full"
                  >
                    {isUpdatingAgente ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-2"></div>
                    ) : (
                      <Minus className="h-4 w-4 mr-2" />
                    )}
                    Frenar agente
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleAgente}
                    disabled={isUpdatingAgente}
                    className="text-green-700 border-green-200 hover:bg-green-50 w-full"
                  >
                    {isUpdatingAgente ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 mr-2"></div>
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Activar agente
                  </Button>
                )}
              </div>
            </div>
            
            {/* Quick action buttons */}
            <div className="space-y-2">
              {/* Botón para activar/desactivar seguimiento */}
              <Button
                variant={tieneSeguimiento ? 'destructive' : 'default'}
                size="sm"
                onClick={handleSeguimientoToggle}
                disabled={isUpdatingSeguimiento || !((lead as any)?.whatsapp_id || lead?.telefono)}
                className="w-full"
              >
                {isUpdatingSeguimiento ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    {tieneSeguimiento ? 'Desactivar seguimiento' : 'Activar seguimiento'}
                  </>
                )}
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  Llamar
                </Button>
                
                {/* Chat Button */}
                {(() => {
                  const phoneNumber = normalizePhoneNumber(lead.telefono || (lead as any).whatsapp_id || '');
                  if (!phoneNumber || phoneNumber.length < 8) {
                    return (
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled
                        className="w-full"
                        title="No hay número de teléfono válido para este lead"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Sin número
                      </Button>
                    );
                  }
                  return (
                <Link 
                      href={`/chat?phoneNumber=${encodeURIComponent(phoneNumber)}`}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                      onClick={() => {
                        console.log('🔗 Redirigiendo al chat con número:', phoneNumber);
                        console.log('📋 Datos del lead:', {
                          telefono: lead.telefono,
                          whatsapp_id: (lead as any).whatsapp_id,
                          normalized: phoneNumber
                        });
                      }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {isChatActive ? 'Ir al Chat' : 'Abrir Chat'}
                </Link>
                  );
                })()}
              </div>
              
              {/* Refresh Lead Button — refetches all lead info from Supabase + chat status */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshLead}
                disabled={chatLoading || isRefreshingLead}
                className="w-full text-xs"
                title="Refresca toda la información del lead desde Supabase y el estado del chat"
              >
                {(chatLoading || isRefreshingLead) ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400 mr-2"></div>
                ) : (
                  <Wifi className="h-3 w-3 mr-2" />
                )}
                Refrescar Estado
              </Button>
            </div>
            
         
          </div>
        </div>
        
        {/* Scrollable content */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-6 space-y-6 pb-8">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Información de contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{(lead as any).whatsapp_id || lead.telefono}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Última interacción: {lead.ultima_interaccion ? formatDate(lead.ultima_interaccion) : formatDate(lead.fechaContacto)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Seguimientos:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={seguimientosCount}
                      onChange={(e) => setSeguimientosCount(Number(e.target.value))}
                      className="w-16 h-8 text-center text-sm"
                      disabled={isSavingSeguimientos}
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveSeguimientos}
                      disabled={isSavingSeguimientos || !lead}
                      className="h-8"
                    >
                      {isSavingSeguimientos ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      ) : (
                        'Guardar'
                      )}
                    </Button>
                  </div>
                </div>
                {/* Fecha programada del seguimiento pendiente */}
                {seguimientoPendiente && (
                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Fecha programada:</span>
                    </div>
                    {isEditingFechaProgramada ? (
                      <div className="space-y-2">
                        <Input
                          type="datetime-local"
                          value={fechaProgramadaEdit}
                          onChange={(e) => setFechaProgramadaEdit(e.target.value)}
                          className="h-8 text-sm"
                          disabled={isSavingFechaProgramada}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveFechaProgramada}
                            disabled={isSavingFechaProgramada || !fechaProgramadaEdit}
                            className="h-7 flex-1"
                          >
                            {isSavingFechaProgramada ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            ) : (
                              'Guardar'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsEditingFechaProgramada(false);
                              // Restaurar fecha original
                              const fechaProgramada = seguimientoPendiente.fecha_programada || seguimientoPendiente.scheduled_at;
                              if (fechaProgramada) {
                                const date = new Date(fechaProgramada);
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                const hours = String(date.getHours()).padStart(2, '0');
                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                setFechaProgramadaEdit(`${year}-${month}-${day}T${hours}:${minutes}`);
                              }
                            }}
                            disabled={isSavingFechaProgramada}
                            className="h-7 flex-1"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center justify-between p-2 bg-muted rounded-md cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => setIsEditingFechaProgramada(true)}
                        title="Click para editar fecha y hora"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {formatDateTime(seguimientoPendiente.fecha_programada || seguimientoPendiente.scheduled_at)}
                          </span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Producto de Interés - Destacada */}
            {lead.propiedad_interes && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-primary">
                    <Building className="h-5 w-5" />
                    Producto de Interés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-full">
                        <Building className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-primary text-lg">
                          {lead.propiedad_interes}
                        </p>
                        <p className="text-sm text-primary/70">
                          Producto consultado por el cliente
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Notes - Editable */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  className="w-full h-32 px-3 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="Agrega notas sobre este lead..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  disabled={isSavingNotas}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSaveNotas}
                    disabled={isSavingNotas || !lead}
                  >
                    {isSavingNotas ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      'Guardar Notas'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Observaciones antiguas (si existen y son diferentes de notas) */}
            {(lead.observaciones || (lead as any).propiedades_mostradas) && (
              (lead.observaciones || (lead as any).propiedades_mostradas) !== notas && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Observaciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
                    {lead.observaciones || (lead as any).propiedades_mostradas}
                  </div>
                </CardContent>
              </Card>
              )
            )}
            
            {/* Matching Properties */}
            {matchingProperties.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Productos Coincidentes
                    <Badge variant="secondary" className="ml-2">
                      {matchingProperties.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {matchingProperties.map(property => (
                    <Card key={property.id} className="border">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-sm font-medium truncate">{property.titulo}</CardTitle>
                          <Badge variant={property.estado === 'disponible' ? 'default' : 'secondary'} className="ml-2">
                            {property.estado}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{property.zona} - {property.direccion}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium">{formatCurrency(property.precio)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium capitalize">{property.tipo}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {property.superficie} m² · {property.ambientes} amb. · {property.dormitorios} dorm.
                          </div>
                          <Separator />
                          <div className="flex justify-end">
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="h-auto p-0 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                              }}
                            >
                              Ver producto
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default LeadDetailSidebar;
