// Lógica de negocio del calendario, compartida por las rutas /api/calendario/*.

import { calendarioSecret, getSupabase, googleClient } from './config';
import { calcularSlots, haySolapamiento, validarHorario, type Horario, type Intervalo } from './disponibilidad';
import {
  borrarEventoGoogle,
  crearEventoGoogle,
  GoogleError,
  listarEventos,
  ocupados as ocupadosGoogle,
  refrescarToken,
  revocarToken,
} from './google';
import { cifrar, descifrar } from './seguridad';
import { distribuirSlots, ultimos10 } from './sugerencias';
import { formatearSlot, partesEnZona, zonaAUtc } from './zona';

export class CalendarioError extends Error {
  constructor(
    message: string,
    public status: number,
    public codigo: string,
  ) {
    super(message);
  }
}

// ── Personas ──────────────────────────────────────────────────────────────

export interface Persona {
  id: number;
  nombre: string;
  email: string;
  google_calendar_id: string;
  zona_horaria: string;
  activo: boolean;
  conectado_at: string | null;
  refresh_token_cifrado: string | null;
  access_token_cifrado: string | null;
  access_token_expira: string | null;
}

export type PersonaPublica = Omit<Persona, 'refresh_token_cifrado' | 'access_token_cifrado' | 'access_token_expira'> & {
  conectado: boolean;
};

export function personaPublica(p: Persona): PersonaPublica {
  const { refresh_token_cifrado, access_token_cifrado: _a, access_token_expira: _e, ...resto } = p;
  return { ...resto, conectado: !!refresh_token_cifrado };
}

export async function listarPersonas(soloConectadas = false): Promise<Persona[]> {
  const { data, error } = await getSupabase().from('calendario_personas').select('*').order('id');
  if (error) throw new Error(error.message);
  const personas = (data ?? []) as Persona[];
  return soloConectadas ? personas.filter((p) => p.activo && p.refresh_token_cifrado) : personas;
}

async function obtenerPersona(id: number): Promise<Persona | null> {
  const { data, error } = await getSupabase().from('calendario_personas').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Persona | null;
}

export async function guardarConexion(p: {
  email: string;
  nombre: string;
  refreshToken: string;
  accessToken: string;
  expiresIn: number;
}): Promise<Persona> {
  const secreto = calendarioSecret();
  const ahora = new Date();
  const { data, error } = await getSupabase()
    .from('calendario_personas')
    .upsert(
      {
        email: p.email.toLowerCase(),
        nombre: p.nombre,
        refresh_token_cifrado: cifrar(p.refreshToken, secreto),
        access_token_cifrado: cifrar(p.accessToken, secreto),
        access_token_expira: new Date(ahora.getTime() + (p.expiresIn - 60) * 1000).toISOString(),
        activo: true,
        conectado_at: ahora.toISOString(),
        updated_at: ahora.toISOString(),
      },
      { onConflict: 'email' },
    )
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Persona;
}

