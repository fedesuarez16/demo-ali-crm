'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout';
import { getSystemCosts, updateSystemCosts, type SystemCosts } from '@/app/services/systemCostService';
import { DashboardAuthGate } from '@/app/components/DashboardAuthGate';
import { PeriodoSelector } from '@/app/components/PeriodoSelector';
import { ChartAreaInteractive } from '@/components/ui/chart-area-interactive';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig } from '@/components/ui/chart';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  defaultPeriodEnd,
  defaultPeriodStart,
  resolvePeriodDates,
} from '@/app/utils/periodo';

/** Días promedio de un mes, para prorratear el gasto mensual al período */
const DIAS_POR_MES = 30.4375;

interface LlmDailyRow {
  dia: string;
  scope: string | null;
  model: string | null;
  llamadas: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  cost_usd: number;
}

interface ApifyDailyRow {
  dia: string;
  jobs: number;
  jobs_ok: number;
  jobs_error: number;
  cost_usd: number;
  cost_usd_desperdiciado: number;
  props: number;
  jobs_costo_desconocido: number;
}

interface ApifySourceRow {
  fuente: string;
  cost_usd: number;
  runs: number;
  jobs: number;
  primer_uso: string | null;
  ultimo_uso: string | null;
}

interface JobCostRow {
  job_id: string;
  query_raw: string | null;
  zona: string | null;
  estado: string | null;
  creado_at: string;
  apify_cost_usd: number | null;
  llm_cost_usd: number | null;
  total_cost_usd: number | null;
  props_match: number | null;
  costo_por_prop_util: number | null;
}

interface GastosExternos {
  llmDaily: LlmDailyRow[];
  apifyDaily: ApifyDailyRow[];
  apifySources: ApifySourceRow[];
  jobs: JobCostRow[];
}

/** numeric/bigint pueden llegar como string desde PostgREST */
function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

function parseCost(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const usdFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const usdFineFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 4,
  minimumFractionDigits: 4,
});

const compactFormatter = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });
const intFormatter = new Intl.NumberFormat('es-AR');

const gastoDiarioChartConfig: ChartConfig = {
  anthropic: { label: 'Anthropic', color: '#D97706' },
  apify: { label: 'Apify', color: '#10B981' },
};

