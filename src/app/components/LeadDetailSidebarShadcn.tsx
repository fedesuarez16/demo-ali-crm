import React, { useState } from 'react';
import { Lead, Property } from '../types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, MessageSquare, Phone, Mail, Calendar, ChevronDown, MapPin, DollarSign, Home, User, Clock, FileText, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadDetailSidebarProps {
  lead: Lead | null;
  onClose: () => void;
  matchingProperties: Property[];
  isOpen: boolean;
}

const LeadDetailSidebar: React.FC<LeadDetailSidebarProps> = ({ 
  lead, 
  onClose, 
  matchingProperties, 
  isOpen 
}) => {
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  
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
                    <CardTitle className="text-sm">Programar mensaje</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="canal" className="text-xs">Canal</Label>
                      <Select>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Seleccionar canal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="llamada">Llamada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="datetime" className="text-xs">Fecha y hora</Label>
                      <Input type="datetime-local" className="h-8" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template" className="text-xs">Plantilla</Label>
                      <Select>
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
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={toggleMessageMenu}>
                        Cancelar
                      </Button>
                      <Button size="sm">
                        Programar
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
            
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
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
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.email}</span>
                </div>
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
