import React, { useState, useEffect, useMemo } from 'react';
import { Lead, LeadStatus, PropertyType, InterestReason } from '../types';
import { getKanbanColumns, getDistinctLeadEstados, canonicalEstado } from '../services/columnService';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Save, User, Mail, Phone, DollarSign, MapPin, Home, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadEditSidebarProps {
  lead: Lead | null; // null para crear nuevo
  onClose: () => void;
  onSave: (leadData: Partial<Lead>) => Promise<void>;
  isOpen: boolean;
}

const LeadEditSidebar: React.FC<LeadEditSidebarProps> = ({ 
  lead, 
  onClose, 
  onSave,
  isOpen 
}) => {
  const isNewLead = !lead;
  
  const [formData, setFormData] = useState<Partial<Lead>>({
    nombreCompleto: '',
    email: '',
    telefono: '',
    estado: 'inicial',
    presupuesto: 0,
    zonaInteres: '',
    tipoPropiedad: 'departamento',
    superficieMinima: 0,
    cantidadAmbientes: 0,
    motivoInteres: 'otro',
    observaciones: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [estadoOptions, setEstadoOptions] = useState<string[]>([
    'inicial',
    'frío',
    'tibio',
    'caliente',
    'llamada',
    'visita',
  ]);
  const [estadoColors, setEstadoColors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ customColumns, columnColors }, distinctLeadEstados] = await Promise.all([
          getKanbanColumns(),
          getDistinctLeadEstados(),
        ]);
        if (cancelled) return;

        const BASE_STATES = ['frío', 'tibio', 'caliente', 'llamada', 'visita'];

        const baseCanonical = BASE_STATES
          .map(v => canonicalEstado(v))
          .filter((v): v is string => !!v);

        const customsCanonical = (customColumns || [])
          .map(v => canonicalEstado(v))
          .filter((v): v is string => !!v);

        const baseSet = new Set(baseCanonical);
        const customsSet = new Set(customsCanonical);

        const orphansCanonical = (distinctLeadEstados || [])
          .map(v => canonicalEstado(v))
          .filter((v): v is string => !!v)
          .filter(v => !baseSet.has(v) && !customsSet.has(v))
          .sort((a, b) => a.localeCompare(b));

        const merged = [...baseCanonical, ...customsCanonical, ...orphansCanonical];

        const seen = new Set<string>();
        const deduped = merged.filter(v => {
          if (seen.has(v)) return false;
          seen.add(v);
          return true;
        });

        setEstadoOptions(deduped);
        setEstadoColors(columnColors || {});
      } catch (err) {
        console.error('Error cargando columnas del kanban:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const ESTADO_LABELS: Record<string, string> = {
    inicial: '🆕 Inicial',
    'frío': '❄️ Frío',
    tibio: '🌤️ Tibio',
    caliente: '🔥 Caliente',
    llamada: '📞 Llamada',
    visita: '👁️ Visita',
  };

  const renderedEstadoOptions = useMemo(() => {
    const opts = [...estadoOptions];
    const currentCanonical = canonicalEstado(formData.estado || '');
    if (currentCanonical && !opts.includes(currentCanonical)) {
      opts.unshift(currentCanonical);
    } else if (formData.estado && !currentCanonical && !opts.includes(formData.estado)) {
      // Fallback: keep raw if it doesn't canonicalize (defensive)
      opts.unshift(formData.estado);
    }
    if (isNewLead && !opts.includes('inicial')) {
      opts.unshift('inicial');
    }
    const seen = new Set<string>();
    return opts.filter(v => !!v && !seen.has(v) && !!seen.add(v));
  }, [estadoOptions, formData.estado, isNewLead]);

  const formatEstadoLabel = (value: string): React.ReactNode => {
    const known = ESTADO_LABELS[value];
    if (known) return known;
    const color = estadoColors[value];
    const label = value.charAt(0).toUpperCase() + value.slice(1);
    return (
      <span className="inline-flex items-center gap-2">
        {color && (
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border border-black/10"
            style={{ backgroundColor: color }}
          />
        )}
        {label}
      </span>
    );
  };

  // Cargar datos del lead cuando se abre el sidebar
  useEffect(() => {
    if (lead) {
      setFormData({
        nombreCompleto: lead.nombreCompleto || '',
        email: lead.email || '',
        telefono: lead.telefono || '',
        estado: lead.estado,
        presupuesto: lead.presupuesto || 0,
        zonaInteres: lead.zonaInteres || '',
        tipoPropiedad: lead.tipoPropiedad,
        superficieMinima: lead.superficieMinima || 0,
        cantidadAmbientes: lead.cantidadAmbientes || 0,
        motivoInteres: lead.motivoInteres,
        observaciones: lead.observaciones || '',
      });
    } else {
      // Reset para nuevo lead
      setFormData({
        nombreCompleto: '',
        email: '',
        telefono: '',
        estado: 'inicial',
        presupuesto: 0,
        zonaInteres: '',
        tipoPropiedad: 'departamento',
        superficieMinima: 0,
        cantidadAmbientes: 0,
        motivoInteres: 'otro',
        observaciones: '',
      });
    }
    setErrors({});
  }, [lead, isOpen]);

  const handleChange = (field: keyof Lead, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando se modifica
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar formato de email solo si se proporciona
    if (formData.email && formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Error al guardar el lead. Por favor intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isSaving) return;
    
    // Preguntar si hay cambios sin guardar
    const hasChanges = lead ? JSON.stringify(formData) !== JSON.stringify({
      nombreCompleto: lead.nombreCompleto,
      email: lead.email,
      telefono: lead.telefono,
      estado: lead.estado,
      presupuesto: lead.presupuesto,
      zonaInteres: lead.zonaInteres,
      tipoPropiedad: lead.tipoPropiedad,
      superficieMinima: lead.superficieMinima,
      cantidadAmbientes: lead.cantidadAmbientes,
      motivoInteres: lead.motivoInteres,
      observaciones: lead.observaciones || '',
    }) : Object.values(formData).some(val => val !== '' && val !== 0 && val !== 'inicial' && val !== 'departamento' && val !== 'otro');

    if (hasChanges) {
      if (confirm('¿Descartar cambios?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40" 
          onClick={handleCancel}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-[500px] bg-background shadow-xl z-50 transform transition-transform duration-300 ease-in-out border-l",
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="p-6 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                {isNewLead ? 'Nuevo Lead' : 'Editar Lead'}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              disabled={isSaving}
              className="hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="p-6 bg-muted/50 border-b flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancelar
          </Button>
        </div>
        
        {/* Scrollable content */}
        <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
          <div className="p-6 space-y-6">
            {/* Información básica */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Información Básica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombreCompleto">
                    Nombre Completo
                  </Label>
                  <Input
                    id="nombreCompleto"
                    value={formData.nombreCompleto}
                    onChange={(e) => handleChange('nombreCompleto', e.target.value)}
                    placeholder="Juan Pérez"
                    className={errors.nombreCompleto ? 'border-red-500' : ''}
                  />
                  {errors.nombreCompleto && (
                    <p className="text-xs text-red-500">{errors.nombreCompleto}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">
                    WhatsApp ID
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => handleChange('telefono', e.target.value)}
                      placeholder="5491112345678 o +54 9 11 1234-5678"
                      className={`pl-10 ${errors.telefono ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.telefono && (
                    <p className="text-xs text-red-500">{errors.telefono}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    El ID de WhatsApp del contacto
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select 
                    value={formData.estado} 
                    onValueChange={(value) => handleChange('estado', value as LeadStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {renderedEstadoOptions.map((value) => (
                        <SelectItem key={value} value={value}>
                          {formatEstadoLabel(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Preferencias de búsqueda */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Preferencias de Búsqueda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="zonaInteres">
                    Zona de Interés
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="zonaInteres"
                      value={formData.zonaInteres}
                      onChange={(e) => handleChange('zonaInteres', e.target.value)}
                      placeholder="Palermo, Recoleta, etc."
                      className={`pl-10 ${errors.zonaInteres ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.zonaInteres && (
                    <p className="text-xs text-red-500">{errors.zonaInteres}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoPropiedad">Tipo de Propiedad</Label>
                  <Select 
                    value={formData.tipoPropiedad} 
                    onValueChange={(value) => handleChange('tipoPropiedad', value as PropertyType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="departamento">🏢 Departamento</SelectItem>
                      <SelectItem value="casa">🏠 Casa</SelectItem>
                      <SelectItem value="PH">🏘️ PH</SelectItem>
                      <SelectItem value="terreno">🌍 Terreno</SelectItem>
                      <SelectItem value="local">🏪 Local</SelectItem>
                    </SelectContent>
                  </Select>
                </div>


                <div className="space-y-2">
                  <Label htmlFor="presupuesto">Presupuesto (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="presupuesto"
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.presupuesto}
                      onChange={(e) => handleChange('presupuesto', parseInt(e.target.value) || 0)}
                      placeholder="150000"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivoInteres">Intención</Label>
                  <Select 
                    value={formData.motivoInteres} 
                    onValueChange={(value) => handleChange('motivoInteres', value as InterestReason)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar intención" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compra">🏠 Compra</SelectItem>
                      <SelectItem value="venta">💰 Venta</SelectItem>
                      <SelectItem value="alquiler">📋 Alquiler</SelectItem>
                      <SelectItem value="inversión">💼 Inversión</SelectItem>
                      <SelectItem value="otro">📋 Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Características Buscadas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Características Buscadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => handleChange('observaciones', e.target.value)}
                  placeholder="Detalles sobre lo que busca el lead..."
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default LeadEditSidebar;

