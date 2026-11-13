export type LeadStatus = 'frío' | 'tibio' | 'caliente' | 'llamada' | 'visita' | 'inicial' | string; // Permite estados personalizados

export type PropertyType = 'departamento' | 'casa' | 'PH' | 'terreno' | 'local';

export type InterestReason = 'inversión' | 'mudanza' | 'primera vivienda' | 'otro';

export interface Lead {
  id: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  estado: LeadStatus;
  presupuesto: number;
  zonaInteres: string;
  tipoPropiedad: PropertyType;
  superficieMinima: number;
  cantidadAmbientes: number;
  motivoInteres: InterestReason;
  fechaContacto: string;
  observaciones?: string;
  // Campos opcionales provenientes del esquema de Supabase
  whatsapp_id?: string;
  nombre?: string;
  zona?: string;
  tipo_propiedad?: string;
  forma_pago?: string;
  intencion?: string;
  caracteristicas_buscadas?: string;
  caracteristicas_venta?: string;
  propiedades_mostradas?: string;
  propiedad_interes?: string;
  ultima_interaccion?: string;
  created_at?: string;
  updated_at?: string;
  seguimientos_count?: number;
  notas?: string;
  estado_chat?: number; // Estado del chat: 1 = activo, 0 = inactivo (independiente del estado del lead)
  toque_register?: string; // Registro de toque: Gen100 | Gen300 | Gen400
  chatwoot_conversation_id?: number; // ID de la conversación en Chatwoot para calificación automática
  info_actualizada_at?: string; // Última re-extracción con LLM desde la conversación (POST /api/leads/[id]/reanalizar)
  resumen_conversacion?: string; // Resumen de la conversación generado por LLM (POST /api/leads/[id]/reanalizar)
  calificacion_auto?: boolean; // true = el calificador LLM lo mueve de columna aunque esté en una columna humana (POST /api/leads/[id]/calificar)
}

export interface FilterOptions {
  zona?: string;
  presupuestoMaximo?: number;
  tipoPropiedad?: PropertyType;
  estado?: LeadStatus;
  cantidadAmbientesMinima?: number;
  motivoInteres?: InterestReason;
  propiedadInteres?: string; // Filtrar por campaña de propiedad
}

// Nuevos tipos para propiedades inmobiliarias

export type PropertyStatus = 'disponible' | 'reservada' | 'vendida' | 'alquilada';

export type PropertyOperation = 'venta' | 'alquiler' | 'venta/alquiler';

export interface Property {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: PropertyType;
  operacion: PropertyOperation;
  estado: PropertyStatus;
  precio: number;
  moneda: 'USD' | 'ARS';
  direccion: string;
  zona: string;
  superficie: number; // en metros cuadrados
  ambientes: number;
  dormitorios: number;
  banos: number;
  cochera: boolean;
  cocherasCount?: number;
  antiguedad?: number; // en años
  orientacion?: string;
  amenities: string[];
  imagenes: string[];
  destacada: boolean;
  fechaPublicacion: string;
}

// Tipos para automatizaciones de mensajes
export type NodeType = 'trigger' | 'action' | 'condition' | 'delay' | 'message';

export interface Position {
  x: number;
  y: number;
}

export interface NodeData {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  icon?: string;
  position: Position;
  data: any;
}

export interface NodeConnection {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
  label?: string;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  active: boolean;
  nodes: NodeData[];
  connections: NodeConnection[];
  createdAt: string;
  updatedAt: string;
}

export interface TriggerNodeData {
  eventType: string;
  conditions: Record<string, any>;
}

export interface MessageNodeData {
  messageTemplate: string;
  variables: Record<string, string>;
  channel: 'email' | 'sms' | 'whatsapp' | 'notificacion';
}

export interface ConditionNodeData {
  condition: string;
  comparator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_contains';
  value: string | number | boolean;
}

export interface DelayNodeData {
  delayTime: number;
  timeUnit: 'seconds' | 'minutes' | 'hours' | 'days';
}

export interface ActionNodeData {
  actionType: string;
  parameters: Record<string, any>;
} 

// Tipos para documentos (propiedades provenientes de la tabla "documents")
export interface PropertyDocument {
  id: string; // uuid
  tipo_de_propiedad: string; // text
  direccion: string; // text
  zona: string; // text
  valor: string; // text (podría incluir símbolo/moneda)
  dormitorios: string; // text
  banos: string; // text
  patio_parque: string; // text
  garage: string; // text
  mts_const: string; // text
  lote: string; // text
  piso: string; // text
  link: string; // text
  columna_1: string; // text
  embedding?: string; // public.vector(1536) serializado
  metadata?: any; // jsonb
  content?: string; // text
  descripcion?: string; // text
}

export interface DocumentFilterOptions {
  zona?: string;
  tipoDePropiedad?: string;
  valorMaximo?: number; // Parseado desde string "valor" si contiene número
  dormitoriosMin?: number;
  banosMin?: number;
}

