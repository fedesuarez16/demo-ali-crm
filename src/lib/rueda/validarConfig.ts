// Validación pura del PUT /api/rueda/config. Devuelve la config completa lista para guardar.
import type { RuedaConfig } from '@/app/types';
import { DEFAULT_RUEDA_CONFIG, esTablaZonas } from '@/app/utils/ruedaScoring';

export type ResultadoConfig = { ok: true; config: RuedaConfig } | { ok: false; errores: string[] };

const esNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const enRango = (v: unknown, min: number, max: number): v is number => esNum(v) && v >= min && v <= max;

export function validarConfig(input: unknown, base: RuedaConfig = DEFAULT_RUEDA_CONFIG): ResultadoConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errores: ['El cuerpo debe ser un objeto de configuración'] };
  }
  const r = input as Record<string, unknown>;
  const errores: string[] = [];
  const config: RuedaConfig = { ...base, pesos: { ...base.pesos } };

  if (r.pesos !== undefined) {
    if (!r.pesos || typeof r.pesos !== 'object' || Array.isArray(r.pesos)) {
      errores.push('pesos debe ser un objeto');
    } else {
      const p = r.pesos as Record<string, unknown>;
      for (const k of Object.keys(config.pesos) as Array<keyof RuedaConfig['pesos']>) {
        if (p[k] === undefined) continue;
        if (!esNum(p[k]) || (p[k] as number) < 0) errores.push(`El peso "${k}" debe ser un número mayor o igual a 0`);
        else config.pesos[k] = p[k] as number;
      }
    }
  }
  if (!errores.length && Object.values(config.pesos).reduce((a, b) => a + b, 0) <= 0) {
    errores.push('Al menos un peso debe ser mayor a 0');
  }

  if (r.precio_tolerancia !== undefined) {
    if (!enRango(r.precio_tolerancia, 0, 1)) errores.push('precio_tolerancia debe estar entre 0 y 1');
    else config.precio_tolerancia = r.precio_tolerancia;
  }
  if (r.umbral !== undefined) {
    if (!enRango(r.umbral, 0, 100)) errores.push('umbral debe estar entre 0 y 100');
    else config.umbral = r.umbral;
  }
  if (r.zona_mismatch_multiplicador !== undefined) {
    if (!enRango(r.zona_mismatch_multiplicador, 0, 1)) errores.push('zona_mismatch_multiplicador debe estar entre 0 y 1');
    else config.zona_mismatch_multiplicador = r.zona_mismatch_multiplicador;
  }
  if (r.zona_cercana_credito !== undefined) {
    if (!enRango(r.zona_cercana_credito, 0, 1)) errores.push('zona_cercana_credito debe estar entre 0 y 1');
    else config.zona_cercana_credito = r.zona_cercana_credito;
  }
  if (r.zonas !== undefined) {
    if (!esTablaZonas(r.zonas)) errores.push('zonas debe ser una lista de { nombre (no vacío), alias[], vecinas[] } con textos');
    else config.zonas = r.zonas;
  }
  if (r.peso_minimo_evaluado !== undefined) {
    if (!esNum(r.peso_minimo_evaluado) || r.peso_minimo_evaluado < 0) errores.push('peso_minimo_evaluado debe ser mayor o igual a 0');
    else config.peso_minimo_evaluado = r.peso_minimo_evaluado;
  }
  for (const k of ['precio_fuera_tolerancia_elimina', 'tipo_eliminatorio'] as const) {
    if (r[k] === undefined) continue;
    if (typeof r[k] !== 'boolean') errores.push(`${k} debe ser booleano`);
    else config[k] = r[k] as boolean;
  }
  if (r.moneda_default !== undefined) {
    if (r.moneda_default !== 'USD' && r.moneda_default !== 'ARS') errores.push('moneda_default debe ser USD o ARS');
    else config.moneda_default = r.moneda_default;
  }
  if (r.ars_por_usd !== undefined) {
    if (r.ars_por_usd === null) config.ars_por_usd = null;
    else if (!esNum(r.ars_por_usd) || r.ars_por_usd <= 0) errores.push('ars_por_usd debe ser null o un número mayor a 0');
    else config.ars_por_usd = r.ars_por_usd;
  }

  return errores.length ? { ok: false, errores } : { ok: true, config };
}
