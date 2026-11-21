import { NextResponse } from 'next/server';
import { GoogleError } from './google';
import { CalendarioError } from './servicio';

/** Errores con forma estable para el CRM y para el bot: { error, codigo } */
export function responderError(err: unknown, contexto: string): NextResponse {
  if (err instanceof CalendarioError) {
    return NextResponse.json({ error: err.message, codigo: err.codigo }, { status: err.status });
  }
  if (err instanceof GoogleError) {
    console.error(`${contexto}:`, err.message);
    return NextResponse.json({ error: err.message, codigo: 'google' }, { status: 502 });
  }
  console.error(`${contexto}:`, err);
  const message = err instanceof Error ? err.message : 'Error inesperado';
  return NextResponse.json({ error: message, codigo: 'interno' }, { status: 500 });
}

export function enteroPositivo(valor: unknown): number | null {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}
