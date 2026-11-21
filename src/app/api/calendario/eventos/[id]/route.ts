import { NextRequest, NextResponse } from 'next/server';
import { autenticar } from '@/lib/calendario/auth';
import { enteroPositivo, responderError } from '@/lib/calendario/respuesta';
import { cancelarEvento } from '@/lib/calendario/servicio';

/** DELETE /api/calendario/eventos/:id -> cancela un evento creado por el CRM/bot (lo borra de Google) */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await autenticar(request, ['crm']);
  if (auth instanceof NextResponse) return auth;
  const id = enteroPositivo((await params).id);
  if (!id) return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  try {
    await cancelarEvento(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return responderError(err, 'calendario/eventos DELETE');
  }
}
