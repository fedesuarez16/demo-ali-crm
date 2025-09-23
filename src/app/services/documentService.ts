import { createClient } from '@supabase/supabase-js';
import { PropertyDocument, DocumentFilterOptions } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

let supabaseClient: ReturnType<typeof createClient> | null = null;
const getSupabase = () => {
  if (supabaseClient) return supabaseClient;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars missing. Define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
};

// Local cache for client-side filtering
let cachedDocuments: PropertyDocument[] = [];

const parseNumberFromText = (text?: string): number | undefined => {
  if (!text) return undefined;
  const normalized = text.replace(/\./g, '').replace(/,/g, '.');
  const match = normalized.match(/\d+(?:[\.,]\d+)?/);
  if (!match) return undefined;
  const num = Number(match[0].replace(',', '.'));
  return isNaN(num) ? undefined : num;
};

const mapDocumentRow = (row: any): PropertyDocument => {
  return {
    id: String(row.id),
    tipo_de_propiedad: row.tipo_de_propiedad ?? row.tipo_propiedad ?? row.tipo ?? '',
    direccion: row.direccion ?? '',
    zona: row.zona ?? '',
    valor: row.valor ?? '',
    dormitorios: row.dormitorios ?? '',
    banos: row.banos ?? row.baños ?? '',
    patio_parque: row.patio_parque ?? '',
    garage: row.garage ?? '',
    mts_const: row.mts_const ?? '',
    lote: row.lote ?? '',
    piso: row.piso ?? '',
    link: row.link ?? '',
    columna_1: row.columna_1 ?? '',
    embedding: row.embedding ?? undefined,
    metadata: row.metadata ?? undefined,
    content: row.content ?? undefined,
    descripcion: row.descripcion ?? undefined,
  } as PropertyDocument;
};

export const getAllDocuments = async (): Promise<PropertyDocument[]> => {
  try {
    const { data, error } = await getSupabase()
      .from('documents')
      .select('*');
    if (error) {
      console.error('Error fetching documents from Supabase:', error.message);
      return [];
    }
    cachedDocuments = ((data as any[]) || []).map(mapDocumentRow);
    return cachedDocuments;
  } catch (e) {
    console.error('Supabase not configured or failed to initialize:', e);
    return [];
  }
};

export const filterDocuments = (filters: DocumentFilterOptions): PropertyDocument[] => {
  const source = cachedDocuments;
  return source.filter((doc) => {
    if (filters.zona && (doc.zona || '').toLowerCase() !== filters.zona.toLowerCase()) {
      return false;
    }
    if (filters.tipoDePropiedad && (doc.tipo_de_propiedad || '').toLowerCase() !== filters.tipoDePropiedad.toLowerCase()) {
      return false;
    }
    if (filters.valorMaximo) {
      const price = parseNumberFromText(doc.valor);
      if (price !== undefined && price > filters.valorMaximo) {
        return false;
      }
    }
    if (filters.dormitoriosMin) {
      const dormsText = doc.dormitorios ?? '';
      const dorms = parseNumberFromText(dormsText) ?? 0;
      if (dorms < filters.dormitoriosMin) {
        return false;
      }
    }
    if (filters.banosMin) {
      const banosText = doc.banos ?? '';
      const banos = parseNumberFromText(banosText) ?? 0;
      if (banos < filters.banosMin) {
        return false;
      }
    }
    return true;
  });
};

export const getUniqueDocumentZones = (): string[] => {
  const zones = new Set<string>();
  cachedDocuments.forEach(d => d.zona && zones.add(d.zona));
  return Array.from(zones).sort();
};

export const getUniqueDocumentTypes = (): string[] => {
  const types = new Set<string>();
  cachedDocuments.forEach(d => d.tipo_de_propiedad && types.add(d.tipo_de_propiedad));
  return Array.from(types).sort();
};

export const groupDocumentsByPropertyType = (docs: PropertyDocument[]): Record<string, PropertyDocument[]> => {
  const grouped: Record<string, PropertyDocument[]> = {};
  docs.forEach(doc => {
    const key = doc.tipo_de_propiedad || 'sin tipo';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(doc);
  });
  return grouped;
};


