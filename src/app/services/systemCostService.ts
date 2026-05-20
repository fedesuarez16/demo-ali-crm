import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

let supabaseClient: ReturnType<typeof createClient> | null = null;
const getSupabase = () => {
  if (supabaseClient) return supabaseClient;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars missing. Define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
};

export interface SystemCosts {
  hosting: number;
  openai:  number;
  claude:  number;
}

const ZERO: SystemCosts = { hosting: 0, openai: 0, claude: 0 };

function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function getSystemCosts(): Promise<SystemCosts> {
  const supabase = getSupabase();
  const { data, error } = await (supabase as any)
    .from('system_costs')
    .select('hosting, openai, claude')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Error al obtener system_costs:', error);
    return ZERO;
  }
  if (!data) return ZERO;

  return {
    hosting: toNumber(data.hosting),
    openai:  toNumber(data.openai),
    claude:  toNumber(data.claude),
  };
}

export async function updateSystemCosts(costs: SystemCosts): Promise<SystemCosts> {
  const supabase = getSupabase();
  const payload = {
    hosting: toNumber(costs.hosting),
    openai:  toNumber(costs.openai),
    claude:  toNumber(costs.claude),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase as any)
    .from('system_costs')
    .update(payload)
    .eq('id', 1)
    .select('hosting, openai, claude')
    .single();

  if (error) {
    console.error('Error al actualizar system_costs:', error);
    throw new Error(error.message ?? 'Error al actualizar system_costs');
  }

  return {
    hosting: toNumber(data.hosting),
    openai:  toNumber(data.openai),
    claude:  toNumber(data.claude),
  };
}
