import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Las vistas metrics_* solo son legibles con service_role (anon no tiene SELECT).
// Este cliente vive únicamente en el server: la key nunca llega al browser.
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

const getSupabaseAdmin = () => {
  if (supabaseAdmin) return supabaseAdmin;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }

  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseAdmin;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function nextDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/gastos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Gastos de Anthropic y Apify de la app de búsquedas (mismo proyecto Supabase).
 */
export async function GET(request: NextRequest) {
  const desde = request.nextUrl.searchParams.get('desde') ?? '';
  const hasta = request.nextUrl.searchParams.get('hasta') ?? '';

  if (!DATE_RE.test(desde) || !DATE_RE.test(hasta)) {
    return NextResponse.json({ error: 'Parámetros desde/hasta inválidos (YYYY-MM-DD)' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin() as any;

    const [llm, apify, fuentes, jobs] = await Promise.all([
      supabase
        .from('metrics_llm_daily')
        .select('dia, scope, model, llamadas, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, cost_usd')
        .gte('dia', desde)
        .lte('dia', hasta)
        .order('dia', { ascending: true }),
      supabase
        .from('metrics_apify_daily')
        .select('dia, jobs, jobs_ok, jobs_error, cost_usd, cost_usd_desperdiciado, props, jobs_costo_desconocido')
        .gte('dia', desde)
        .lte('dia', hasta)
        .order('dia', { ascending: true }),
      supabase
        .from('metrics_apify_source_spend')
        .select('fuente, cost_usd, runs, jobs, primer_uso, ultimo_uso')
        .order('cost_usd', { ascending: false }),
      supabase
        .from('metrics_job_costs')
        .select('job_id, query_raw, zona, estado, creado_at, apify_cost_usd, llm_cost_usd, total_cost_usd, props_match, costo_por_prop_util')
        .gte('creado_at', desde)
        .lt('creado_at', nextDay(hasta))
        .order('total_cost_usd', { ascending: false, nullsFirst: false })
        .limit(50),
    ]);

    const firstError = llm.error || apify.error || fuentes.error || jobs.error;
    if (firstError) {
      console.error('Error al obtener gastos:', firstError);
      return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 });
    }

    return NextResponse.json({
      llmDaily: llm.data ?? [],
      apifyDaily: apify.data ?? [],
      apifySources: fuentes.data ?? [],
      jobs: jobs.data ?? [],
    });
  } catch (error) {
    console.error('Error al obtener gastos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
