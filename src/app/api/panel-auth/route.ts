import { NextRequest, NextResponse } from 'next/server';
import { CRM_COOKIE, getCrmPassword, verifyCrmToken } from '@/lib/crmAuth';
import {
  PANEL_COOKIE,
  PANEL_SESSION_SECONDS,
  createPanelToken,
  getPanelPassword,
  passwordMatches,
} from '@/lib/panelAuth';
import { clientIp, crearLimitadorDeIntentos } from '@/lib/signedSession';

const limitador = crearLimitadorDeIntentos();

/** POST { password } → setea la cookie de sesión del panel (Dashboard y Gastos) */
export async function POST(request: NextRequest) {
  // El panel es un segundo candado: primero hay que estar logueado en el sistema
  if (!(await verifyCrmToken(request.cookies.get(CRM_COOKIE)?.value, getCrmPassword()))) {
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

  const ip = clientIp(request.headers);
  if (limitador.bloqueado(ip)) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }, { status: 429 });
  }

  if (!input || !(await passwordMatches(input, panelPassword))) {
    limitador.registrarFallo(ip);
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  limitador.limpiar(ip);
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