export async function desconectarPersona(id: number): Promise<void> {
  const persona = await obtenerPersona(id);
  if (!persona) throw new CalendarioError('Persona no encontrada', 404, 'no_encontrada');
  if (persona.refresh_token_cifrado) {
    try {
      await revocarToken(descifrar(persona.refresh_token_cifrado, calendarioSecret()));
    } catch {
      // si no se puede descifrar/revocar igual borramos los tokens locales
    }
  }
  const { error } = await getSupabase()
    .from('calendario_personas')
    .update({ refresh_token_cifrado: null, access_token_cifrado: null, access_token_expira: null, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Access token vigente; refresca y persiste si venció */
async function accessToken(persona: Persona): Promise<string> {
  if (!persona.refresh_token_cifrado) {
    throw new CalendarioError(`${persona.nombre} no tiene Google Calendar vinculado`, 409, 'sin_calendario');
  }
  const secreto = calendarioSecret();
  if (persona.access_token_cifrado && persona.access_token_expira && new Date(persona.access_token_expira) > new Date()) {
    return descifrar(persona.access_token_cifrado, secreto);
  }
  const { clientId, clientSecret } = googleClient();
  try {
    const t = await refrescarToken({ refreshToken: descifrar(persona.refresh_token_cifrado, secreto), clientId, clientSecret });
    const expira = new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString();
    const cambios: Record<string, string> = { access_token_cifrado: cifrar(t.access_token, secreto), access_token_expira: expira };
    if (t.refresh_token) cambios.refresh_token_cifrado = cifrar(t.refresh_token, secreto);
    await getSupabase().from('calendario_personas').update(cambios).eq('id', persona.id);
    persona.access_token_cifrado = cambios.access_token_cifrado;
    persona.access_token_expira = expira;
    return t.access_token;
  } catch (e) {
    if (e instanceof GoogleError && e.reconectar) {
      throw new CalendarioError(`El Google Calendar de ${persona.nombre} se desvinculó: hay que volver a conectarlo`, 409, 'reconectar');
    }
    throw e;
  }
}

// ── Tipos de evento ───────────────────────────────────────────────────────

export interface TipoEvento {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string | null;
  duracion_min: number;
  buffer_min: number;
  anticipacion_min: number;
  ventana_dias: number;
  persona_id: number | null;
  horario: Horario;
  color: string;
  agendable_por_bot: boolean;
  activo: boolean;
  orden: number;
}

export async function listarTipos(soloActivos = false): Promise<TipoEvento[]> {
  let q = getSupabase().from('calendario_tipos_evento').select('*').order('orden').order('id');
  if (soloActivos) q = q.eq('activo', true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as TipoEvento[];
}

async function obtenerTipo(slugOId: string | number): Promise<TipoEvento> {
  const q = getSupabase().from('calendario_tipos_evento').select('*');
  const { data, error } = await (typeof slugOId === 'number' ? q.eq('id', slugOId) : q.eq('slug', slugOId)).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !data.activo) {
    const tipos = (await listarTipos(true)).map((t) => t.slug).join(', ');
    throw new CalendarioError(`Tipo de evento "${slugOId}" no existe o está inactivo. Tipos válidos: ${tipos}`, 400, 'tipo_invalido');
  }
  return data as TipoEvento;
}

const CAMPOS_TIPO = ['slug', 'nombre', 'descripcion', 'duracion_min', 'buffer_min', 'anticipacion_min', 'ventana_dias', 'persona_id', 'horario', 'color', 'agendable_por_bot', 'activo', 'orden'] as const;

export function sanitizarTipo(body: any, parcial: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of CAMPOS_TIPO) if (body?.[k] !== undefined) out[k] = body[k];
  if (!parcial && (!out.slug || !out.nombre)) throw new CalendarioError('slug y nombre son obligatorios', 400, 'invalido');
  if (out.slug !== undefined && !/^[a-z0-9_]+$/.test(String(out.slug))) {
    throw new CalendarioError('slug: solo minúsculas, números y _', 400, 'invalido');
  }
  if (out.horario !== undefined) {
    const v = validarHorario(out.horario);
    if (!v.ok) throw new CalendarioError(v.error, 400, 'invalido');
    out.horario = v.horario;
  }
  for (const k of ['duracion_min', 'buffer_min', 'anticipacion_min', 'ventana_dias', 'orden'] as const) {
    if (out[k] !== undefined && !Number.isInteger(Number(out[k]))) throw new CalendarioError(`${k} debe ser entero`, 400, 'invalido');
    if (out[k] !== undefined) out[k] = Number(out[k]);
  }
  if (out.persona_id !== undefined) out.persona_id = out.persona_id === null || out.persona_id === '' ? null : Number(out.persona_id);
  return out;
}

async function personaDelTipo(tipo: TipoEvento, personaId?: number | null): Promise<Persona> {
  const id = personaId ?? tipo.persona_id;
  if (id) {
    const p = await obtenerPersona(id);
    if (p && p.activo && p.refresh_token_cifrado) return p;
    throw new CalendarioError('La persona asignada no tiene Google Calendar vinculado', 409, 'sin_calendario');
  }
  const [primera] = await listarPersonas(true);
  if (!primera) throw new CalendarioError('No hay ningún Google Calendar vinculado', 409, 'sin_calendario');
  return primera;
}

// ── Disponibilidad ────────────────────────────────────────────────────────

export interface Slot {
  inicio: string;
  fin: string;
  texto: string;
}

export async function disponibilidad(p: {
  tipo: string;
  personaId?: number | null;
  /** YYYY-MM-DD (día local) o ISO */
  desde?: string | null;
  dias?: number | null;
  max?: number | null;
  sugeridos?: number | null;
  origen: 'crm' | 'bot';
}) {
  const tipo = await obtenerTipo(p.tipo);
  if (p.origen === 'bot' && !tipo.agendable_por_bot) {
    throw new CalendarioError(`El bot no puede agendar "${tipo.nombre}": coordinalo a través de una llamada con Andrés.`, 403, 'no_agendable_por_bot');
  }
  const persona = await personaDelTipo(tipo, p.personaId);
  const tz = persona.zona_horaria;
  const ahora = new Date();

  let desde: Date | undefined;
  if (p.desde) {
    desde = /^\d{4}-\d{2}-\d{2}$/.test(p.desde) ? zonaAUtc(p.desde, '00:00', tz) : new Date(p.desde);
    if (Number.isNaN(desde.getTime())) throw new CalendarioError('desde inválido (usar YYYY-MM-DD o ISO)', 400, 'invalido');
  }
  // Días desde hoy hasta el inicio pedido + días a mirar desde ahí (tope 90 en total)
  const diasHastaDesde = desde ? Math.max(0, Math.ceil((desde.getTime() - ahora.getTime()) / 86_400_000)) : 0;
  const ventanaDias = Math.min(diasHastaDesde + (p.dias ?? tipo.ventana_dias), 90);
  const hasta = new Date(ahora.getTime() + (ventanaDias + 1) * 86_400_000);

  const token = await accessToken(persona);
  const busy = await ocupadosGoogle(token, persona.google_calendar_id, ahora, hasta);
  let slots = calcularSlots({
    horario: tipo.horario,
    duracionMin: tipo.duracion_min,
    bufferMin: tipo.buffer_min,
    anticipacionMin: tipo.anticipacion_min,
    ventanaDias,
    ocupados: busy,
    ahora,
    zonaHoraria: tz,
    desde,
  });
  if (desde && p.dias) {
    const limite = desde.getTime() + p.dias * 86_400_000;
    slots = slots.filter((s) => s.inicio.getTime() < limite);
  }
  const fmt = (s: Intervalo): Slot => ({ inicio: s.inicio.toISOString(), fin: s.fin.toISOString(), texto: formatearSlot(s.inicio, tz) });
  const sugeridos = distribuirSlots(slots, p.sugeridos ?? 4, tz).map(fmt);

  return {
    tipo: { slug: tipo.slug, nombre: tipo.nombre, duracion_min: tipo.duracion_min },
    persona: { id: persona.id, nombre: persona.nombre },
    zona_horaria: tz,
    sugeridos,
    slots: slots.slice(0, p.max ?? 60).map(fmt),
    total: slots.length,
    resumen: sugeridos.length
      ? `Opciones para ${tipo.nombre.toLowerCase()} con ${persona.nombre}: ${sugeridos.map((s) => s.texto).join(' | ')}`
      : `No hay turnos libres para ${tipo.nombre.toLowerCase()} en el período pedido.`,
  };
}

// ── Eventos ───────────────────────────────────────────────────────────────

async function buscarLead(p: { leadId?: number | null; whatsappId?: string | null }) {
  const sb = getSupabase();
  if (p.leadId) {
    const { data } = await sb.from('leads').select('id, nombre, whatsapp_id').eq('id', p.leadId).maybeSingle();
    return data as { id: number; nombre: string | null; whatsapp_id: string | null } | null;
  }
  const tel = ultimos10(p.whatsappId);
  if (!tel) return null;
  const { data } = await sb.from('leads').select('id, nombre, whatsapp_id').ilike('whatsapp_id', `%${tel}%`).limit(20);
  const match = (data ?? []).filter((l: any) => ultimos10(l.whatsapp_id) === tel);
  return (match[0] as { id: number; nombre: string | null; whatsapp_id: string | null }) ?? null;
}

export async function crearEvento(p: {
  tipo: string;
  inicio: string;
  personaId?: number | null;
  leadId?: number | null;
  whatsappId?: string | null;
  nombre?: string | null;
  notas?: string | null;
  titulo?: string | null;
  forzar?: boolean;
  origen: 'crm' | 'bot';
}) {
  const tipo = await obtenerTipo(p.tipo);
  if (p.origen === 'bot' && !tipo.agendable_por_bot) {
    throw new CalendarioError(`El bot no puede agendar "${tipo.nombre}"`, 403, 'no_agendable_por_bot');
  }
  const inicio = new Date(p.inicio);
  if (Number.isNaN(inicio.getTime())) throw new CalendarioError('inicio inválido (ISO 8601)', 400, 'invalido');
  const fin = new Date(inicio.getTime() + tipo.duracion_min * 60_000);
  const persona = await personaDelTipo(tipo, p.personaId);
  const tz = persona.zona_horaria;
  const token = await accessToken(persona);

  if (p.origen === 'bot') {
    // El bot solo puede usar un turno que la disponibilidad ofrecería (horario, anticipación, buffer)
    const dia = partesEnZona(inicio, tz).fecha;
    const ahora = new Date();
    const finDia = new Date(zonaAUtc(dia, '00:00', tz).getTime() + 2 * 86_400_000);
    const busy = await ocupadosGoogle(token, persona.google_calendar_id, ahora, finDia);
    const validos = calcularSlots({
      horario: tipo.horario,
      duracionMin: tipo.duracion_min,
      bufferMin: tipo.buffer_min,
      anticipacionMin: tipo.anticipacion_min,
      ventanaDias: tipo.ventana_dias,
      ocupados: busy,
      ahora,
      zonaHoraria: tz,
      pasoMin: 5,
    });
    if (!validos.some((s) => s.inicio.getTime() === inicio.getTime())) {
      throw new CalendarioError('Ese horario ya no está disponible. Consultá la disponibilidad otra vez y ofrecé otra opción.', 409, 'ocupado');
    }
  } else if (!p.forzar) {
    const busy = await ocupadosGoogle(token, persona.google_calendar_id, new Date(inicio.getTime() - 86_400_000), new Date(fin.getTime() + 86_400_000));
    if (haySolapamiento({ inicio, fin }, busy, 0)) {
      throw new CalendarioError('Se superpone con otro evento del calendario. Reenviá con forzar=true para agendarlo igual.', 409, 'ocupado');
    }
  }

  const lead = await buscarLead({ leadId: p.leadId, whatsappId: p.whatsappId });
  const quien = lead?.nombre || p.nombre || (p.whatsappId ? `+${p.whatsappId.replace(/\D/g, '')}` : 'sin nombre');
  const titulo = p.titulo || `${tipo.nombre} - ${quien}`;
  const telefono = lead?.whatsapp_id || p.whatsappId;
  const descripcion = [
    p.notas,
    telefono ? `Teléfono: +${String(telefono).replace(/\D/g, '')}` : null,
    lead ? `Lead #${lead.id} en el CRM` : null,
    `Agendado por: ${p.origen === 'bot' ? 'asistente de WhatsApp' : 'CRM'}`,
  ]
    .filter(Boolean)
    .join('\n');

  const ev = await crearEventoGoogle(token, persona.google_calendar_id, {
    titulo,
    descripcion,
    inicio,
    fin,
    zonaHoraria: tz,
    privado: { crm_tipo: tipo.slug, ...(lead ? { crm_lead_id: String(lead.id) } : {}) },
  });

  const { data, error } = await getSupabase()
    .from('calendario_eventos')
    .insert({
      tipo_evento_id: tipo.id,
      persona_id: persona.id,
      lead_id: lead?.id ?? null,
      google_event_id: ev.id,
      titulo,
      descripcion,
      inicio: inicio.toISOString(),
      fin: fin.toISOString(),
      origen: p.origen,
    })
    .select('id')
    .single();
  if (error) throw new Error(`Evento creado en Google (${ev.id}) pero no se guardó en el CRM: ${error.message}`);

  return {
    id: data.id as number,
    google_event_id: ev.id,
    html_link: ev.htmlLink ?? null,
    titulo,
    inicio: inicio.toISOString(),
    fin: fin.toISOString(),
    texto: formatearSlot(inicio, tz),
    persona: { id: persona.id, nombre: persona.nombre },
    lead_id: lead?.id ?? null,
    confirmacion: `Agendado: ${tipo.nombre.toLowerCase()} con ${persona.nombre} el ${formatearSlot(inicio, tz)} hs.`,
  };
}

export interface EventoVista {
  id: string;
  persona_id: number;
  persona_nombre: string;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string;
  todo_el_dia: boolean;
  html_link: string | null;
  color: string | null;
  tipo_slug: string | null;
  lead_id: number | null;
  lead_nombre: string | null;
  crm_evento_id: number | null;
}

export async function eventosEnRango(p: { desde: Date; hasta: Date; personaId?: number | null }) {
  const personas = (await listarPersonas(true)).filter((x) => !p.personaId || x.id === p.personaId);
  const [tipos, locales] = await Promise.all([
    listarTipos(),
    getSupabase()
      .from('calendario_eventos')
      .select('id, google_event_id, tipo_evento_id, lead_id, leads(nombre)')
      .gte('inicio', new Date(p.desde.getTime() - 86_400_000).toISOString())
      .lte('inicio', new Date(p.hasta.getTime() + 86_400_000).toISOString()),
  ]);
  const porGoogleId = new Map<string, any>((locales.data ?? []).map((l: any) => [l.google_event_id, l]));
  const tipoPorId = new Map(tipos.map((t) => [t.id, t]));
  const tipoPorSlug = new Map(tipos.map((t) => [t.slug, t]));

  const errores: { persona_id: number; persona_nombre: string; error: string; codigo?: string }[] = [];
  const eventos: EventoVista[] = [];
  await Promise.all(
    personas.map(async (persona) => {
      try {
        const lista = await listarEventos(await accessToken(persona), persona.google_calendar_id, p.desde, p.hasta);
        for (const e of lista) {
          const local = porGoogleId.get(e.id);
          const priv = e.extendedProperties?.private ?? {};
          const tipo = (local && tipoPorId.get(local.tipo_evento_id)) || tipoPorSlug.get(priv.crm_tipo);
          const todoElDia = !e.start.dateTime;
          eventos.push({
            id: e.id,
            persona_id: persona.id,
            persona_nombre: persona.nombre,
            titulo: e.summary || '(sin título)',
            descripcion: e.description ?? null,
            inicio: e.start.dateTime || zonaAUtc(e.start.date!, '00:00', persona.zona_horaria).toISOString(),
            fin: e.end.dateTime || zonaAUtc(e.end.date!, '00:00', persona.zona_horaria).toISOString(),
            todo_el_dia: todoElDia,
            html_link: e.htmlLink ?? null,
            color: tipo?.color ?? null,
            tipo_slug: tipo?.slug ?? null,
            lead_id: local?.lead_id ?? (priv.crm_lead_id ? Number(priv.crm_lead_id) : null),
            lead_nombre: local?.leads?.nombre ?? null,
            crm_evento_id: local?.id ?? null,
          });
        }
      } catch (e: any) {
        errores.push({ persona_id: persona.id, persona_nombre: persona.nombre, error: e?.message ?? String(e), codigo: e?.codigo });
      }
    }),
  );
  eventos.sort((a, b) => a.inicio.localeCompare(b.inicio));
  return { eventos, errores, personas: personas.map(personaPublica) };
}

export async function cancelarEvento(id: number) {
  const sb = getSupabase();
  const { data: ev, error } = await sb.from('calendario_eventos').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!ev) throw new CalendarioError('Evento no encontrado', 404, 'no_encontrado');
  if (ev.google_event_id && ev.persona_id) {
    const persona = await obtenerPersona(ev.persona_id);
    if (persona?.refresh_token_cifrado) await borrarEventoGoogle(await accessToken(persona), persona.google_calendar_id, ev.google_event_id);
  }
  await sb.from('calendario_eventos').update({ estado: 'cancelado', updated_at: new Date().toISOString() }).eq('id', id);
}
