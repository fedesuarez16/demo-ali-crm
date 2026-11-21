import { NextRequest, NextResponse } from 'next/server';
import { autenticar } from '@/lib/calendario/auth';
import { getSupabase } from '@/lib/calendario/config';
import { enteroPositivo, responderError } from '@/lib/calendario/respuesta';
import { desconectarPersona, personaPublica } from '@/lib/calendario/servicio';

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/calendario/personas/:id { nombre?, activo?, zona_horaria?, google_calendar_id? } */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await autenticar(request, ['crm']);
  if (auth instanceof NextResponse) return auth;
  const id = enteroPositivo((await params).id);
  if (!id) return NextResponse.json({ error: 'id inválido' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const cambios: Record<string, unknown> = {};
  if (typeof body?.nombre === 'string' && body.nombre.trim()) cambios.nombre = body.nombre.trim();
  if (typeof body?.activo === 'boolean') cambios.activo = body.activo;
  if (typeof body?.google_calendar_id === 'string' && body.google_calendar_id.trim()) cambios.google_calendar_id = body.google_calendar_id.trim();
  if (typeof body?.zona_horaria === 'string') {
    try {
      new Intl.DateTimeFormat('es', { timeZone: body.zona_horaria });
      cambios.zona_horaria = body.zona_horaria;
    } catch {
      return NextResponse.json({ error: 'zona_horaria inválida (ej. America/Argentina/Buenos_Aires)' }, { status: 400 });
    }
  }
  if (!Object.keys(cambios).length) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });

  try {
    const { data, error } = await getSupabase()
      .from('calendario_personas')
      .update({ ...cambios, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
    return NextResponse.json({ persona: personaPublica(data) });
  } catch (err) {
    return responderError(err, 'calendario/personas PATCH');
  }
}

/** DELETE /api/calendario/personas/:id -> revoca el acceso en Google y borra los tokens (la persona queda listada) */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const auth = await autenticar(request, ['crm']);
  if (auth instanceof NextResponse) return auth;
  const id = enteroPositivo((await params).id);
  if (!id) return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  try {
    await desconectarPersona(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return responderError(err, 'calendario/personas DELETE');
  }
}
