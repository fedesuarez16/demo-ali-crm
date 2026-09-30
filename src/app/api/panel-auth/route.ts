import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  PANEL_COOKIE,
  PANEL_SESSION_SECONDS,
  createPanelToken,
  getPanelPassword,
  passwordMatches,
} from '@/lib/panelAuth';

// Límite simple de intentos fallidos por IP (en memoria, por instancia)
const MAX_INTENTOS = 8;
const VENTANA_MS = 15 * 60 * 1000;
const intentos = new Map<string, { count: number; desde: number }>();

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

function bloqueado(ip: string): boolean {
  const e = intentos.get(ip);
  if (!e) return false;
  if (Date.now() - e.desde > VENTANA_MS) {
    intentos.delete(ip);
    return false;
  }
  return e.count >= MAX_INTENTOS;
}

function registrarFallo(ip: string) {
  const e = intentos.get(ip);
  if (!e || Date.now() - e.desde > VENTANA_MS) {
    if (intentos.size > 1000) intentos.clear();
    intentos.set(ip, { count: 1, desde: Date.now() });
  } else {
    e.count++;
  }
}

/** POST { password } → setea la cookie de sesión del panel (Dashboard y Gastos) */
export async function POST(request: NextRequest) {
  // El panel es un segundo candado: primero hay que estar logueado en el sistema
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Tenés que iniciar sesión primero' }, { status: 401 });
  }

  const panelPassword = getPanelPassword();
  if (!panelPassword) {
    return NextResponse.json(
      { error: 'La contraseña del panel no está configurada (DASHBOARD_PASSWORD)' },
      { status: 500 },
    );
  }

  let input = '';
  try {
    const body = await request.json();
    input = typeof body?.password === 'string' ? body.password : '';
  } catch {
    /* body inválido: cae como contraseña vacía */
  }

  const ip = clientIp(request);
  if (bloqueado(ip)) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }, { status: 429 });
  }

  if (!input || !(await passwordMatches(input, panelPassword))) {
    registrarFallo(ip);
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  intentos.delete(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PANEL_COOKIE, await createPanelToken(panelPassword), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PANEL_SESSION_SECONDS,
  });
  return response;
}

/** DELETE → cierra la sesión del panel (Dashboard y Gastos) */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PANEL_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
