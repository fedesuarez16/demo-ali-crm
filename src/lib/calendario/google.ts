// Cliente mínimo de Google OAuth + Calendar API v3 con fetch (sin googleapis, que pesa ~100MB).

import type { Intervalo } from './disponibilidad';

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
];

const CAL = 'https://www.googleapis.com/calendar/v3';

export class GoogleError extends Error {
  constructor(
    message: string,
    public status: number,
    public reconectar = false,
  ) {
    super(message);
  }
}

async function json(res: Response, contexto: string) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detalle = data?.error_description || data?.error?.message || data?.error || res.statusText;
    // invalid_grant = refresh token revocado o vencido: hay que volver a vincular
    const reconectar = data?.error === 'invalid_grant' || res.status === 401;
    throw new GoogleError(`${contexto}: ${detalle}`, res.status, reconectar);
  }
  return data;
}

export function urlConsentimiento(p: { clientId: string; redirectUri: string; state: string; loginHint?: string }): string {
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.searchParams.set('client_id', p.clientId);
  u.searchParams.set('redirect_uri', p.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', GOOGLE_SCOPES.join(' '));
  u.searchParams.set('access_type', 'offline'); // refresh token
  u.searchParams.set('prompt', 'consent'); // fuerza refresh token aunque ya haya autorizado antes
  u.searchParams.set('include_granted_scopes', 'true');
  u.searchParams.set('state', p.state);
  if (p.loginHint) u.searchParams.set('login_hint', p.loginHint);
  return u.toString();
}

export interface Tokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export async function canjearCodigo(p: { code: string; clientId: string; clientSecret: string; redirectUri: string }): Promise<Tokens> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: p.code,
      client_id: p.clientId,
      client_secret: p.clientSecret,
      redirect_uri: p.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  return json(res, 'Google token');
}

export async function refrescarToken(p: { refreshToken: string; clientId: string; clientSecret: string }): Promise<Tokens> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: p.refreshToken,
      client_id: p.clientId,
      client_secret: p.clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  return json(res, 'Google refresh');
}

export async function revocarToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => {});
}

export async function perfil(accessToken: string): Promise<{ email: string; name?: string }> {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return json(res, 'Google userinfo');
}

export async function ocupados(accessToken: string, calendarId: string, desde: Date, hasta: Date): Promise<Intervalo[]> {
  const res = await fetch(`${CAL}/freeBusy`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeMin: desde.toISOString(), timeMax: hasta.toISOString(), items: [{ id: calendarId }] }),
  });
  const data = await json(res, 'Google freeBusy');
  const cal = data?.calendars?.[calendarId];
  if (cal?.errors?.length) throw new GoogleError(`Google freeBusy: ${cal.errors[0].reason}`, 400);
  return (cal?.busy ?? []).map((b: { start: string; end: string }) => ({ inicio: new Date(b.start), fin: new Date(b.end) }));
}

export interface EventoGoogle {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  status?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
}

export async function listarEventos(accessToken: string, calendarId: string, desde: Date, hasta: Date): Promise<EventoGoogle[]> {
  const eventos: EventoGoogle[] = [];
  let pageToken: string | undefined;
  do {
    const u = new URL(`${CAL}/calendars/${encodeURIComponent(calendarId)}/events`);
    u.searchParams.set('timeMin', desde.toISOString());
    u.searchParams.set('timeMax', hasta.toISOString());
    u.searchParams.set('singleEvents', 'true');
    u.searchParams.set('orderBy', 'startTime');
    u.searchParams.set('maxResults', '250');
    if (pageToken) u.searchParams.set('pageToken', pageToken);
    const data = await json(await fetch(u, { headers: { Authorization: `Bearer ${accessToken}` } }), 'Google events.list');
    eventos.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken && eventos.length < 2000);
  return eventos.filter((e) => e.status !== 'cancelled');
}

export async function crearEventoGoogle(
  accessToken: string,
  calendarId: string,
  evento: { titulo: string; descripcion?: string; inicio: Date; fin: Date; zonaHoraria: string; privado?: Record<string, string> },
): Promise<EventoGoogle> {
  const res = await fetch(`${CAL}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=none`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: evento.titulo,
      description: evento.descripcion,
      start: { dateTime: evento.inicio.toISOString(), timeZone: evento.zonaHoraria },
      end: { dateTime: evento.fin.toISOString(), timeZone: evento.zonaHoraria },
      extendedProperties: { private: { origen: 'crm-team-ali', ...evento.privado } },
      reminders: { useDefault: true },
    }),
  });
  return json(res, 'Google events.insert');
}

export async function borrarEventoGoogle(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  const res = await fetch(`${CAL}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 410 = ya estaba borrado en Google
  if (!res.ok && res.status !== 404 && res.status !== 410) await json(res, 'Google events.delete');
}
