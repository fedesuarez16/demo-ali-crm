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
 * Plantilla genérica de seguimiento (fuera del ciclo de 8 toques).
 * `codigo` es el seguimientos_count que la dispara (ej. 300). Sin `nombreYcloud` no se envía:
 * se carga recién cuando YCloud/Meta aprueba la plantilla.
 */
export interface PlantillaSeguimiento {
  id: number;
  codigo: number;
  nombre: string;
  mensaje: string;
  nombreYcloud: string | null;
  activa: boolean;
}

export type PlantillaInput = Omit<PlantillaSeguimiento, 'id'>;

/** Códigos que no se pueden usar: 0..10 son el ciclo (y el selector de /leads), 100 es un valor heredado. */
export const validarCodigo = (codigo: number): string | null => {
  if (!Number.isInteger(codigo)) return 'El código tiene que ser un número entero.';
  if (codigo <= 10) return 'Del 0 al 10 están reservados para el ciclo de toques.';
  if (codigo === 100) return 'El 100 está reservado.';
  return null;
};

/** YCloud usa nombres en minúscula con guiones bajos (ej. baja_valor). */
export const normalizarNombreYcloud = (raw: string): string | null => {
  const s = raw.trim();
  return s === '' ? null : s;
};

export const validarNombreYcloud = (nombre: string | null): string | null =>
  nombre === null || /^[a-z0-9_]+$/.test(nombre) ? null : 'El nombre de YCloud va en minúsculas, números y guiones bajos (ej. baja_valor).';

/** Una plantilla se envía solo si está activa y YCloud ya la aprobó. */
export const estaLista = (p: PlantillaSeguimiento) => p.activa && !!p.nombreYcloud;

const mapRow = (r: any): PlantillaSeguimiento => ({
  id: Number(r.id),
  codigo: Number(r.codigo),
  nombre: String(r.nombre ?? ''),
  mensaje: String(r.mensaje ?? ''),
  nombreYcloud: r.nombre_ycloud ?? null,
  activa: r.activa !== false,
});

const toRow = (p: Partial<PlantillaInput>) => {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (p.codigo !== undefined) row.codigo = p.codigo;
  if (p.nombre !== undefined) row.nombre = p.nombre.trim();
  if (p.mensaje !== undefined) row.mensaje = p.mensaje.trim();
  if (p.nombreYcloud !== undefined) row.nombre_ycloud = p.nombreYcloud;
  if (p.activa !== undefined) row.activa = p.activa;
  return row;
};

/** Traduce los errores de Postgres que el usuario puede provocar desde el formulario. */
const mensajeError = (error: { code?: string; message: string }) => {
  if (error.code === '23505') {
    return error.message.includes('nombre_ycloud')
      ? 'Ya hay otra plantilla con ese nombre de YCloud.'
      : 'Ya hay otra plantilla con ese código.';
  }
  if (error.code === '23514') return 'Algún dato no es válido (revisá el código y el nombre de YCloud).';
  return error.message;
};

export const getPlantillas = async (): Promise<PlantillaSeguimiento[]> => {
  const { data, error } = await (getSupabase() as any)
    .from('plantillas_seguimiento')
    .select('id, codigo, nombre, mensaje, nombre_ycloud, activa')
    .order('codigo', { ascending: true });
  if (error) throw new Error(`Error leyendo plantillas: ${error.message}`);
  return (data ?? []).map(mapRow);
};

export const crearPlantilla = async (p: PlantillaInput): Promise<{ ok: true } | { ok: false; error: string }> => {
  const { error } = await (getSupabase() as any).from('plantillas_seguimiento').insert(toRow(p));
  return error ? { ok: false, error: mensajeError(error) } : { ok: true };
};

export const actualizarPlantilla = async (
  id: number,
  p: Partial<PlantillaInput>,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const { error } = await (getSupabase() as any).from('plantillas_seguimiento').update(toRow(p)).eq('id', id);
  return error ? { ok: false, error: mensajeError(error) } : { ok: true };
};

export const eliminarPlantilla = async (id: number): Promise<{ ok: true } | { ok: false; error: string }> => {
  const { error } = await (getSupabase() as any).from('plantillas_seguimiento').delete().eq('id', id);
  return error ? { ok: false, error: mensajeError(error) } : { ok: true };
};

/** Sugiere el próximo código libre en múltiplos de 100 (300, 400, 500...). */
export const sugerirCodigo = (plantillas: PlantillaSeguimiento[]): number => {
  const usados = new Set(plantillas.map((p) => p.codigo));
  let c = 300;
  while (usados.has(c) || validarCodigo(c)) c += 100;
  return c;
};