function GastosContent() {
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd);
  const [hostingCost, setHostingCost] = useState<string>('');
  const [openaiCost, setOpenaiCost] = useState<string>('');
  const [claudeCost, setClaudeCost] = useState<string>('');
  const [mantenimientoCost, setMantenimientoCost] = useState<string>('');
  const [costsSaveStatus, setCostsSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [externos, setExternos] = useState<GastosExternos | null>(null);
  const [externosLoading, setExternosLoading] = useState(true);
  const [externosError, setExternosError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const costs = await getSystemCosts();
        if (cancelled) return;
        setHostingCost(costs.hosting > 0 ? String(costs.hosting) : '');
        setOpenaiCost(costs.openai > 0 ? String(costs.openai) : '');
        setClaudeCost(costs.claude > 0 ? String(costs.claude) : '');
        setMantenimientoCost(costs.mantenimiento > 0 ? String(costs.mantenimiento) : '');
      } catch (e) {
        console.error('Error cargando system_costs:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persistCosts = async (overrides?: Partial<SystemCosts>) => {
    const next: SystemCosts = {
      hosting: overrides?.hosting ?? parseCost(hostingCost),
      openai:  overrides?.openai  ?? parseCost(openaiCost),
      claude:  overrides?.claude  ?? parseCost(claudeCost),
      mantenimiento: overrides?.mantenimiento ?? parseCost(mantenimientoCost),
    };
    setCostsSaveStatus('saving');
    try {
      await updateSystemCosts(next);
      setCostsSaveStatus('saved');
      setTimeout(() => {
        setCostsSaveStatus(prev => (prev === 'saved' ? 'idle' : prev));
      }, 1500);
    } catch (e) {
      console.error('Error guardando system_costs:', e);
      setCostsSaveStatus('error');
    }
  };

  const { periodDates, periodRangeClipped } = useMemo(
    () => resolvePeriodDates(periodStart, periodEnd),
    [periodStart, periodEnd],
  );
  const desde = periodDates[0];
  const hasta = periodDates[periodDates.length - 1];

  useEffect(() => {
    if (!desde || !hasta) return;
    const controller = new AbortController();
    setExternosLoading(true);
    setExternosError(null);
    (async () => {
      try {
        const res = await fetch(`/api/gastos?desde=${desde}&hasta=${hasta}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setExternos(data as GastosExternos);
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error('Error cargando gastos externos:', e);
        setExternosError(e instanceof Error ? e.message : 'Error desconocido');
        setExternos(null);
      } finally {
        if (!controller.signal.aborted) setExternosLoading(false);
      }
    })();
    return () => controller.abort();
  }, [desde, hasta]);

  const totalMensual =
    parseCost(hostingCost) + parseCost(openaiCost) + parseCost(claudeCost) + parseCost(mantenimientoCost);
  const periodDayCount = periodDates.length;
  const gastoPeriodo = (totalMensual / DIAS_POR_MES) * periodDayCount;

  const resumenExterno = useMemo(() => {
    const llmDaily = externos?.llmDaily ?? [];
    const apifyDaily = externos?.apifyDaily ?? [];
    const anthropic = llmDaily.reduce((s, r) => s + num(r.cost_usd), 0);
    const llamadas = llmDaily.reduce((s, r) => s + num(r.llamadas), 0);
    const apify = apifyDaily.reduce((s, r) => s + num(r.cost_usd), 0);
    const apifyDesperdiciado = apifyDaily.reduce((s, r) => s + num(r.cost_usd_desperdiciado), 0);
    const jobs = apifyDaily.reduce((s, r) => s + num(r.jobs), 0);
    const jobsError = apifyDaily.reduce((s, r) => s + num(r.jobs_error), 0);
    const jobsCostoDesconocido = apifyDaily.reduce((s, r) => s + num(r.jobs_costo_desconocido), 0);
    return {
      anthropic,
      llamadas,
      apify,
      apifyDesperdiciado,
      jobs,
      jobsError,
      jobsCostoDesconocido,
      // Con jobs de costo desconocido, el total de Apify es un piso
      esPiso: jobsCostoDesconocido > 0,
      total: anthropic + apify,
    };
  }, [externos]);

  const gastoDiario = useMemo(() => {
    const byDay: Record<string, { anthropic: number; apify: number }> = {};
    periodDates.forEach((d) => { byDay[d] = { anthropic: 0, apify: 0 }; });
    for (const r of externos?.llmDaily ?? []) {
      if (byDay[r.dia]) byDay[r.dia].anthropic += num(r.cost_usd);
    }
    for (const r of externos?.apifyDaily ?? []) {
      if (byDay[r.dia]) byDay[r.dia].apify += num(r.cost_usd);
    }
    return periodDates.map((date) => ({
      date,
      anthropic: Number(byDay[date].anthropic.toFixed(4)),
      apify: Number(byDay[date].apify.toFixed(4)),
    }));
  }, [externos, periodDates]);

  const anthropicPorModelo = useMemo(() => {
    const map = new Map<string, {
      scope: string; model: string; llamadas: number; input: number; output: number; cache: number; cost: number;
    }>();
    for (const r of externos?.llmDaily ?? []) {
      const scope = r.scope || '—';
      const model = r.model || '—';
      const key = `${scope}|${model}`;
      const e = map.get(key) ?? { scope, model, llamadas: 0, input: 0, output: 0, cache: 0, cost: 0 };
      e.llamadas += num(r.llamadas);
      e.input += num(r.input_tokens);
      e.output += num(r.output_tokens);
      e.cache += num(r.cache_creation_tokens) + num(r.cache_read_tokens);
      e.cost += num(r.cost_usd);
      map.set(key, e);
    }
    return [...map.values()].sort((a, b) => b.cost - a.cost);
  }, [externos]);

  const pisoPrefix = resumenExterno.esPiso ? '≥ ' : '';
  const gastoPropSearch = resumenExterno.total;
  const totalGeneral = gastoPeriodo + gastoPropSearch;
  const shareCrm = totalGeneral > 0 ? gastoPeriodo / totalGeneral : 0;
  const sharePropSearch = totalGeneral > 0 ? gastoPropSearch / totalGeneral : 0;
  const apifySources = externos?.apifySources ?? [];
  const jobs = externos?.jobs ?? [];

  return (
    <AppLayout>
      <div className="mb-12 m-2 px-2 space-y-8">
        {/* Breadcrumbs */}
        <div className="pl-16 pr-3 py-3 lg:px-3 z-10 sticky top-0 bg-white border-b border-slate-200">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-600">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                  </svg>
                  Inicio
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                  </svg>
                  <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Gastos</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>

        <div className="mx-auto max-w-6xl space-y-8">
          {/* ───────────── HEADER ───────────── */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Gastos</h1>
              <p className="text-sm text-muted-foreground">
                Montos en USD · {periodDayCount} {periodDayCount === 1 ? 'día' : 'días'}
              </p>
            </div>
            <PeriodoSelector
              idPrefix="gastos"
              variant="inline"
              start={periodStart}
              end={periodEnd}
              onStartChange={setPeriodStart}
              onEndChange={setPeriodEnd}
              clipped={periodRangeClipped}
            />
          </header>

          {externosError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              No se pudieron cargar los gastos de PropSearch: {externosError}
            </p>
          )}

          {/* ───────────── TOTAL COMBINADO ───────────── */}
          <Card className="shadow-none">
            <CardContent className="space-y-5 p-6">
              <div>
                <p className="text-sm text-muted-foreground">Gasto total del período</p>
                <div className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-slate-900">
                  {externosLoading ? <Skeleton className="h-10 w-40" /> : `${pisoPrefix}${usdFormatter.format(totalGeneral)}`}
                </div>
              </div>

              <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="bg-slate-800 transition-all" style={{ width: `${shareCrm * 100}%` }} />
                <div className="bg-amber-500 transition-all" style={{ width: `${sharePropSearch * 100}%` }} />
              </div>

              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-800" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-muted-foreground">CRM · costos fijos</dt>
                    <dd className="text-lg font-medium tabular-nums">
                      {usdFormatter.format(gastoPeriodo)}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {Math.round(shareCrm * 100)}%
                      </span>
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-muted-foreground">PropSearch · búsquedas de propiedades</dt>
                    <dd className="text-lg font-medium tabular-nums">
                      {externosLoading ? '—' : `${pisoPrefix}${usdFormatter.format(gastoPropSearch)}`}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {Math.round(sharePropSearch * 100)}%
                      </span>
                    </dd>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* ───────────── CRM + PROPSEARCH ───────────── */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* CRM */}
            <Card className="shadow-none">
              <CardHeader className="space-y-1 p-6 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">CRM</span>
                  {costsSaveStatus === 'saving' && <span className="text-xs text-muted-foreground">Guardando…</span>}
                  {costsSaveStatus === 'saved' && <span className="text-xs text-emerald-600">✓ Guardado</span>}
                  {costsSaveStatus === 'error' && <span className="text-xs text-red-600">Error al guardar</span>}
                </div>
                <CardTitle className="text-base font-semibold">Costos fijos</CardTitle>
                <CardDescription className="text-xs">
                  Costos mensuales del CRM, prorrateados al período.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6 pt-0">
                <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-4">
                  <div>
                    <p className="text-xs text-muted-foreground">En el período</p>
                    <p className="text-xl font-semibold tabular-nums">{usdFormatter.format(gastoPeriodo)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Por mes</p>
                    <p className="text-xl font-semibold tabular-nums text-slate-500">{usdFormatter.format(totalMensual)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'gasto-hosting', label: 'Hosting', value: hostingCost, setter: setHostingCost, field: 'hosting' as const },
                    { id: 'gasto-openai',  label: 'OpenAI',  value: openaiCost,  setter: setOpenaiCost,  field: 'openai'  as const },
                    { id: 'gasto-claude',  label: 'Claude',  value: claudeCost,  setter: setClaudeCost,  field: 'claude'  as const },
                    { id: 'gasto-mantenimiento', label: 'Mantenimiento y optimizaciones', value: mantenimientoCost, setter: setMantenimientoCost, field: 'mantenimiento' as const },
                  ].map(({ id, label, value, setter, field }) => (
                    <div key={id} className="flex items-center justify-between gap-4">
                      <Label htmlFor={id} className="text-sm font-normal text-slate-700">{label}</Label>
                      <div className="relative w-32">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <input
                          id={id}
                          type="number"
                          min="0"
                          step="0.01"
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          onBlur={(e) => persistCosts({ [field]: parseCost(e.target.value) })}
                          placeholder="0"
                          className="h-8 w-full rounded-md border border-input bg-background pl-5 pr-2 text-right text-sm tabular-nums shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-muted-foreground">Montos mensuales. Se guardan al salir del campo.</p>
                </div>
              </CardContent>
            </Card>

            {/* PropSearch */}
            <Card className="shadow-none">
              <CardHeader className="space-y-1 p-6 pb-4">
                <span className="text-[11px] font-medium uppercase tracking-wider text-amber-600">PropSearch</span>
                <CardTitle className="text-base font-semibold">Búsquedas de propiedades</CardTitle>
                <CardDescription className="text-xs">
                  Consumo de Anthropic y Apify de la app PropSearch en el período.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6 pt-0">
                <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-4">
                  <div>
                    <p className="text-xs text-muted-foreground">En el período</p>
                    <div className="text-xl font-semibold tabular-nums">
                      {externosLoading ? <Skeleton className="h-7 w-24" /> : `${pisoPrefix}${usdFormatter.format(gastoPropSearch)}`}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Búsquedas</p>
                    <p className="text-xl font-semibold tabular-nums text-slate-500">{intFormatter.format(resumenExterno.jobs)}</p>
                  </div>
                </div>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="flex items-center gap-2 text-slate-700">
                      <span className="h-2 w-2 rounded-full bg-amber-600" aria-hidden="true" />
                      Anthropic
                      <span className="text-xs text-muted-foreground">{intFormatter.format(resumenExterno.llamadas)} llamadas</span>
                    </dt>
                    <dd className="tabular-nums">{usdFormatter.format(resumenExterno.anthropic)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="flex items-center gap-2 text-slate-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                      Apify
                      <span className="text-xs text-muted-foreground">{intFormatter.format(resumenExterno.jobsError)} con error</span>
                    </dt>
                    <dd className="tabular-nums">{pisoPrefix}{usdFormatter.format(resumenExterno.apify)}</dd>
                  </div>
                  {resumenExterno.apifyDesperdiciado > 0 && (
                    <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                      <dt className="pl-4">Apify desperdiciado en búsquedas fallidas</dt>
                      <dd className="tabular-nums">{usdFormatter.format(resumenExterno.apifyDesperdiciado)}</dd>
                    </div>
                  )}
                </dl>
                {resumenExterno.esPiso && (
                  <p className="text-xs text-amber-700">
                    {resumenExterno.jobsCostoDesconocido} búsquedas sin costo de Apify registrado: los totales son un mínimo (≥).
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ───────────── DETALLE PROPSEARCH ───────────── */}
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Detalle PropSearch</h2>
              <p className="text-xs text-muted-foreground">De dónde sale el gasto de búsquedas de propiedades.</p>
            </div>

            <Card className="shadow-none">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-sm font-medium">Gasto diario</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <ChartAreaInteractive data={gastoDiario} config={gastoDiarioChartConfig} dateKey="date" />
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="shadow-none">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-sm font-medium">Anthropic por uso y modelo</CardTitle>
                  <CardDescription className="text-xs">En el período</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  {anthropicPorModelo.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Sin llamadas en el período.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs text-muted-foreground">
                            <th className="py-2 text-left font-medium">Uso</th>
                            <th className="py-2 text-right font-medium">Llamadas</th>
                            <th className="py-2 text-right font-medium" title="Input / Output / Cache">Tokens in/out/cache</th>
                            <th className="py-2 text-right font-medium">USD</th>
                          </tr>
                        </thead>
                        <tbody>
                          {anthropicPorModelo.map((r) => (
                            <tr key={`${r.scope}|${r.model}`} className="border-b border-slate-100 last:border-b-0">
                              <td className="py-2">
                                <div>{r.scope}</div>
                                <div className="text-xs text-muted-foreground">{r.model}</div>
                              </td>
                              <td className="py-2 text-right tabular-nums">{intFormatter.format(r.llamadas)}</td>
                              <td className="py-2 text-right text-xs tabular-nums text-muted-foreground">
                                {compactFormatter.format(r.input)} / {compactFormatter.format(r.output)} / {compactFormatter.format(r.cache)}
                              </td>
                              <td className="py-2 text-right tabular-nums">{usdFormatter.format(r.cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-sm font-medium">Apify por fuente</CardTitle>
                  <CardDescription className="text-xs">Histórico completo, no depende del período</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  {apifySources.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Sin datos.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs text-muted-foreground">
                            <th className="py-2 text-left font-medium">Fuente</th>
                            <th className="py-2 text-right font-medium">Runs</th>
                            <th className="py-2 text-right font-medium">Último uso</th>
                            <th className="py-2 text-right font-medium">USD</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apifySources.map((r) => (
                            <tr key={r.fuente} className="border-b border-slate-100 last:border-b-0">
                              <td className="py-2">{r.fuente}</td>
                              <td className="py-2 text-right tabular-nums">{intFormatter.format(num(r.runs))}</td>
                              <td className="py-2 text-right text-xs tabular-nums text-muted-foreground">
                                {r.ultimo_uso ? new Date(r.ultimo_uso).toLocaleDateString('es-AR') : '—'}
                              </td>
                              <td className="py-2 text-right tabular-nums">{usdFormatter.format(num(r.cost_usd))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-none">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-sm font-medium">Búsquedas más caras</CardTitle>
                <CardDescription className="text-xs">Top 50 del período por costo total</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {jobs.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Sin búsquedas en el período.</p>
                ) : (
                  <div className="max-h-[480px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-card">
                        <tr className="border-b border-slate-200 text-xs text-muted-foreground">
                          <th className="py-2 text-left font-medium">Búsqueda</th>
                          <th className="py-2 text-left font-medium">Estado</th>
                          <th className="py-2 text-right font-medium">Apify</th>
                          <th className="py-2 text-right font-medium">Anthropic</th>
                          <th className="py-2 text-right font-medium">Total</th>
                          <th className="py-2 text-right font-medium">Props útiles</th>
                          <th className="py-2 text-right font-medium">USD / prop</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((j) => (
                          <tr key={j.job_id} className="border-b border-slate-100 last:border-b-0">
                            <td className="max-w-[280px] py-2">
                              <div className="truncate" title={j.query_raw ?? ''}>{j.query_raw || '—'}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {new Date(j.creado_at).toLocaleDateString('es-AR')}
                                {j.zona ? ` · ${j.zona}` : ''}
                              </div>
                            </td>
                            <td className="py-2 text-xs text-muted-foreground">{j.estado || '—'}</td>
                            <td className="py-2 text-right tabular-nums">
                              {j.apify_cost_usd !== null ? usdFormatter.format(num(j.apify_cost_usd)) : '?'}
                            </td>
                            <td className="py-2 text-right tabular-nums">{usdFormatter.format(num(j.llm_cost_usd))}</td>
                            <td className="py-2 text-right font-medium tabular-nums">{usdFormatter.format(num(j.total_cost_usd))}</td>
                            <td className="py-2 text-right tabular-nums">{intFormatter.format(num(j.props_match))}</td>
                            <td className="py-2 text-right tabular-nums text-muted-foreground">
                              {j.costo_por_prop_util !== null ? usdFineFormatter.format(num(j.costo_por_prop_util)) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

export default function Page() {
  return (
    <DashboardAuthGate seccion="Gastos">
      <GastosContent />
    </DashboardAuthGate>
  );
}
