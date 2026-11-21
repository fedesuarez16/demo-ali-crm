import { NextRequest, NextResponse } from 'next/server';
import { autenticar } from '@/lib/calendario/auth';
import { responderError } from '@/lib/calendario/respuesta';
import { listarPersonas, personaPublica } from '@/lib/calendario/servicio';

/** GET /api/calendario/personas -> personas vinculadas (nunca devuelve tokens) */
export async function GET(request: NextRequest) {
  const auth = await autenticar(request);
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json({ personas: (await listarPersonas()).map(personaPublica) });
  } catch (err) {
    return responderError(err, 'calendario/personas');
  }
}
