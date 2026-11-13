import { NextRequest, NextResponse } from 'next/server';
import { requireCrmSession } from '@/lib/requireCrmSession';
import { getSupabase } from '@/lib/rueda/supabase';

/** GET /api/rueda/nuevos/count -> { count } de matches estado='nuevo' y no bajo_umbral. */
export async function GET(request: NextRequest) {
  const noAuth = await requireCrmSession(request);
  if (noAuth) return noAuth;

  try {
    const { count, error } = await getSupabase()
      .from('rueda_matches')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'nuevo')
      .eq('bajo_umbral', false);
    if (error) throw new Error(error.message);
    return NextResponse.json({ count: count ?? 0 });
  } catch (err: any) {
    console.error('rueda/nuevos/count:', err);
    return NextResponse.json({ error: err?.message || 'Error inesperado' }, { status: 500 });
  }
}