// Tipo para la tabla propiedades de Supabase
export interface SupabasePropiedad {
  id: string;
  tipo_de_propiedad: string;
  direccion: string;
  zona: string;
  valor: string;
  dormitorios: string;
  banos: string;
  patio_parque: string;
  garage: string;
  mts_const: string;
  lote: string;
  piso: string;
  link: string;
  columna_1: string;
  apto_banco: string;
  alternativa_menor_1: string;
  alternativa_menor_2: string;
  alternativa_menor_3: string;
  alterniva_menor_4: string;
  alternativa_menor_5: string;
  alternativa_mayor: string;
  alternativa_mayor_2: string;
  alternativa_mayor_3: string;
  alternativa_mayor_4: string;
  alternativa_mayor_5: string;
  notas?: string;
}

/** Fila de public.propiedad_busquedas (mismo esquema que SupabasePropiedad + origen y timestamps) */
export interface PropiedadBusqueda {
  id: string;
  agente_cliente: string;
  tipo_de_propiedad: string;
  direccion: string;
  zona: string;
  valor: string;
  dormitorios: string;
  banos: string;
  patio_parque: string;
  garage: string;
  mts_const: string;
  lote: string;
  piso: string;
  link: string;
  columna_1: string;
  apto_banco: string;
  alternativa_menor_1: string;
  alternativa_menor_2: string;
  alternativa_menor_3: string;
  alterniva_menor_4: string;
  alternativa_menor_5: string;
  alternativa_mayor: string;
  alternativa_mayor_2: string;
  alternativa_mayor_3: string;
  alternativa_mayor_4: string;
  alternativa_mayor_5: string;
  notas: string;
  etiqueta: string;
  archivo_origen?: string | null;
  created_at?: string | null;
}

// ───────────────────────── Rueda de Negocios — Match v2 ─────────────────────────

export type TipoCanonico =
  | 'departamento' | 'casa' | 'ph' | 'duplex' | 'terreno' | 'local'
  | 'oficina' | 'cochera' | 'galpon' | 'quinta' | 'otro';

export type Amenity =
  | 'cochera' | 'patio' | 'jardin' | 'pileta' | 'quincho' | 'parrilla'
  | 'balcon' | 'terraza' | 'ascensor' | 'amenities';

export type FormaPago = 'apto_credito' | 'permuta' | 'contado' | 'financiacion';

/** Forma normalizada común a propiedades y búsquedas (propiedad: min = max). */
export interface RuedaNormalizado {
  v: 1;
  fuente: 'llm' | 'parser';
  confianza: number; // 0..1
  moneda: 'USD' | 'ARS' | null;
  precio_min: number | null;
  precio_max: number | null;
  tipos: TipoCanonico[];
  zonas: string[];
  zonas_cercanas: string[];
  dorm_min: number | null;
  dorm_max: number | null; // MONOAMBIENTE = 0
  banos_min: number | null;
  m2_min: number | null;
  m2_max: number | null;
  lote_m2_min: number | null;
  amenities: Amenity[];
  formas_pago: FormaPago[];
  requisitos: string[];
}

export type MatchEstado =
  | 'nuevo' | 'revisado' | 'contactado' | 'pendiente' | 'interesado' | 'descartado';

export type EstadoOrigen = 'sistema' | 'usuario';

export type MotivoEstado = 'ok' | 'parcial' | 'falla' | 'sin_dato';

export interface Motivo {
  criterio: string;
  estado: MotivoEstado;
  texto: string;
}

export interface RuedaZona {
  nombre: string;
  alias: string[];
  vecinas: string[];
}

export interface RuedaConfig {
  pesos: {
    precio: number;
    zona: number;
    tipo: number;
    dormitorios: number;
    m2: number;
    caracteristicas: number;
    forma_pago: number;
    necesidades: number;
  };
  precio_tolerancia: number;
  precio_fuera_tolerancia_elimina: boolean;
  tipo_eliminatorio: boolean;
  zona_cercana_credito: number;
  zona_mismatch_multiplicador: number;
  /** Tabla determinística de zonas (alias + vecindad simétrica). Autoritativa si ambas zonas son conocidas. */
  zonas: RuedaZona[];
  umbral: number;
  peso_minimo_evaluado: number;
  moneda_default: 'USD' | 'ARS';
  ars_por_usd: number | null;
}

export interface RuedaMatch {
  id: number;
  busqueda_id: number;
  propiedad_id: number;
  score: number;
  motivos: Motivo[];
  estado: MatchEstado;
  estado_origen: EstadoOrigen;
  bajo_umbral: boolean;
  notas: string | null;
  first_seen_at: string;
  estado_updated_at: string;
  score_updated_at: string;
  propiedad?: SupabasePropiedad;
  busqueda?: PropiedadBusqueda;
}
