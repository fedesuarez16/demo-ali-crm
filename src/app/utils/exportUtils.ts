import { Lead, PropertyDocument } from '../types';

/**
 * Convierte un array de leads a formato CSV y lo descarga
 * @param leads Array de leads a exportar
 * @param filename Nombre del archivo CSV (sin extensión)
 */
export const exportLeadsToCSV = (leads: Lead[], filename: string = 'leads'): void => {
  if (leads.length === 0) {
    alert('No hay leads para exportar');
    return;
  }

  // Cabeceras del CSV
  const headers = [
    'ID',
    'Nombre Completo',
    'Email',
    'Teléfono',
    'Estado',
    'Presupuesto',
    'Zona de Interés',
    'Tipo de Propiedad',
    'Superficie Mínima (m²)',
    'Cantidad de Ambientes',
    'Motivo de Interés',
    'Fecha de Contacto',
    'Observaciones'
  ];

  // Convertir cada lead a un array de valores
  const csvData = leads.map((lead) => [
    lead.id,
    lead.nombreCompleto,
    lead.email,
    lead.telefono,
    lead.estado,
    lead.presupuesto.toString(),
    lead.zonaInteres,
    lead.tipoPropiedad,
    lead.superficieMinima.toString(),
    lead.cantidadAmbientes.toString(),
    lead.motivoInteres,
    lead.fechaContacto,
    lead.observaciones || ''
  ]);

  // Agregar cabeceras al principio
  csvData.unshift(headers);

  // Convertir a string CSV
  const csvString = csvData
    .map((row) => 
      row.map((cell) => {
        // Escapar comillas y envolver en comillas si es necesario
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    )
    .join('\n');

  // Crear un blob y descargarlo
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; 

export const exportDocumentsToCSV = (docs: PropertyDocument[], filename: string = 'documents'): void => {
  if (docs.length === 0) {
    alert('No hay documentos para exportar');
    return;
  }

  const headers = [
    'id', 'tipo_de_propiedad', 'direccion', 'zona', 'valor', 'dormitorios', 'banos',
    'patio_parque', 'garage', 'mts_const', 'lote', 'piso', 'link', 'columna_1',
    'descripcion'
  ];

  const csvData = docs.map((d) => [
    d.id,
    d.tipo_de_propiedad ?? '',
    d.direccion ?? '',
    d.zona ?? '',
    d.valor ?? '',
    d.dormitorios ?? '',
    d.banos ?? '',
    d.patio_parque ?? '',
    d.garage ?? '',
    d.mts_const ?? '',
    d.lote ?? '',
    d.piso ?? '',
    d.link ?? '',
    d.columna_1 ?? '',
    d.descripcion ?? ''
  ]);

  csvData.unshift(headers);

  const csvString = csvData
    .map((row) =>
      row.map((cell) => {
        const value = String(cell ?? '');
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
    .join('\n');

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};