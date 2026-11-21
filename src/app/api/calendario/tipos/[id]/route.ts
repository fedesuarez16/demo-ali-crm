import { NextRequest, NextResponse } from 'next/server';
import { autenticar } from '@/lib/calendario/auth';
import { getSupabase } from '@/lib/calendario/config';
import { enteroPositivo, responderError } from '@/lib/calendario/respuesta';
import { sanitizarTipo } from '@/lib/calendario/servicio';

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/calendario/tipos/:id { ...campos parciales } */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await autenticar(request, ['crm']);
  if (auth instanceof NextResponse) return auth;
  const id = enteroPositivo((await params).id);
  if (!id) return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  try {
    const cambios = sanitizarTipo(await request.json().catch(() => ({})), true);
    if (!Object.keys(cambios).length) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
    const { data, error } = await getSupabase()
      .from('calendario_tipos_evento')
      .update({ ...cambios, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'Ya existe un tipo con ese slug' : error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: 'Tipo no encontrado' }, { status: 404 });
    return NextResponse.json({ tipo: data });
  } catch (err) {
    return responderError(err, 'calendario/tipos PATCH');
  }
}

/** DELETE /api/calendario/tipos/:id -> los eventos ya creados quedan (tipo_evento_id pasa a NULL) */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const auth = await autenticar(request, ['crm']);
  if (auth instanceof NextResponse) return auth;
  const id = enteroPositivo((await params).id);
  if (!id) return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  try {
    const { error } = await getSupabase().from('calendario_tipos_evento').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return responderError(err, 'calendario/tipos DELETE');
  }
}
