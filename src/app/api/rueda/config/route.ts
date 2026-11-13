import { NextRequest, NextResponse } from 'next/server';
import { requireCrmSession } from '@/lib/requireCrmSession';
import { loadConfig, saveConfig } from '@/lib/rueda/config';
import { recalcular } from '@/lib/rueda/recalcular';
import { validarConfig } from '@/lib/rueda/validarConfig';

export const maxDuration = 60;

/** GET /api/rueda/config -> { config } (defaults si falta la fila). */
export async function GET(request: NextRequest) {
  const noAuth = await requireCrmSession(request);
  if (noAuth) return noAuth;
  try {
    return NextResponse.json({ config: await loadConfig() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error inesperado' }, { status: 500 });
  }
}

/**
 * PUT /api/rueda/config { ...parámetros, recalcular?: boolean }
 * Valida (pesos >= 0 con alguno > 0, tolerancia [0,1], umbral [0,100]), guarda y,
 * salvo recalcular=false, dispara un recalcular all (un pase; el cliente puede repetir hasta stale_restantes = 0).
 */
export async function PUT(request: NextRequest) {
  const noAuth = await requireCrmSession(request);
  if (noAuth) return noAuth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const { recalcular: debeRecalcular, ...params } = body ?? {};

  try {
    const actual = await loadConfig();
    const v = validarConfig(params, actual);
    if (!v.ok) return NextResponse.json({ error: 'Configuración inválida', errores: v.errores }, { status: 400 });

    await saveConfig(v.config);
    let resumen = null;
    if (debeRecalcular !== false) {
      try {
        resumen = await recalcular({ all: true });
      } catch (err: any) {
        console.warn('rueda/config: recalcular all falló', err?.message);
      }
    }
    return NextResponse.json({ config: v.config, recalculo: resumen });
  } catch (err: any) {
    console.error('rueda/config PUT:', err);
    return NextResponse.json({ error: err?.message || 'Error inesperado' }, { status: 500 });
  }
}
