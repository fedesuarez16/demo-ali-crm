// Variables de entorno del calendario (server-only). Fallan lazy: tiran al primer uso, no en build.
//
//   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET  OAuth client "Web application" del proyecto GCP del Workspace
//   GOOGLE_REDIRECT_URI                      opcional; default <origin>/api/calendario/google/callback
//   CALENDARIO_SECRET                        clave para cifrar tokens y firmar el state OAuth (string largo)
//   CALENDARIO_API_TOKEN                     Bearer con el que n8n llama a /api/calendario/*
//   SUPABASE_SERVICE_ROLE_KEY                obligatoria: calendario_personas no tiene policies para anon

import { createClient } from '@supabase/supabase-js';

function requerida(nombre: string, valor: string | undefined): string {
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

export function googleClient() {
  return {
    clientId: requerida('GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID),
    clientSecret: requerida('GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET),
  };
}

export function redirectUri(origin: string): string {
  return process.env.GOOGLE_REDIRECT_URI || `${origin}/api/calendario/google/callback`;
}

export function calendarioSecret(): string {
  const s = requerida('CALENDARIO_SECRET', process.env.CALENDARIO_SECRET);
  if (s.length < 32) throw new Error('CALENDARIO_SECRET debe tener al menos 32 caracteres');
  return s;
}

export function calendarioApiToken(): string | null {
  return process.env.CALENDARIO_API_TOKEN || null;
}

let client: ReturnType<typeof createClient> | null = null;

/** Cliente con service role (sin fallback a anon: la tabla de personas está cerrada a anon) */
export function getSupabase(): any {
  if (client) return client as any;
  const url = requerida('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = requerida('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client as any;
}
