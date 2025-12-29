import React, { useState, useEffect } from 'react';
import { SupabasePropiedad } from '../types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Save, Home, MapPin, DollarSign, Bed, Bath, Car, Square, Layers, Link as LinkIcon, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropiedadEditSidebarProps {
  propiedad: SupabasePropiedad | null; // null para crear nuevo
  onClose: () => void;
  onSave: (propiedadData: Partial<SupabasePropiedad>) => Promise<void>;
  isOpen: boolean;
}

const PropiedadEditSidebar: React.FC<PropiedadEditSidebarProps> = ({ 
  propiedad, 
  onClose, 
  onSave,
  isOpen 
}) => {
  const isNewPropiedad = !propiedad;
  
  const [formData, setFormData] = useState<Partial<SupabasePropiedad>>({
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

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar datos de la propiedad cuando se abre el sidebar
  useEffect(() => {
    if (propiedad) {
      setFormData({
        tipo_de_propiedad: propiedad.tipo_de_propiedad || '',
        direccion: propiedad.direccion || '',
        zona: propiedad.zona || '',
        valor: propiedad.valor || '',
        dormitorios: propiedad.dormitorios || '',
        banos: propiedad.banos || '',
        patio_parque: propiedad.patio_parque || '',
        garage: propiedad.garage || '',
        mts_const: propiedad.mts_const || '',
        lote: propiedad.lote || '',
        piso: propiedad.piso || '',
        link: propiedad.link || '',
        columna_1: propiedad.columna_1 || '',
        apto_banco: propiedad.apto_banco || '',
        alternativa_menor_1: propiedad.alternativa_menor_1 || '',
        alternativa_menor_2: propiedad.alternativa_menor_2 || '',
        alternativa_menor_3: propiedad.alternativa_menor_3 || '',
        alterniva_menor_4: propiedad.alterniva_menor_4 || '',
        alternativa_menor_5: propiedad.alternativa_menor_5 || '',
        alternativa_mayor: propiedad.alternativa_mayor || '',
        alternativa_mayor_2: propiedad.alternativa_mayor_2 || '',
        alternativa_mayor_3: propiedad.alternativa_mayor_3 || '',
        alternativa_mayor_4: propiedad.alternativa_mayor_4 || '',
        alternativa_mayor_5: propiedad.alternativa_mayor_5 || '',
      });
    } else {
      // Reset para nueva propiedad
      setFormData({
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
    }
    setErrors({});
  }, [propiedad, isOpen]);

  const handleChange = (field: keyof SupabasePropiedad, value: any) => {
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving propiedad:', error);
      alert('Error al guardar la propiedad. Por favor intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isSaving) return;
    
    // Preguntar si hay cambios sin guardar
    const hasChanges = propiedad ? JSON.stringify(formData) !== JSON.stringify({
      tipo_de_propiedad: propiedad.tipo_de_propiedad || '',
      direccion: propiedad.direccion || '',
      zona: propiedad.zona || '',
      valor: propiedad.valor || '',
      dormitorios: propiedad.dormitorios || '',
      banos: propiedad.banos || '',
      patio_parque: propiedad.patio_parque || '',
      garage: propiedad.garage || '',
      mts_const: propiedad.mts_const || '',
      lote: propiedad.lote || '',
      piso: propiedad.piso || '',
      link: propiedad.link || '',
      columna_1: propiedad.columna_1 || '',
      apto_banco: propiedad.apto_banco || '',
      alternativa_menor_1: propiedad.alternativa_menor_1 || '',
      alternativa_menor_2: propiedad.alternativa_menor_2 || '',
      alternativa_menor_3: propiedad.alternativa_menor_3 || '',
      alterniva_menor_4: propiedad.alterniva_menor_4 || '',
      alternativa_menor_5: propiedad.alternativa_menor_5 || '',
      alternativa_mayor: propiedad.alternativa_mayor || '',
      alternativa_mayor_2: propiedad.alternativa_mayor_2 || '',
      alternativa_mayor_3: propiedad.alternativa_mayor_3 || '',
      alternativa_mayor_4: propiedad.alternativa_mayor_4 || '',
      alternativa_mayor_5: propiedad.alternativa_mayor_5 || '',
    }) : Object.values(formData).some(val => val !== '');

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
          "fixed top-0 right-0 h-full w-[600px] bg-background shadow-xl z-50 transform transition-transform duration-300 ease-in-out border-l",
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="p-6 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Home className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                {isNewPropiedad ? 'Nueva Propiedad' : 'Editar Propiedad'}
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
                  <Home className="h-4 w-4" />
                  Información Básica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_de_propiedad">Tipo de Propiedad</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="tipo_de_propiedad"
                        value={formData.tipo_de_propiedad}
                        onChange={(e) => handleChange('tipo_de_propiedad', e.target.value)}
                        className="pl-10"
                        placeholder="Departamento, Casa, etc."
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="direccion">Dirección</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="direccion"
                        value={formData.direccion}
                        onChange={(e) => handleChange('direccion', e.target.value)}
                        className="pl-10"
                        placeholder="Calle y número"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zona">Zona</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="zona"
                        value={formData.zona}
                        onChange={(e) => handleChange('zona', e.target.value)}
                        className="pl-10"
                        placeholder="Palermo, Recoleta, etc."
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="valor"
                        value={formData.valor}
                        onChange={(e) => handleChange('valor', e.target.value)}
                        className="pl-10"
                        placeholder="USD 150,000"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dormitorios">Dormitorios</Label>
                      <div className="relative">
                        <Bed className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="dormitorios"
                          value={formData.dormitorios}
                          onChange={(e) => handleChange('dormitorios', e.target.value)}
                          className="pl-10"
                          placeholder="2"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="banos">Baños</Label>
                      <div className="relative">
                        <Bath className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="banos"
                          value={formData.banos}
                          onChange={(e) => handleChange('banos', e.target.value)}
                          className="pl-10"
                          placeholder="1"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="patio_parque">Patio/Parque</Label>
                    <Input
                      id="patio_parque"
                      value={formData.patio_parque}
                      onChange={(e) => handleChange('patio_parque', e.target.value)}
                      placeholder="Sí/No o metros"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="garage">Garage</Label>
                    <div className="relative">
                      <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="garage"
                        value={formData.garage}
                        onChange={(e) => handleChange('garage', e.target.value)}
                        className="pl-10"
                        placeholder="Sí/No o cantidad"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mts_const">Metros Construidos</Label>
                      <div className="relative">
                        <Square className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="mts_const"
                          value={formData.mts_const}
                          onChange={(e) => handleChange('mts_const', e.target.value)}
                          className="pl-10"
                          placeholder="80"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lote">Lote</Label>
                      <Input
                        id="lote"
                        value={formData.lote}
                        onChange={(e) => handleChange('lote', e.target.value)}
                        placeholder="Metros de lote"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="piso">Piso</Label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="piso"
                        value={formData.piso}
                        onChange={(e) => handleChange('piso', e.target.value)}
                        className="pl-10"
                        placeholder="5"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="link">Link</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="link"
                        type="url"
                        value={formData.link}
                        onChange={(e) => handleChange('link', e.target.value)}
                        className="pl-10"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="columna_1">Columna 1</Label>
                      <Input
                        id="columna_1"
                        value={formData.columna_1}
                        onChange={(e) => handleChange('columna_1', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="apto_banco">Apto Banco</Label>
                      <Input
                        id="apto_banco"
                        value={formData.apto_banco}
                        onChange={(e) => handleChange('apto_banco', e.target.value)}
                        placeholder="Sí/No"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alternativas menores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Alternativas Menores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <div key={num} className="space-y-2">
                      <Label htmlFor={`alternativa_menor_${num}`}>
                        Lote {num}
                      </Label>
                      <textarea
                        id={num === 4 ? 'alterniva_menor_4' : `alternativa_menor_${num}`}
                        value={num === 4 ? formData.alterniva_menor_4 : formData[`alternativa_menor_${num}` as keyof typeof formData] as string}
                        onChange={(e) => handleChange(
                          (num === 4 ? 'alterniva_menor_4' : `alternativa_menor_${num}`) as keyof SupabasePropiedad,
                          e.target.value
                        )}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        rows={4}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alternativas mayores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Alternativas Mayores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="alternativa_mayor">Lote 1</Label>
                    <textarea
                      id="alternativa_mayor"
                      value={formData.alternativa_mayor}
                      onChange={(e) => handleChange('alternativa_mayor', e.target.value)}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      rows={4}
                    />
                  </div>
                  {[2, 3, 4, 5].map((num) => (
                    <div key={num} className="space-y-2">
                      <Label htmlFor={`alternativa_mayor_${num}`}>
                        Lote {num}
                      </Label>
                      <textarea
                        id={`alternativa_mayor_${num}`}
                        value={formData[`alternativa_mayor_${num}` as keyof typeof formData] as string}
                        onChange={(e) => handleChange(`alternativa_mayor_${num}` as keyof SupabasePropiedad, e.target.value)}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        rows={4}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default PropiedadEditSidebar;



