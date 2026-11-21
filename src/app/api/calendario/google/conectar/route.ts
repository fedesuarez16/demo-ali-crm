import { NextRequest, NextResponse } from 'next/server';
import { autenticar } from '@/lib/calendario/auth';
import { calendarioSecret, googleClient, redirectUri } from '@/lib/calendario/config';
import { urlConsentimiento } from '@/lib/calendario/google';
import { firmarState } from '@/lib/calendario/seguridad';

/** GET /api/calendario/google/conectar[?email=] -> redirige al consentimiento de Google (solo desde el CRM) */
export async function GET(request: NextRequest) {
  const auth = await autenticar(request, ['crm']);
  if (auth instanceof NextResponse) return auth;
  try {
    const { clientId } = googleClient();
    const state = firmarState({ volver: '/calendario' }, calendarioSecret(), 10 * 60);
    const loginHint = request.nextUrl.searchParams.get('email') || undefined;
    return NextResponse.redirect(urlConsentimiento({ clientId, redirectUri: redirectUri(request.nextUrl.origin), state, loginHint }));
  } catch (err: any) {
    const url = new URL('/calendario', request.nextUrl.origin);
    url.searchParams.set('error', err?.message || 'No se pudo iniciar la conexión con Google');
    return NextResponse.redirect(url);
  }
}
