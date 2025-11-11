import React, { useState } from 'react';
import Link from 'next/link';
import { Lead, Property } from '../types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, MessageSquare, Phone, Mail, Calendar, ChevronDown, MapPin, DollarSign, Home, User, Clock, FileText, Building, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { programarMensaje } from '../services/mensajeService';

interface LeadDetailSidebarProps {
  lead: Lead | null;
  onClose: () => void;
  matchingProperties: Property[];
  isOpen: boolean;
  onEditLead?: (lead: Lead) => void;
}

const LeadDetailSidebar: React.FC<LeadDetailSidebarProps> = ({ 
  lead, 
  onClose, 
  matchingProperties, 
  isOpen,
  onEditLead
}) => {
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [messageForm, setMessageForm] = useState({
    canal: '',
    fechaHora: '',
    plantilla: '',
    mensajePersonalizado: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  const toggleMessageMenu = () => {
    setShowMessageMenu(!showMessageMenu);
    // Reset form when opening
    if (!showMessageMenu) {
      setMessageForm({
        canal: '',
        fechaHora: '',
        plantilla: '',
        mensajePersonalizado: ''
      });
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setMessageForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getMensajePlantilla = (plantilla: string): string => {
    const templates: Record<string, string> = {
      inicial: `Hola ${lead?.nombreCompleto}, como estas? Retomo contacto para consultarte que te parecieron las propiedades que te envie y si se adecuan a tu busqueda.`,
      comercial: `Hola ${lead?.nombreCompleto}, tengo una excelente oportunidad inmobiliaria en ${lead?.zonaInteres} que se ajusta a tu presupuesto de ${lead ? formatCurrency(lead.presupuesto) : ''}. ¿Podemos coordinar una visita?`,
      recordatorio: `Hola ${lead?.nombreCompleto}, te escribo para recordarte nuestra cita programada. ¿Sigues disponible para la visita?`,
      personalizado: ''
    };
    return templates[plantilla] || '';
  };

  // Función helper para normalizar números de teléfono
  const normalizePhoneNumber = (phone: string) => {
    if (!phone) return '';
    // Remover todo lo que no sean números y el símbolo +
    return phone.replace(/[^\d+]/g, '');
  };

  const handleProgramarMensaje = async () => {
    if (!lead || !messageForm.canal || !messageForm.fechaHora) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const mensaje = messageForm.plantilla === 'personalizado' 
        ? messageForm.mensajePersonalizado 
        : getMensajePlantilla(messageForm.plantilla);

      if (!mensaje.trim()) {
        alert('Por favor ingresa un mensaje');
        setIsSubmitting(false);
        return;
      }

      const remoteJid = (lead as any).whatsapp_id || lead.telefono || lead.email;
      
      const success = await programarMensaje({
        remote_jid: remoteJid,
        mensaje: mensaje,
        scheduled_at: messageForm.fechaHora
      });

      if (success) {
        alert('Mensaje programado exitosamente');
        setShowMessageMenu(false);
        setMessageForm({
          canal: '',
          fechaHora: '',
          plantilla: '',
          mensajePersonalizado: ''
        });
      } else {
        alert('Error al programar el mensaje. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error programando mensaje:', error);
      alert('Error al programar el mensaje. Intenta nuevamente.');
    }
    
    setIsSubmitting(false);
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
          "fixed top-0 right-0 h-full w-[500px] bg-background shadow-xl z-50 transform transition-transform duration-300 ease-in-out border-l",
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="p-6 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">
                  {lead.nombreCompleto || (lead as any).nombre || (lead as any).whatsapp_id}
                </h3>
              </div>
              <Badge variant={getStatusVariant(lead.estado)}>
                {lead.estado}
              </Badge>
            </div>
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
        
        {/* Action buttons */}
        <div className="p-6 bg-muted/50 border-b">
          <div className="grid grid-cols-2 gap-3">
            {/* Editar Lead */}
            {onEditLead && lead && (
              <Button 
                variant="default" 
                className="col-span-2"
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
            
            {/* Message menu */}
            <div className="relative col-span-2">
              <Button 
                variant="outline" 
                className="w-full justify-between"
                onClick={toggleMessageMenu}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Programar mensaje
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
              
              {/* Dropdown menu */}
              {showMessageMenu && (
                <Card className="absolute z-20 mt-2 w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Programar mensaje
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="canal" className="text-xs font-medium">Canal *</Label>
                      <Select value={messageForm.canal} onValueChange={(value) => handleFormChange('canal', value)}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Seleccionar canal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="datetime" className="text-xs font-medium">Fecha y hora *</Label>
                      <Input 
                        type="datetime-local" 
                        className="h-8" 
                        value={messageForm.fechaHora}
                        onChange={(e) => handleFormChange('fechaHora', e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="template" className="text-xs font-medium">Plantilla *</Label>
                      <Select value={messageForm.plantilla} onValueChange={(value) => handleFormChange('plantilla', value)}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Seleccionar plantilla" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inicial">Seguimiento inicial</SelectItem>
                          <SelectItem value="comercial">Propuesta comercial</SelectItem>
                          <SelectItem value="recordatorio">Recordatorio de cita</SelectItem>
                          <SelectItem value="personalizado">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Preview del mensaje */}
                    {messageForm.plantilla && messageForm.plantilla !== 'personalizado' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Vista previa del mensaje:</Label>
                        <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground border">
                          {getMensajePlantilla(messageForm.plantilla)}
                        </div>
                      </div>
                    )}

                    {/* Campo de mensaje personalizado */}
                    {messageForm.plantilla === 'personalizado' && (
                      <div className="space-y-2">
                        <Label htmlFor="mensaje" className="text-xs font-medium">Mensaje personalizado *</Label>
                        <textarea
                          className="w-full h-20 px-3 py-2 text-xs border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                          placeholder="Escribe tu mensaje personalizado..."
                          value={messageForm.mensajePersonalizado}
                          onChange={(e) => handleFormChange('mensajePersonalizado', e.target.value)}
                        />
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={toggleMessageMenu}
                        disabled={isSubmitting}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleProgramarMensaje}
                        disabled={isSubmitting || !messageForm.canal || !messageForm.fechaHora || !messageForm.plantilla}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                            Programando...
                          </>
                        ) : (
                          <>
                            <Send className="h-3 w-3 mr-2" />
                            Programar
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Quick action buttons */}
            <Button variant="outline" size="sm">
              <Phone className="h-4 w-4 mr-2" />
              Llamar
            </Button>
            
            {/* Chat Button */}
            <Link 
              href={`/chat?phoneNumber=${encodeURIComponent(normalizePhoneNumber(lead.telefono || (lead as any).whatsapp_id || ''))}`}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat
            </Link>
            
         
          </div>
        </div>
        
        {/* Scrollable content */}
        <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
          <div className="p-6 space-y-6">
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
              </CardContent>
            </Card>
            
            {/* Propiedad de Interés - Destacada */}
            {lead.propiedad_interes && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-primary">
                    <Building className="h-5 w-5" />
                    Propiedad de Interés
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
                          Propiedad consultada por el cliente
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Interests */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Intereses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Presupuesto:</span>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{formatCurrency(Number(lead.presupuesto ?? 0))}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Zona:</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{lead.zonaInteres || (lead as any).zona}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tipo de propiedad:</span>
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{(lead as any).tipo_propiedad || (lead as any).tipoPropiedad || lead.tipoPropiedad}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Intención:</span>
                  <span className="text-sm font-medium">{(lead as any).intencion || (lead as any).motivoInteres || lead.motivoInteres}</span>
                </div>
                {(lead as any).forma_pago && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Forma de pago:</span>
                    <span className="text-sm font-medium">{(lead as any).forma_pago}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Requerimientos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Características buscadas:</span>
                  <span className="text-sm font-medium text-right max-w-[250px]">
                    {(lead as any).caracteristicas_buscadas || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Características de venta:</span>
                  <span className="text-sm font-medium text-right max-w-[250px]">
                    {(lead as any).caracteristicas_venta || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Superficie mínima:</span>
                  <span className="text-sm font-medium">
                    {lead.superficieMinima ? `${lead.superficieMinima} m²` : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cantidad de ambientes:</span>
                  <span className="text-sm font-medium">
                    {lead.cantidadAmbientes || '-'}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            {/* Notes */}
            {(lead.observaciones || (lead as any).propiedades_mostradas) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
                    {lead.observaciones || (lead as any).propiedades_mostradas}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Matching Properties */}
            {matchingProperties.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Propiedades Coincidentes
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
                              Ver propiedad
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
