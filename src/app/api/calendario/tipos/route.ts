import { NextRequest, NextResponse } from 'next/server';
import { autenticar } from '@/lib/calendario/auth';
import { getSupabase } from '@/lib/calendario/config';
import { responderError } from '@/lib/calendario/respuesta';
import { listarTipos, sanitizarTipo } from '@/lib/calendario/servicio';

/** GET /api/calendario/tipos[?activos=1] -> tipos de evento (el bot recibe solo los activos y agendables) */
export async function GET(request: NextRequest) {
  const auth = await autenticar(request);
  if (auth instanceof NextResponse) return auth;
  try {
    let tipos = await listarTipos(auth.origen === 'bot' || request.nextUrl.searchParams.get('activos') === '1');
    if (auth.origen === 'bot') tipos = tipos.filter((t) => t.agendable_por_bot);
    return NextResponse.json({ tipos });
  } catch (err) {
    return responderError(err, 'calendario/tipos');
  }
}

/** POST /api/calendario/tipos { slug, nombre, duracion_min, horario, ... } */
export async function POST(request: NextRequest) {
  const auth = await autenticar(request, ['crm']);
  if (auth instanceof NextResponse) return auth;
  try {
    const fila = sanitizarTipo(await request.json().catch(() => ({})), false);
    const { data, error } = await getSupabase().from('calendario_tipos_evento').insert(fila).select('*').single();
    if (error) {
      const status = error.code === '23505' ? 409 : 400;
      return NextResponse.json({ error: status === 409 ? 'Ya existe un tipo con ese slug' : error.message }, { status });
    }
    return NextResponse.json({ tipo: data }, { status: 201 });
  } catch (err) {
    return responderError(err, 'calendario/tipos POST');
  }
}
