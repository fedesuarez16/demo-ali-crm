// Vocabularios cerrados para los campos que participan en el matching de búsquedas.
// Si cambiás estas listas, también ajustá las propiedades existentes en Supabase
// que tengan valores fuera de la lista — al editarlas se conservan, pero al armar
// una búsqueda la coincidencia falla si no comparten un valor exacto / contenido.

export const TIPO_DE_PROPIEDAD_OPCIONES = [
  'Casa',
  'Departamento',
  'PH',
  'Lote',
  'Terreno',
  'Local',
  'Oficina',
  'Galpón',
  'Cochera',
] as const;

export const ZONA_OPCIONES = [
  'La Plata',
  'City Bell',
  'Villa Elisa',
  'Manuel Gonnet',
  'Gonnet',
  'Tolosa',
  'Los Hornos',
  'San Carlos',
  'Don Carlos',
  'Brandsen',
  'Hudson',
  'Quilmes',
  'Berazategui',
  'Pilar',
  'Palermo',
  'Monserrat',
] as const;

export const PATIO_PARQUE_OPCIONES = ['Sí', 'No', 'Patio', 'Parque', 'Jardín'] as const;

export const GARAGE_OPCIONES = ['Sí', 'No', '1', '2', '3+'] as const;

export const APTO_BANCO_OPCIONES = ['Sí', 'No'] as const;

export type PropiedadDropdownField =
  | 'tipo_de_propiedad'
  | 'zona'
  | 'patio_parque'
  | 'garage'
  | 'apto_banco';

export const PROPIEDAD_DROPDOWN_OPCIONES: Record<PropiedadDropdownField, readonly string[]> = {
  tipo_de_propiedad: TIPO_DE_PROPIEDAD_OPCIONES,
  zona: ZONA_OPCIONES,
  patio_parque: PATIO_PARQUE_OPCIONES,
  garage: GARAGE_OPCIONES,
  apto_banco: APTO_BANCO_OPCIONES,
};
