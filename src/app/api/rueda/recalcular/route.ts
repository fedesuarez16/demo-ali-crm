import { NextRequest, NextResponse } from 'next/server';
import { requireCrmSession } from '@/lib/requireCrmSession';
import { normalizarPedido, recalcular } from '@/lib/rueda/recalcular';

export const maxDuration = 60;

/**
 * POST /api/rueda/recalcular { busquedaIds?: number[], propiedadIds?: number[], all?: boolean }
 * Normaliza lo obsoleto (<= 25 LLM por request) y sincroniza rueda_matches. Idempotente.
 * El cliente manda chunks de 10 ids; con all=true repite hasta stale_restantes = 0.
 */
export async function POST(request: NextRequest) {
  const noAuth = await requireCrmSession(request);
  if (noAuth) return noAuth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const pedido = normalizarPedido(body);
  if (!pedido.all && !pedido.busquedaIds?.length && !pedido.propiedadIds?.length) {
    return NextResponse.json({ error: 'Indicá busquedaIds, propiedadIds o all' }, { status: 400 });
  }
  if ((pedido.busquedaIds?.length ?? 0) > 50 || (pedido.propiedadIds?.length ?? 0) > 50) {
    return NextResponse.json({ error: 'Máximo 50 ids por request' }, { status: 400 });
  }

  try {
    return NextResponse.json(await recalcular(pedido));
  } catch (err: any) {
    console.error('rueda/recalcular:', err);
    return NextResponse.json({ error: err?.message || 'Error inesperado' }, { status: 500 });
  }
}
