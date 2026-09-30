import { NextRequest, NextResponse } from 'next/server';

// Usage & Cost Admin API de Anthropic (raw HTTP: no está en el SDK).
// Requiere una Admin API key (sk-ant-admin...), solo server-side.
const COST_REPORT_URL = 'https://api.anthropic.com/v1/organizations/cost_report';
const MAX_BUCKETS_PER_PAGE = 31;
const MAX_PAGES = 30; // ~2,5 años de días; corta loops si la API se comporta raro
const CACHE_TTL_MS = 5 * 60 * 1000; // la API recomienda no pollear más de 1/min

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface CostReportResult {
  amount: string;
  currency: string;
  description: string | null;
  model: string | null;
  cost_type: string | null;
  token_type: string | null;
}

interface CostReportPage {
  data: Array<{ starting_at: string; ending_at: string; results: CostReportResult[] }>;
  has_more: boolean;
  next_page: string | null;
}

export interface AnthropicCostRow {
  dia: string;
  model: string | null;
  cost_type: string | null;
  token_type: string | null;
  description: string | null;
  usd: number;
}

const cache = new Map<string, { at: number; rows: AnthropicCostRow[] }>();

function nextDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function fetchCostReport(adminKey: string, desde: string, hasta: string): Promise<AnthropicCostRow[]> {
  const rows: AnthropicCostRow[] = [];
  let page: string | null = null;

  for (let i = 0; i < MAX_PAGES; i++) {
    const params = new URLSearchParams({
      starting_at: `${desde}T00:00:00Z`,
      ending_at: `${nextDay(hasta)}T00:00:00Z`,
      bucket_width: '1d',
      limit: String(MAX_BUCKETS_PER_PAGE),
    });
    params.append('group_by[]', 'description');
    if (page) params.set('page', page);

    const res = await fetch(`${COST_REPORT_URL}?${params}`, {
      headers: {
        'anthropic-version': '2023-06-01',
        'x-api-key': adminKey,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic cost_report ${res.status}: ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as CostReportPage;
    for (const bucket of json.data) {
      const dia = bucket.starting_at.slice(0, 10);
      for (const r of bucket.results) {
        // amount viene en centavos como string decimal ("123.45" = USD 1,2345)
        const cents = parseFloat(r.amount);
        if (!Number.isFinite(cents) || cents === 0) continue;
        rows.push({
          dia,
          model: r.model,
          cost_type: r.cost_type,
          token_type: r.token_type,
          description: r.description,
          usd: cents / 100,
        });
      }
    }

    if (!json.has_more || !json.next_page) break;
    page = json.next_page;
  }

  return rows;
}

/**
 * GET /api/gastos/anthropic?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Costo real facturado por Anthropic a la organización, por día y modelo (días en UTC).
 */
export async function GET(request: NextRequest) {
  const desde = request.nextUrl.searchParams.get('desde') ?? '';
  const hasta = request.nextUrl.searchParams.get('hasta') ?? '';

  if (!DATE_RE.test(desde) || !DATE_RE.test(hasta)) {
    return NextResponse.json({ error: 'Parámetros desde/hasta inválidos (YYYY-MM-DD)' }, { status: 400 });
  }

  const adminKey = process.env.ANTHROPIC_ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json({ error: 'Falta ANTHROPIC_ADMIN_KEY en el entorno' }, { status: 500 });
  }

  const cacheKey = `${desde}|${hasta}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json({ rows: cached.rows });
  }

  try {
    const rows = await fetchCostReport(adminKey, desde, hasta);
    if (cache.size >= 50) cache.clear();
    cache.set(cacheKey, { at: Date.now(), rows });
    return NextResponse.json({ rows });
  } catch (error) {
    console.error('Error al obtener cost_report de Anthropic:', error);
    return NextResponse.json({ error: 'Error al consultar la API de Anthropic' }, { status: 502 });
  }
}
