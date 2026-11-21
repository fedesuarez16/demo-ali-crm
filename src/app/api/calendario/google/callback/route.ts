import { NextRequest, NextResponse } from 'next/server';
import { autenticar } from '@/lib/calendario/auth';
import { calendarioSecret, googleClient, redirectUri } from '@/lib/calendario/config';
import { canjearCodigo, perfil } from '@/lib/calendario/google';
import { verificarState } from '@/lib/calendario/seguridad';
import { guardarConexion } from '@/lib/calendario/servicio';

/** GET /api/calendario/google/callback?code&state -> guarda los tokens cifrados y vuelve a /calendario */
export async function GET(request: NextRequest) {
  const volver = (params: Record<string, string>) => {
    const url = new URL('/calendario', request.nextUrl.origin);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return NextResponse.redirect(url);
  };

  const auth = await autenticar(request, ['crm']);
  if (auth instanceof NextResponse) return volver({ error: 'Sesión del CRM vencida: volvé a iniciar sesión y conectá de nuevo' });

  const sp = request.nextUrl.searchParams;
  if (sp.get('error')) return volver({ error: `Google rechazó la conexión (${sp.get('error')})` });

  try {
    if (!verificarState(sp.get('state'), calendarioSecret())) return volver({ error: 'El enlace de conexión venció o es inválido. Probá de nuevo.' });
    const code = sp.get('code');
    if (!code) return volver({ error: 'Google no devolvió el código de autorización' });

    const { clientId, clientSecret } = googleClient();
    const tokens = await canjearCodigo({ code, clientId, clientSecret, redirectUri: redirectUri(request.nextUrl.origin) });
    if (!tokens.refresh_token) {
      return volver({ error: 'Google no entregó un refresh token. Quitá el acceso de la app en myaccount.google.com/permissions y conectá de nuevo.' });
    }
    const scopes = tokens.scope?.split(' ') ?? [];
    if (!scopes.some((s) => s.endsWith('/calendar.events'))) {
      return volver({ error: 'Falta el permiso de Calendar: al conectar, tildá el acceso al calendario.' });
    }
    const yo = await perfil(tokens.access_token);
    const persona = await guardarConexion({
      email: yo.email,
      nombre: yo.name || yo.email.split('@')[0],
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    });
    return volver({ conectado: persona.nombre });
  } catch (err: any) {
    console.error('calendario/callback:', err);
    return volver({ error: err?.message || 'No se pudo completar la conexión' });
  }
}
