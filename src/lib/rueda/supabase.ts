// Cliente Supabase server-side para la rueda: service role si existe, anon como respaldo.
import { createClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createClient> | null = null;

export function getSupabase(): any {
  if (client) return client as any;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o la key de Supabase');
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client as any;
}
