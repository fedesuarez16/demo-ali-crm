import { createClient } from '@supabase/supabase-js';

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

/**
 * Ciclo de 8 toques que ejecuta el workflow n8n "Team ali - seguimiento v2 (8 toques)".
 * seguimientos_count = toques ya enviados, así que el próximo toque es count + 1.
 * `espera` es lo que se espera DESPUÉS de enviar ese toque para mandar el siguiente.
 */
export const CICLO: { toque: number; plantilla: string; espera: string }[] = [
  { toque: 1, plantilla: 'Mensaje de la IA', espera: '+7 días' },
  { toque: 2, plantilla: 'seguimiento_t2', espera: '+30 días' },
  { toque: 3, plantilla: 'seguimiento_t3', espera: '+30 días' },
  { toque: 4, plantilla: 'seguimiento_t4', espera: '+30 días' },
  { toque: 5, plantilla: 'seguimiento_t5', espera: '+180 días' },
  { toque: 6, plantilla: 'seguimiento_t6', espera: '+180 días' },
  { toque: 7, plantilla: 'seguimiento_t6', espera: '+180 días' },
  { toque: 8, plantilla: 'seguimiento_t6', espera: 'fin del ciclo' },
];

/** Columnas del Kanban que reciben toques; el workflow saltea a los leads en cualquier otra. */
export const ESTADOS_QUE_RECIBEN_TOQUES = new Set(['frío', 'tibio', 'caliente']);

export type EstadoSeguimiento =
  | 'vencido'      // en ciclo y ya le toca: sale en la próxima corrida del workflow
  | 'programado'   // en ciclo, con fecha futura
  | 'en_pausa'     // en ciclo, pero el lead está en una columna que no recibe toques
  | 'enviando'     // el workflow lo está procesando ahora
  | 'completado'
  | 'error'
  | 'fuera_de_ciclo'; // contador fuera de 0..7 (valores heredados del ciclo viejo)

export interface SeguimientoCiclo {
  id: number;
  remoteJid: string;
  telefono: string;
  leadId: number | null;
  nombre: string | null;
  estadoLead: string | null;
  estadoFila: string;
  seguimientosCount: number;
  proximoToque: number | null;
  fechaProgramada: Date | null;
  enviadoAt: Date | null;
  conversacionId: number | null;
  estado: EstadoSeguimiento;
}

const last10 = (raw: string | null | undefined) => String(raw ?? '').replace(/\D/g, '').slice(-10);

/** Las columnas son `timestamp without time zone` y n8n/Postgres las escriben en UTC. */
export const parseUtc = (raw: string | null | undefined): Date | null => {
  if (!raw) return null;
  const s = String(raw).replace(' ', 'T');
  const d = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toUtcColumn = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const out: T[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await (getSupabase() as any)
      .from(table)
      .select(columns)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Error leyendo ${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) return out;
  }
}

function clasificar(estadoFila: string, count: number, fecha: Date | null, estadoLead: string | null, ahora: number): EstadoSeguimiento {
  if (estadoFila === 'completado') return 'completado';
  if (estadoFila === 'error') return 'error';
  if (estadoFila === 'procesando') return 'enviando';
  if (count < 0 || count > 7) return 'fuera_de_ciclo';
  if (estadoLead && !ESTADOS_QUE_RECIBEN_TOQUES.has(estadoLead)) return 'en_pausa';
  return fecha && fecha.getTime() <= ahora ? 'vencido' : 'programado';
}

/**
 * Filas de cola_seguimientos que importan para el ciclo (pendientes, procesando, completadas y con error),
 * cruzadas con el lead por los últimos 10 dígitos del teléfono.
 */
export const getSeguimientosCiclo = async (): Promise<SeguimientoCiclo[]> => {
  const [filas, leads] = await Promise.all([
    fetchAll<any>('cola_seguimientos', 'id, remote_jid, estado, seguimientos_count, fecha_programada, enviado_at, chatwoot_conversation_id'),
    fetchAll<any>('leads', 'id, nombre, whatsapp_id, estado'),
  ]);

  const leadPorTelefono = new Map<string, any>();
  for (const lead of leads) {
    const key = last10(lead.whatsapp_id);
    if (key.length === 10 && !leadPorTelefono.has(key)) leadPorTelefono.set(key, lead);
  }

  const ahora = Date.now();
  const relevantes = new Set(['pendiente', 'procesando', 'completado', 'error']);

  return filas
    .filter((f) => relevantes.has(String(f.estado ?? 'pendiente')))
    .map((f) => {
      const lead = leadPorTelefono.get(last10(f.remote_jid)) ?? null;
      const count = Number(f.seguimientos_count ?? 0);
      const fecha = parseUtc(f.fecha_programada);
      const estadoFila = String(f.estado ?? 'pendiente');
      const enCiclo = count >= 0 && count <= 7;
      return {
        id: f.id,
        remoteJid: String(f.remote_jid ?? ''),
        telefono: String(f.remote_jid ?? '').replace(/@.*/, ''),
        leadId: lead?.id ?? null,
        nombre: lead?.nombre ?? null,
        estadoLead: lead?.estado ?? null,
        estadoFila,
        seguimientosCount: count,
        proximoToque: estadoFila !== 'completado' && enCiclo ? count + 1 : null,
        fechaProgramada: fecha,
        enviadoAt: parseUtc(f.enviado_at),
        conversacionId: f.chatwoot_conversation_id ?? null,
        estado: clasificar(estadoFila, count, fecha, lead?.estado ?? null, ahora),
      };
    });
};

/** Cambia la fecha del próximo toque. Recibe la fecha en hora local del navegador y la guarda en UTC. */
export const reprogramarSeguimiento = async (id: number, fecha: Date): Promise<boolean> => {
  const { error } = await (getSupabase() as any)
    .from('cola_seguimientos')
    .update({ fecha_programada: toUtcColumn(fecha) })
    .eq('id', id);
  if (error) console.error('Error reprogramando seguimiento:', error.message);
  return !error;
};

/** Vuelve a poner en ciclo una fila con error (el workflow la toma en la próxima corrida). */
export const reintentarSeguimiento = async (id: number): Promise<boolean> => {
  const { error } = await (getSupabase() as any)
    .from('cola_seguimientos')
    .update({ estado: 'pendiente', fecha_programada: toUtcColumn(new Date()) })
    .eq('id', id);
  if (error) console.error('Error reintentando seguimiento:', error.message);
  return !error;
};

/** Saca al lead del ciclo borrando su fila, igual que el botón "Desactivar seguimiento" del chat. */
export const quitarDelCiclo = async (id: number): Promise<boolean> => {
  const { error } = await (getSupabase() as any).from('cola_seguimientos').delete().eq('id', id);
  if (error) console.error('Error quitando seguimiento:', error.message);
  return !error;
};
