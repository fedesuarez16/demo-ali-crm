// Carga la config de la rueda desde rueda_config (fila id=1) fusionada sobre los defaults.
// Si la fila falta, es inválida o la consulta falla, usa DEFAULT_RUEDA_CONFIG (nunca rompe).
import type { RuedaConfig } from '@/app/types';
import { DEFAULT_RUEDA_CONFIG, mergeConfig } from '@/app/utils/ruedaScoring';
import { getSupabase } from './supabase';

export async function loadConfig(supabase: any = getSupabase()): Promise<RuedaConfig> {
  try {
    const { data, error } = await supabase.from('rueda_config').select('params').eq('id', 1).maybeSingle();
    if (error || !data) return mergeConfig(null);
    return mergeConfig(data.params);
  } catch {
    return { ...DEFAULT_RUEDA_CONFIG, pesos: { ...DEFAULT_RUEDA_CONFIG.pesos } };
  }
}

export async function saveConfig(config: RuedaConfig, supabase: any = getSupabase()): Promise<void> {
  const { error } = await supabase
    .from('rueda_config')
    .upsert({ id: 1, params: config, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}
