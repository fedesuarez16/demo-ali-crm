import { NextRequest, NextResponse } from 'next/server';
import { CRM_COOKIE, CRM_SESSION_SECONDS, createCrmToken, crmPasswordMatches, getCrmPassword } from '@/lib/crmAuth';
import { PANEL_COOKIE } from '@/lib/panelAuth';
import { clientIp, crearLimitadorDeIntentos } from '@/lib/signedSession';

const limitador = crearLimitadorDeIntentos();

/** POST { password } → setea la cookie de sesión del CRM */
export async function POST(request: NextRequest) {
  const crmPassword = getCrmPassword();
  if (!crmPassword) {
    return NextResponse.json(
      { error: 'La contraseña del CRM no está configurada (CRM_PASSWORD)' },
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

  if (!input || !(await crmPasswordMatches(input, crmPassword))) {
    limitador.registrarFallo(ip);
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  limitador.limpiar(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CRM_COOKIE, await createCrmToken(crmPassword), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CRM_SESSION_SECONDS,
  });
  return response;
}

/** DELETE → cierra la sesión del CRM y, con ella, la del panel */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CRM_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  response.cookies.set(PANEL_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
