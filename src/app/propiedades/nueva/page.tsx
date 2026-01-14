'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../../components/AppLayout';
import { createPropiedad } from '../../services/propiedadesService';
import { SupabasePropiedad } from '../../types';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, MapPin, DollarSign, Bed, Bath, Car, Square, Layers, Link as LinkIcon, Building2 } from 'lucide-react';

export default function NewPropertyPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  
  const [propiedad, setPropiedad] = useState<Omit<SupabasePropiedad, 'id'>>({
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
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPropiedad({
      ...propiedad,
      [name]: value
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const newPropiedad = await createPropiedad(propiedad);
      if (newPropiedad) {
        router.push('/propiedades');
      } else {
        alert('Error al guardar la propiedad');
        setIsSaving(false);
      }
    } catch (error) {
      console.error('Error al guardar la propiedad:', error);
      alert('Error al guardar la propiedad');
      setIsSaving(false);
    }
  };
  
  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Nueva Propiedad</h1>
        <Link 
          href="/propiedades" 
          className="text-black hover:text-blac font-medium"
        >
          Volver a propiedades
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm">
        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[calc(100vh-200px)]">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipo_de_propiedad">Tipo de Propiedad</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="tipo_de_propiedad"
                          name="tipo_de_propiedad"
                          value={propiedad.tipo_de_propiedad}
                          onChange={handleChange}
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
                          name="direccion"
                          value={propiedad.direccion}
                          onChange={handleChange}
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
                          name="zona"
                          value={propiedad.zona}
                          onChange={handleChange}
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
                          name="valor"
                          value={propiedad.valor}
                          onChange={handleChange}
                          className="pl-10"
                          placeholder="USD 150,000"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dormitorios">Dormitorios</Label>
                      <div className="relative">
                        <Bed className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="dormitorios"
                          name="dormitorios"
                          value={propiedad.dormitorios}
                          onChange={handleChange}
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
                          name="banos"
                          value={propiedad.banos}
                          onChange={handleChange}
                          className="pl-10"
                          placeholder="1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="patio_parque">Patio/Parque</Label>
                      <Input
                        id="patio_parque"
                        name="patio_parque"
                        value={propiedad.patio_parque}
                        onChange={handleChange}
                        placeholder="Sí/No o metros"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="garage">Garage</Label>
                      <div className="relative">
                        <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="garage"
                          name="garage"
                          value={propiedad.garage}
                          onChange={handleChange}
                          className="pl-10"
                          placeholder="Sí/No o cantidad"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="mts_const">Metros Construidos</Label>
                      <div className="relative">
                        <Square className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="mts_const"
                          name="mts_const"
                          value={propiedad.mts_const}
                          onChange={handleChange}
                          className="pl-10"
                          placeholder="80"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lote">Lote</Label>
                      <Input
                        id="lote"
                        name="lote"
                        value={propiedad.lote}
                        onChange={handleChange}
                        placeholder="Metros de lote"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="piso">Piso</Label>
                      <div className="relative">
                        <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="piso"
                          name="piso"
                          value={propiedad.piso}
                          onChange={handleChange}
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
                          name="link"
                          type="url"
                          value={propiedad.link}
                          onChange={handleChange}
                          className="pl-10"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="columna_1">Columna 1</Label>
                      <Input
                        id="columna_1"
                        name="columna_1"
                        value={propiedad.columna_1}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="apto_banco">Apto Banco</Label>
                      <Input
                        id="apto_banco"
                        name="apto_banco"
                        value={propiedad.apto_banco}
                        onChange={handleChange}
                        placeholder="Sí/No"
                      />
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <div key={num} className="space-y-2">
                        <Label htmlFor={`alternativa_menor_${num}`}>
                          Lote {num}
                        </Label>
                        <textarea
                          id={num === 4 ? 'alterniva_menor_4' : `alternativa_menor_${num}`}
                          name={num === 4 ? 'alterniva_menor_4' : `alternativa_menor_${num}`}
                          value={num === 4 ? propiedad.alterniva_menor_4 : propiedad[`alternativa_menor_${num}` as keyof typeof propiedad] as string}
                          onChange={handleChange}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="alternativa_mayor">Lote 1</Label>
                      <textarea
                        id="alternativa_mayor"
                        name="alternativa_mayor"
                        value={propiedad.alternativa_mayor}
                        onChange={handleChange}
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
                          name={`alternativa_mayor_${num}`}
                          value={propiedad[`alternativa_mayor_${num}` as keyof typeof propiedad] as string}
                          onChange={handleChange}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          rows={4}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 pb-6">
                <Link href="/propiedades">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Link>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar Propiedad'}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </form>
      </div>
    </AppLayout>
  );
}
