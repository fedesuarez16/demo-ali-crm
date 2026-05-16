import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Hardcoded — single production target per project. If a second toggle target is ever needed,
// promote to env (N8N_SEGUIMIENTO_WORKFLOW_ID). Do not change without coordinating with the operator.
const WORKFLOW_ID = 'LbBE3PePXgn3mhZc';

class MissingConfigError extends Error {
  constructor(public missing: string[]) {
    super('Missing n8n configuration');
  }
}

class UpstreamError extends Error {
  constructor(public status: number, public detail: string) {
    super(`n8n ${status}: ${detail}`);
  }
}

function getN8nConfig(): { baseUrl: string; apiKey: string } {
  const rawBase = process.env.N8N_BASE_URL;
  const rawKey = process.env.N8N_API_KEY;
  const missing: string[] = [];
  if (!rawBase) missing.push('N8N_BASE_URL');
  if (!rawKey) missing.push('N8N_API_KEY');
  if (missing.length > 0) throw new MissingConfigError(missing);
  return {
    baseUrl: rawBase!.replace(/\/$/, ''),
    apiKey: rawKey!,
  };
}

async function n8nFetch(path: string, init?: RequestInit): Promise<unknown> {
  const { baseUrl, apiKey } = getN8nConfig();
  const url = `${baseUrl}/api/v1${path}`;
  const headers: Record<string, string> = {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new UpstreamError(res.status, text || res.statusText);
  }
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function readActiveState(): Promise<{ active: boolean; name: string }> {
  const data = await n8nFetch('/workflows/' + WORKFLOW_ID, { method: 'GET' });
  if (
    typeof (data as Record<string, unknown>)?.active !== 'boolean' ||
    typeof (data as Record<string, unknown>)?.name !== 'string'
  ) {
    throw new UpstreamError(502, 'malformed workflow response');
  }
  const { active, name } = data as { active: boolean; name: string };
  return { active, name };
}

export async function GET(): Promise<NextResponse> {
  try {
    const { active, name } = await readActiveState();
    return NextResponse.json({ active, name });
  } catch (err) {
    if (err instanceof MissingConfigError) {
      return NextResponse.json(
        { error: 'Missing n8n configuration', missing: err.missing },
        { status: 500 },
      );
    }
    if (err instanceof UpstreamError) {
      return NextResponse.json(
        { error: err.message, upstream_status: err.status },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: 'n8n unreachable', upstream_status: 0 },
      { status: 502 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Acción inválida. Valores permitidos: activate, deactivate' }, { status: 400 });
  }

  const action = (body as Record<string, unknown>)?.action;
  if (action !== 'activate' && action !== 'deactivate') {
    return NextResponse.json({ error: 'Acción inválida. Valores permitidos: activate, deactivate' }, { status: 400 });
  }

  try {
    getN8nConfig();
  } catch (err) {
    if (err instanceof MissingConfigError) {
      return NextResponse.json(
        { error: 'Missing n8n configuration', missing: err.missing },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
  }

  let postError: UpstreamError | undefined;
  try {
    await n8nFetch('/workflows/' + WORKFLOW_ID + '/' + action, { method: 'POST' });
  } catch (err) {
    if (err instanceof UpstreamError) {
      postError = err;
    }
  }

  let state: { active: boolean; name: string };
  try {
    state = await readActiveState();
  } catch (err) {
    const upErr = err instanceof UpstreamError ? err : new UpstreamError(0, String(err));
    return NextResponse.json(
      { error: 'toggle issued but state read failed: ' + upErr.detail, upstream_status: upErr.status },
      { status: 502 },
    );
  }

  const expectedActive = action === 'activate';
  if (state.active !== expectedActive) {
    return NextResponse.json(
      {
        error: 'toggle did not take effect',
        upstream_status: postError?.status ?? 200,
        active: state.active,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ active: state.active, name: state.name });
}
