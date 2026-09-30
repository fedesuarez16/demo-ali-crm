import type { Lead } from '@/app/types';
import { campaignNumericFingerprint } from '@/app/services/leadService';

export interface Pauta {
  id: number;
  texto: string;
  activo?: boolean;
  created_at?: string;
}

export const MAX_CHART_DAYS = 731;
export const SIN_CAMPANA_SENTINEL = '__sin_campana__';

export function isPautaActiva(p: Pauta): boolean {
  return p.activo !== false;
}

/** YYYY-MM-DD en calendario local (evita desfase UTC de toISOString) */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeCampaignText(name: string): string {
  if (!name) return '';
  let normalized = name.toLowerCase().trim();
  normalized = normalized.normalize('NFD').replace(/[̀-ͯ]/g, '');
  normalized = normalized.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized;
}

function parseDateInput(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Días consecutivos inclusive, ordenados; si inicio > fin se intercambian */
export function eachDayInclusive(startStr: string, endStr: string): string[] {
  let start = parseDateInput(startStr);
  let end = parseDateInput(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  if (start > end) [start, end] = [end, start];
  const out: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= endDay) {
    out.push(toDateInputValue(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function leadCalendarDate(lead: Lead): string {
  const raw = lead.fechaContacto || lead.created_at;
  if (!raw) return toDateInputValue(new Date());
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return toDateInputValue(new Date());
  return toDateInputValue(d);
}

export function defaultPeriodEnd(): string {
  return toDateInputValue(new Date());
}

export function defaultPeriodStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return toDateInputValue(d);
}

/** Días del período (acotado a MAX_CHART_DAYS, conservando el final) */
export function resolvePeriodDates(start: string, end: string): { periodDates: string[]; periodRangeClipped: boolean } {
  const days = eachDayInclusive(start, end);
  if (days.length === 0) {
    return { periodDates: eachDayInclusive(defaultPeriodStart(), defaultPeriodEnd()), periodRangeClipped: false };
  }
  if (days.length <= MAX_CHART_DAYS) {
    return { periodDates: days, periodRangeClipped: false };
  }
  return { periodDates: days.slice(days.length - MAX_CHART_DAYS), periodRangeClipped: true };
}

/** Campañas oficiales: salen de la tabla pautas (solo activas) */
export function campaignsFromPautas(pautas: Pauta[]): string[] {
  const texts = pautas
    .filter(isPautaActiva)
    .map((p) => String(p.texto || '').trim())
    .filter(Boolean);
  return [...new Set(texts)].sort((a, b) => a.localeCompare(b, 'es'));
}

/** Mapeo lead.propiedad_interes → campaña oficial (pauta.texto) */
export function buildLeadCampaignMap(leads: Lead[], campaigns: string[]): Map<string, string> {
  const pautaByNormalized = new Map<string, string>();
  const pautaByFingerprint = new Map<string, string>();

  for (const campaign of campaigns) {
    const norm = normalizeCampaignText(campaign);
    if (norm) pautaByNormalized.set(norm, campaign);
    const fp = campaignNumericFingerprint(campaign);
    if (fp) pautaByFingerprint.set(fp, campaign);
  }

  const map = new Map<string, string>();
  for (const lead of leads) {
    const raw = String((lead as any).propiedad_interes || '').trim();
    if (!raw) continue;

    // 1) match exacto (case-insensitive / normalizado)
    const byNorm = pautaByNormalized.get(normalizeCampaignText(raw));
    if (byNorm) {
      map.set(raw, byNorm);
      continue;
    }

    // 2) match por huella numérica (une variantes como "466 e/ 24 y 25" con "466 ENTRE 24 Y 25")
    const fpLead = campaignNumericFingerprint(raw);
    if (fpLead) {
      const byFp = pautaByFingerprint.get(fpLead);
      if (byFp) map.set(raw, byFp);
    }
  }
  return map;
}

/** Leads del período filtrados por campaña ('' = todas, SIN_CAMPANA_SENTINEL = sin campaña) */
export function filterLeadsByPeriodAndCampaign(
  leads: Lead[],
  periodDates: string[],
  leadCampaignMap: Map<string, string>,
  campaignFilter: string,
): Lead[] {
  const periodSet = new Set(periodDates);
  const out: Lead[] = [];
  for (const lead of leads) {
    if (!periodSet.has(leadCalendarDate(lead))) continue;
    const raw = String((lead as any).propiedad_interes || '').trim();
    if (campaignFilter === '') {
      out.push(lead);
    } else if (campaignFilter === SIN_CAMPANA_SENTINEL) {
      if (!leadCampaignMap.has(raw)) out.push(lead);
    } else if (leadCampaignMap.get(raw) === campaignFilter) {
      out.push(lead);
    }
  }
  return out;
}
