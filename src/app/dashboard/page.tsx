'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from "../components/AppLayout";
import { Lead } from "../types";
import { getAllLeads } from "../services/leadService";
import { getKanbanColumns } from '@/app/services/columnService';
import { ChartBarLeadsPorEstado } from '@/app/components/ChartBarLeadsPorEstado';
import { ChartHistogramPresupuestos } from '@/app/components/ChartHistogramPresupuestos';
import type { HistogramBin } from '@/app/components/ChartHistogramPresupuestos';
import { PanelLockButton } from '@/app/components/PanelLockButton';
import { PeriodoSelector } from '@/app/components/PeriodoSelector';
import { ChartAreaInteractive } from "@/components/ui/chart-area-interactive";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import {
  type Pauta,
  SIN_CAMPANA_SENTINEL,
  buildLeadCampaignMap,
  campaignsFromPautas,
  defaultPeriodEnd,
  defaultPeriodStart,
  filterLeadsByPeriodAndCampaign,
  leadCalendarDate,
  resolvePeriodDates,
  toDateInputValue,
} from '@/app/utils/periodo';

type DashboardTab = 'resumen' | 'campanas' | 'presupuestos';

const TABS: { id: DashboardTab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'campanas', label: 'Campañas' },
  { id: 'presupuestos', label: 'Presupuestos' },
];

function isDashboardTab(v: string): v is DashboardTab {
  return TABS.some((t) => t.id === v);
}

function estadoKey(lead: Lead): string {
  return (lead.estado || '').toLowerCase().trim();
}

const selectClass =
  'h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function Kpi({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartPeriodStart, setChartPeriodStart] = useState(defaultPeriodStart);
  const [chartPeriodEnd, setChartPeriodEnd] = useState(defaultPeriodEnd);
  /** '' = todas las campañas en el gráfico combinado; si no, fríos/tibios/calientes de esa campaña */
  const [campaignChartFilter, setCampaignChartFilter] = useState<string>('');
  const [barEstadoCampaignFilter, setBarEstadoCampaignFilter] = useState<string>('');
  const [pautas, setPautas] = useState<Pauta[]>([]);
  const [columnColors, setColumnColors] = useState<Record<string, string>>({});
  const [ticketCampaignFilter, setTicketCampaignFilter] = useState<string>('');
  const [ticketBinSize, setTicketBinSize] = useState<number>(10000);
  const [tab, setTab] = useState<DashboardTab>('resumen');

  useEffect(() => {
    const fromHash = window.location.hash.replace('#', '');
    if (isDashboardTab(fromHash)) setTab(fromHash);
  }, []);

  const selectTab = (next: DashboardTab) => {
    setTab(next);
    window.history.replaceState(null, '', `#${next}`);
  };
  useEffect(() => {
    const loadLeads = async () => {
      setIsLoading(true);
      try {
        const allLeads = await getAllLeads();
        setLeads(allLeads);
      } catch (error) {
        console.error('Error loading leads:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadLeads();
  }, []);

  useEffect(() => {
    const loadPautas = async () => {
      try {
        const response = await fetch('/api/pautas');
        if (!response.ok) {
          console.error('Error loading pautas');
          setPautas([]);
          return;
        }
        const data = await response.json();
        setPautas(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading pautas:', error);
        setPautas([]);
      }
    };
    loadPautas();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { columnColors } = await getKanbanColumns();
        if (!cancelled) setColumnColors(columnColors);
      } catch (e) {
        console.error('Error cargando column_colors:', e);
        if (!cancelled) setColumnColors({});
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const { periodDates, periodRangeClipped } = useMemo(
    () => resolvePeriodDates(chartPeriodStart, chartPeriodEnd),
    [chartPeriodStart, chartPeriodEnd],
  );

  // Agrupar leads por fecha (rango seleccionado en "Leads por Período")
  const leadsByDate = useMemo(() => {
    const grouped: Record<string, { total: number; tibios: number; frios: number; calientes: number }> = {};
    periodDates.forEach((dateStr) => {
      grouped[dateStr] = { total: 0, tibios: 0, frios: 0, calientes: 0 };
    });

    leads.forEach((lead) => {
      const dateStr = leadCalendarDate(lead);
      if (grouped[dateStr] === undefined) return;
      grouped[dateStr].total++;
      const est = (lead.estado || '').toLowerCase().trim();
      if (est === 'tibio' || est === 'tibios') grouped[dateStr].tibios++;
      else if (est === 'frío' || est === 'frio' || est === 'fríos' || est === 'frios') grouped[dateStr].frios++;
      else if (est === 'caliente' || est === 'calientes') grouped[dateStr].calientes++;
    });

    return periodDates.map((date) => ({
      date,
      leads: grouped[date].total,
      tibios: grouped[date].tibios,
      frios: grouped[date].frios,
      calientes: grouped[date].calientes,
    }));
  }, [leads, periodDates]);

  const llamadasByDate = useMemo(() => {
    const grouped: Record<string, number> = {};
    periodDates.forEach((dateStr) => {
      grouped[dateStr] = 0;
    });

    leads.forEach((lead) => {
      const est = (lead.estado || '').toLowerCase().trim();
      if (est !== 'llamada' && est !== 'llamadas') return;
      const dateStr = leadCalendarDate(lead);
      if (grouped[dateStr] !== undefined) grouped[dateStr]++;
    });

    return periodDates.map((date) => ({
      date,
      leads: grouped[date],
    }));
  }, [leads, periodDates]);

  const visitasByDate = useMemo(() => {
    const grouped: Record<string, number> = {};
    periodDates.forEach((dateStr) => {
      grouped[dateStr] = 0;
    });

    leads.forEach((lead) => {
      const est = (lead.estado || '').toLowerCase().trim();
      if (est !== 'visita' && est !== 'visitas') return;
      const dateStr = leadCalendarDate(lead);
      if (grouped[dateStr] !== undefined) grouped[dateStr]++;
    });

    return periodDates.map((date) => ({
      date,
      leads: grouped[date],
    }));
  }, [leads, periodDates]);

  const venderByDate = useMemo(() => {
    const grouped: Record<string, number> = {};
    periodDates.forEach((dateStr) => {
      grouped[dateStr] = 0;
    });

    leads.forEach((lead) => {
      const est = (lead.estado || '').toLowerCase().trim();
      if (est !== 'vender') return;
      const dateStr = leadCalendarDate(lead);
      if (grouped[dateStr] !== undefined) grouped[dateStr]++;
    });

    return periodDates.map((date) => ({
      date,
      leads: grouped[date],
    }));
  }, [leads, periodDates]);

  // Campañas oficiales: salen de la tabla pautas (idealmente activas)
  const uniqueCampaigns = useMemo(() => campaignsFromPautas(pautas), [pautas]);

  // Mapeo lead.propiedad_interes → campaña oficial (pauta.texto)
  const leadRawToPautaCampaign = useMemo(
    () => buildLeadCampaignMap(leads, uniqueCampaigns),
    [leads, uniqueCampaigns],
  );

  const leadsByCampaign = useMemo(() => {
    const dates = periodDates;
    const campaignData: Record<string, Record<string, number>> = {};

    uniqueCampaigns.forEach((campaign) => {
      campaignData[campaign] = {};
      dates.forEach((date) => {
        campaignData[campaign][date] = 0;
      });
    });

    leads.forEach((lead) => {
      const raw = (lead.propiedad_interes || '').trim();
      if (!raw) return;
      const campaign = leadRawToPautaCampaign.get(raw);
      if (!campaign) return; // si no está en pautas, no se grafica
      const dateStr = leadCalendarDate(lead);
      if (campaignData[campaign] && campaignData[campaign][dateStr] !== undefined) {
        campaignData[campaign][dateStr]++;
      }
    });

    const result = dates.map((date) => {
      const dataPoint: Record<string, string | number> = { date };
      uniqueCampaigns.forEach((campaign) => {
        const safeKey = campaign.replace(/[^a-zA-Z0-9]/g, '_');
        dataPoint[safeKey] = campaignData[campaign][date] || 0;
      });
      return dataPoint;
    });

    return { data: result, campaigns: uniqueCampaigns };
  }, [leads, uniqueCampaigns, periodDates, leadRawToPautaCampaign]);

  const effectiveCampaignChartFilter = useMemo(() => {
    if (!campaignChartFilter) return '';
    return uniqueCampaigns.includes(campaignChartFilter) ? campaignChartFilter : '';
  }, [campaignChartFilter, uniqueCampaigns]);

  useEffect(() => {
    if (campaignChartFilter && !uniqueCampaigns.includes(campaignChartFilter)) {
      setCampaignChartFilter('');
    }
  }, [campaignChartFilter, uniqueCampaigns]);

  const barEstadoFilteredLeads = useMemo<Lead[]>(
    () => filterLeadsByPeriodAndCampaign(leads, periodDates, leadRawToPautaCampaign, barEstadoCampaignFilter),
    [leads, periodDates, leadRawToPautaCampaign, barEstadoCampaignFilter],
  );

  const effectiveBarEstadoCampaignFilter = useMemo<string>(() => {
    if (!barEstadoCampaignFilter) return '';
    if (barEstadoCampaignFilter === SIN_CAMPANA_SENTINEL) return SIN_CAMPANA_SENTINEL;
    return uniqueCampaigns.includes(barEstadoCampaignFilter) ? barEstadoCampaignFilter : '';
  }, [barEstadoCampaignFilter, uniqueCampaigns]);

  useEffect(() => {
    if (
      barEstadoCampaignFilter &&
      barEstadoCampaignFilter !== SIN_CAMPANA_SENTINEL &&
      !uniqueCampaigns.includes(barEstadoCampaignFilter)
    ) {
      setBarEstadoCampaignFilter('');
    }
  }, [barEstadoCampaignFilter, uniqueCampaigns]);

  /** Gráfico principal por campaña: todas las series de campaña, o frío/tibio/caliente de una sola */
  const campaignMainChartData = useMemo(() => {
    if (!effectiveCampaignChartFilter) {
      return leadsByCampaign.data;
    }
    const grouped: Record<string, { total: number; tibios: number; frios: number; calientes: number }> = {};
    periodDates.forEach((dateStr) => {
      grouped[dateStr] = { total: 0, tibios: 0, frios: 0, calientes: 0 };
    });

    leads.forEach((lead) => {
      const raw = (lead.propiedad_interes || '').trim();
      const camp = leadRawToPautaCampaign.get(raw);
      if (!camp) return;
      if (camp !== effectiveCampaignChartFilter) return;
      const dateStr = leadCalendarDate(lead);
      if (grouped[dateStr] === undefined) return;
      grouped[dateStr].total++;
      const est = (lead.estado || '').toLowerCase().trim();
      if (est === 'tibio' || est === 'tibios') grouped[dateStr].tibios++;
      else if (est === 'frío' || est === 'frio' || est === 'fríos' || est === 'frios') grouped[dateStr].frios++;
      else if (est === 'caliente' || est === 'calientes') grouped[dateStr].calientes++;
    });

    return periodDates.map((date) => ({
      date,
      leads: grouped[date].total,
      tibios: grouped[date].tibios,
      frios: grouped[date].frios,
      calientes: grouped[date].calientes,
    }));
  }, [effectiveCampaignChartFilter, leadsByCampaign.data, leads, periodDates, leadRawToPautaCampaign]);

  // Configuración del gráfico de campañas (generar colores dinámicamente)
  const campaignsChartConfig = useMemo(() => {
    const colors = [
      "#1E90FF", // Celeste
      "#FFA500", // Naranja
      "#4169E1", // Azul
      "#FF4500", // Rojo/Naranja oscuro
      "#10B981", // Verde
      "#3B82F6", // Azul
      "#F59E0B", // Amarillo/Naranja
      "#8B5CF6", // Púrpura
      "#EC4899", // Rosa
      "#14B8A6", // Turquesa
      "#F97316", // Naranja oscuro
      "#6366F1", // Índigo
    ];
    
    const config: ChartConfig = {};
    uniqueCampaigns.forEach((campaign, index) => {
      const safeKey = campaign.replace(/[^a-zA-Z0-9]/g, '_');
      config[safeKey] = {
        label: campaign,
        color: colors[index % colors.length],
      };
    });
    return config;
  }, [uniqueCampaigns]);

  const individualCampaignsData = useMemo(() => {
    const dates = periodDates;
    const campaignsData: Record<string, Array<{ date: string; leads: number }>> = {};

    uniqueCampaigns.forEach((campaign) => {
      campaignsData[campaign] = dates.map((date) => ({ date, leads: 0 }));
    });

    leads.forEach((lead) => {
      const raw = (lead.propiedad_interes || '').trim();
      if (!raw) return;
      const campaign = leadRawToPautaCampaign.get(raw);
      if (!campaign) return;
      const dateStr = leadCalendarDate(lead);
      if (!campaignsData[campaign]) return;
      const dateIndex = campaignsData[campaign].findIndex((d) => d.date === dateStr);
      if (dateIndex !== -1) campaignsData[campaign][dateIndex].leads++;
    });

    return campaignsData;
  }, [leads, uniqueCampaigns, periodDates, leadRawToPautaCampaign]);

  // Configuración del gráfico
  const chartConfig: ChartConfig = {
    leads: {
      label: "Leads Totales",
      color: "#1E90FF", // Celeste
    },
    tibios: {
      label: "Leads Tibios",
      color: "#FFA500", // Naranja
    },
    frios: {
      label: "Leads Fríos",
      color: "#4169E1", // Azul
    },
    calientes: {
      label: "Leads Calientes",
      color: "#FF4500", // Rojo/Naranja oscuro
    },
  };

  const campaignMainChartConfig: ChartConfig = effectiveCampaignChartFilter ? chartConfig : campaignsChartConfig;

  // Configuración para gráficos de categorías
  const llamadasChartConfig: ChartConfig = {
    leads: {
      label: "Llamadas",
      color: "#10B981", // Verde
    },
  };

  const visitasChartConfig: ChartConfig = {
    leads: {
      label: "Visitas",
      color: "#3B82F6", // Azul
    },
  };

  const venderChartConfig: ChartConfig = {
    leads: {
      label: "Vender",
      color: "#F59E0B", // Amarillo/Naranja
    },
  };

  const periodDayCount = periodDates.length;

  const totalLeads = leads.length;

  const kpisPeriodo = useMemo(() => {
    const periodSet = new Set(periodDates);
    // Período anterior de igual duración, para comparar
    const prevSet = new Set<string>();
    if (periodDates.length > 0) {
      const first = new Date(`${periodDates[0]}T00:00:00`);
      for (let i = 1; i <= periodDates.length; i++) {
        const d = new Date(first);
        d.setDate(d.getDate() - i);
        prevSet.add(toDateInputValue(d));
      }
    }
    let actual = 0, anterior = 0, calientes = 0, llamadas = 0, visitas = 0;
    for (const lead of leads) {
      const dia = leadCalendarDate(lead);
      if (prevSet.has(dia)) anterior++;
      if (!periodSet.has(dia)) continue;
      actual++;
      const est = estadoKey(lead);
      if (est === 'caliente' || est === 'calientes') calientes++;
      else if (est === 'llamada' || est === 'llamadas') llamadas++;
      else if (est === 'visita' || est === 'visitas') visitas++;
    }
    const variacion = anterior > 0 ? (actual - anterior) / anterior : null;
    return { actual, anterior, variacion, calientes, llamadas, visitas };
  }, [leads, periodDates]);

  const usdFormatter = useMemo(
    () => new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }),
    [],
  );

  const ticketPromedio = useMemo(() => {
    const withBudget = leads.filter(l => l.presupuesto > 0);
    if (withBudget.length === 0) return null;
    return withBudget.reduce((s, l) => s + l.presupuesto, 0) / withBudget.length;
  }, [leads]);

  const ticketPorCampana = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    uniqueCampaigns.forEach(c => map.set(c, { count: 0, total: 0 }));
    for (const lead of leads) {
      if (lead.presupuesto <= 0) continue;
      const raw = ((lead as any).propiedad_interes || '').trim();
      const camp = leadRawToPautaCampaign.get(raw);
      if (!camp) continue;
      const entry = map.get(camp)!;
      entry.count++;
      entry.total += lead.presupuesto;
    }
    return uniqueCampaigns
      .map(c => {
        const e = map.get(c)!;
        return { campaign: c, count: e.count, total: e.total, promedio: e.count > 0 ? e.total / e.count : 0 };
      })
      .filter(r => r.count > 0)
      .sort((a, b) => b.total - a.total);
  }, [leads, uniqueCampaigns, leadRawToPautaCampaign]);

  const ticketTotalCampanas = useMemo(
    () => ticketPorCampana.reduce((s, r) => s + r.total, 0),
    [ticketPorCampana],
  );

  // Campaña seleccionada para la distribución; se ignora si dejó de existir
  const effectiveTicketCampaign = useMemo(() => {
    if (!ticketCampaignFilter) return '';
    return uniqueCampaigns.includes(ticketCampaignFilter) ? ticketCampaignFilter : '';
  }, [ticketCampaignFilter, uniqueCampaigns]);

  const presupuestosSeleccion = useMemo(() => {
    const out: number[] = [];
    for (const lead of leads) {
      if (lead.presupuesto <= 0) continue;
      const raw = ((lead as any).propiedad_interes || '').trim();
      const camp = leadRawToPautaCampaign.get(raw);
      if (!camp) continue;
      if (effectiveTicketCampaign && camp !== effectiveTicketCampaign) continue;
      out.push(lead.presupuesto);
    }
    return out;
  }, [leads, leadRawToPautaCampaign, effectiveTicketCampaign]);

  const histogramaPresupuestos = useMemo<HistogramBin[]>(() => {
    if (presupuestosSeleccion.length === 0) return [];
    const bin = ticketBinSize >= 1000 ? ticketBinSize : 10000;
    const min = Math.floor(Math.min(...presupuestosSeleccion) / bin) * bin;
    const max = Math.max(...presupuestosSeleccion);
    // Tope de segmentos para que un rango chico no genere miles de barras;
    // el excedente se acumula en el último segmento
    const MAX_BINS = 40;
    const binCount = Math.min(Math.floor((max - min) / bin) + 1, MAX_BINS);
    const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
      from: min + i * bin,
      to: min + (i + 1) * bin,
      count: 0,
    }));
    for (const p of presupuestosSeleccion) {
      const idx = Math.min(Math.floor((p - min) / bin), binCount - 1);
      bins[idx].count++;
    }
    return bins;
  }, [presupuestosSeleccion, ticketBinSize]);

  const ticketTotalSeleccion = useMemo(
    () => presupuestosSeleccion.reduce((s, p) => s + p, 0),
    [presupuestosSeleccion],
  );

  const pct = (n: number, total: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : '—');

  const variacionLabel = (() => {
    const v = kpisPeriodo.variacion;
    if (v === null) return <>Sin datos del período anterior</>;
    const up = v >= 0;
    return (
      <span className={up ? 'text-emerald-600' : 'text-red-600'}>
        {up ? '↑' : '↓'} {Math.abs(Math.round(v * 100))}% vs. período anterior
      </span>
    );
  })();

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
                  <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Dashboard</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>

        <div className="mx-auto max-w-6xl space-y-6">
          {/* ───────────── HEADER ───────────── */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {periodDayCount} {periodDayCount === 1 ? 'día' : 'días'} · {totalLeads.toLocaleString('es-AR')} leads en total
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <PeriodoSelector
                idPrefix="dash"
                variant="inline"
                start={chartPeriodStart}
                end={chartPeriodEnd}
                onStartChange={setChartPeriodStart}
                onEndChange={setChartPeriodEnd}
                clipped={periodRangeClipped}
              />
              <PanelLockButton />
            </div>
          </header>

          {/* ───────────── PESTAÑAS ───────────── */}
          <nav className="flex gap-6 border-b border-slate-200" role="tablist" aria-label="Secciones del dashboard">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => selectTab(t.id)}
                className={`-mb-px border-b-2 pb-2.5 text-sm transition-colors ${
                  tab === t.id
                    ? 'border-slate-900 font-medium text-slate-900'
                    : 'border-transparent text-muted-foreground hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {isLoading ? (
            <div className="space-y-6">
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[104px] w-full rounded-xl" />)}
              </div>
              <Skeleton className="h-[420px] w-full rounded-xl" />
            </div>
          ) : (
            <>
              {/* ═════════════ RESUMEN ═════════════ */}
              {tab === 'resumen' && (
                <div className="space-y-6">
                  <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                    <Kpi label="Leads nuevos" value={kpisPeriodo.actual.toLocaleString('es-AR')} hint={variacionLabel} />
                    <Kpi
                      label="Calientes"
                      value={kpisPeriodo.calientes.toLocaleString('es-AR')}
                      hint={`${pct(kpisPeriodo.calientes, kpisPeriodo.actual)} de los leads nuevos`}
                    />
                    <Kpi
                      label="Llamadas"
                      value={kpisPeriodo.llamadas.toLocaleString('es-AR')}
                      hint={`${pct(kpisPeriodo.llamadas, kpisPeriodo.actual)} de los leads nuevos`}
                    />
                    <Kpi
                      label="Visitas"
                      value={kpisPeriodo.visitas.toLocaleString('es-AR')}
                      hint={`${pct(kpisPeriodo.visitas, kpisPeriodo.actual)} de los leads nuevos`}
                    />
                  </div>

                  <Card className="shadow-none">
                    <CardHeader className="p-6 pb-2">
                      <CardTitle className="text-sm font-medium">Leads por día</CardTitle>
                      <CardDescription className="text-xs">Total y desglose frío / tibio / caliente según fecha de ingreso</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <ChartAreaInteractive data={leadsByDate} config={chartConfig} dateKey="date" valueKey="leads" />
                    </CardContent>
                  </Card>

                  <Card className="shadow-none">
                    <CardHeader className="flex flex-col gap-3 p-6 pb-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                      <div className="space-y-1.5">
                        <CardTitle className="text-sm font-medium">Leads por estado</CardTitle>
                        <CardDescription className="text-xs">
                          {effectiveBarEstadoCampaignFilter === SIN_CAMPANA_SENTINEL
                            ? 'Leads sin campaña asignada'
                            : effectiveBarEstadoCampaignFilter
                              ? `Campaña: ${effectiveBarEstadoCampaignFilter}`
                              : 'Todas las campañas'}
                        </CardDescription>
                      </div>
                      <select
                        id="bar-estado-campaign-filter"
                        aria-label="Filtrar leads por estado por campaña"
                        value={barEstadoCampaignFilter}
                        onChange={(e) => setBarEstadoCampaignFilter(e.target.value)}
                        className={`${selectClass} w-full sm:w-64`}
                      >
                        <option value="">Todas las campañas</option>
                        {uniqueCampaigns.map((c, idx) => (
                          <option key={`bar-estado-camp-${idx}-${c}`} value={c}>{c}</option>
                        ))}
                        <option value={SIN_CAMPANA_SENTINEL}>Sin campaña</option>
                      </select>
                    </CardHeader>
                    <CardContent className="p-6 pt-2">
                      <ChartBarLeadsPorEstado leads={barEstadoFilteredLeads} columnColors={columnColors} />
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    {[
                      { title: 'Llamadas', data: llamadasByDate, config: llamadasChartConfig },
                      { title: 'Visitas', data: visitasByDate, config: visitasChartConfig },
                      { title: 'Vender', data: venderByDate, config: venderChartConfig },
                    ].map(({ title, data, config }) => (
                      <Card key={title} className="shadow-none">
                        <CardHeader className="p-5 pb-0">
                          <CardTitle className="text-sm font-medium">{title}</CardTitle>
                          <CardDescription className="text-xs">
                            {data.reduce((s, d) => s + d.leads, 0).toLocaleString('es-AR')} en el período
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 pt-2">
                          <ChartAreaInteractive data={data} config={config} dateKey="date" valueKey="leads" className="h-[160px] w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* ═════════════ CAMPAÑAS ═════════════ */}
              {tab === 'campanas' && (
                uniqueCampaigns.length === 0 ? (
                  <Card className="shadow-none">
                    <CardContent className="py-16 text-center">
                      <p className="text-sm font-medium text-slate-900">No hay campañas activas</p>
                      <p className="mt-1 text-xs text-muted-foreground">Las campañas se toman de las pautas activas.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    <Card className="shadow-none">
                      <CardHeader className="flex flex-col gap-3 p-6 pb-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                        <div className="space-y-1.5">
                          <CardTitle className="text-sm font-medium">
                            {effectiveCampaignChartFilter ? effectiveCampaignChartFilter : 'Comparativa de campañas'}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {effectiveCampaignChartFilter
                              ? 'Total del día y desglose frío / tibio / caliente'
                              : 'Leads por día de cada campaña (pautas activas, matcheadas por nombre o números)'}
                          </CardDescription>
                        </div>
                        <select
                          id="campaign-chart-filter"
                          aria-label="Filtrar gráfico por campaña"
                          value={campaignChartFilter}
                          onChange={(e) => setCampaignChartFilter(e.target.value)}
                          className={`${selectClass} w-full sm:w-64`}
                        >
                          <option value="">Comparar todas</option>
                          {uniqueCampaigns.map((c, idx) => (
                            <option key={`camp-filter-${idx}-${c}`} value={c}>{c}</option>
                          ))}
                        </select>
                      </CardHeader>
                      <CardContent className="p-6 pt-2">
                        <ChartAreaInteractive data={campaignMainChartData} config={campaignMainChartConfig} dateKey="date" valueKey="leads" />
                      </CardContent>
                    </Card>

                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <h2 className="text-sm font-medium text-slate-900">Por campaña</h2>
                        {uniqueCampaigns.length > 6 && (
                          <p className="text-xs text-muted-foreground">Mostrando 6 de {uniqueCampaigns.length}</p>
                        )}
                      </div>
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {uniqueCampaigns.slice(0, 6).map((campaign) => {
                          const campaignData = individualCampaignsData[campaign] || [];
                          const safeKey = campaign.replace(/[^a-zA-Z0-9]/g, '_');
                          const total = campaignData.reduce((s, d) => s + d.leads, 0);
                          const campaignChartConfig: ChartConfig = {
                            leads: { label: campaign, color: campaignsChartConfig[safeKey]?.color || '#1E90FF' },
                          };
                          return (
                            <Card key={campaign} className="shadow-none">
                              <CardHeader className="p-5 pb-0">
                                <button
                                  type="button"
                                  onClick={() => setCampaignChartFilter(campaign)}
                                  className="truncate text-left text-sm font-medium hover:underline"
                                  title={`Ver ${campaign} en detalle`}
                                >
                                  {campaign}
                                </button>
                                <CardDescription className="text-xs">{total.toLocaleString('es-AR')} leads en el período</CardDescription>
                              </CardHeader>
                              <CardContent className="p-5 pt-2">
                                <ChartAreaInteractive data={campaignData} config={campaignChartConfig} dateKey="date" valueKey="leads" className="h-[160px] w-full" />
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* ═════════════ PRESUPUESTOS ═════════════ */}
              {tab === 'presupuestos' && (
                <div className="space-y-6">
                  <p className="text-xs text-muted-foreground">
                    Presupuestos declarados por los leads, en USD. Incluye todos los leads (no depende del período).
                  </p>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                    <Kpi
                      label="Ticket promedio"
                      value={ticketPromedio !== null ? usdFormatter.format(ticketPromedio) : '—'}
                      hint="Leads con presupuesto cargado"
                    />
                    <Kpi
                      label="Total en campañas"
                      value={ticketTotalCampanas > 0 ? usdFormatter.format(ticketTotalCampanas) : '—'}
                      hint="Suma de presupuestos de leads con campaña"
                    />
                    <Kpi
                      label="Leads con presupuesto"
                      value={ticketPorCampana.reduce((s, r) => s + r.count, 0).toLocaleString('es-AR')}
                      hint="Asignados a una campaña"
                    />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="shadow-none">
                      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-6 pb-2">
                        <div className="space-y-1.5">
                          <CardTitle className="text-sm font-medium">Ticket por campaña</CardTitle>
                          <CardDescription className="text-xs">Clic en una campaña para ver su distribución</CardDescription>
                        </div>
                        {effectiveTicketCampaign && (
                          <button
                            type="button"
                            onClick={() => setTicketCampaignFilter('')}
                            className="rounded-md border border-input px-2 py-1 text-xs text-muted-foreground shadow-sm hover:bg-slate-50"
                          >
                            Ver todas
                          </button>
                        )}
                      </CardHeader>
                      <CardContent className="p-6 pt-2">
                        {ticketPorCampana.length === 0 ? (
                          <p className="py-6 text-center text-sm text-muted-foreground">Sin presupuestos por campaña.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 text-xs text-muted-foreground">
                                  <th className="py-2 text-left font-medium">Campaña</th>
                                  <th className="py-2 text-right font-medium">Leads</th>
                                  <th className="py-2 text-right font-medium">Total</th>
                                  <th className="py-2 text-right font-medium">Promedio</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ticketPorCampana.map((r) => (
                                  <tr
                                    key={r.campaign}
                                    onClick={() => setTicketCampaignFilter((prev) => (prev === r.campaign ? '' : r.campaign))}
                                    className={`cursor-pointer border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50 ${
                                      effectiveTicketCampaign === r.campaign ? 'bg-slate-100' : ''
                                    }`}
                                  >
                                    <td className="max-w-[160px] truncate py-2" title={r.campaign}>{r.campaign}</td>
                                    <td className="py-2 text-right tabular-nums">{r.count}</td>
                                    <td className="py-2 text-right tabular-nums">{usdFormatter.format(r.total)}</td>
                                    <td className="py-2 text-right tabular-nums text-muted-foreground">{usdFormatter.format(r.promedio)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="shadow-none">
                      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-6 pb-2">
                        <div className="space-y-1.5">
                          <CardTitle className="text-sm font-medium">Distribución de presupuestos</CardTitle>
                          <CardDescription className="text-xs">
                            {effectiveTicketCampaign || 'Todas las campañas'} · {ticketTotalSeleccion > 0 ? usdFormatter.format(ticketTotalSeleccion) : '—'}
                          </CardDescription>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          Rango
                          <input
                            type="number"
                            min={1000}
                            step={1000}
                            value={ticketBinSize}
                            onChange={(e) => {
                              const n = parseInt(e.target.value, 10);
                              setTicketBinSize(Number.isFinite(n) ? n : 10000);
                            }}
                            className="h-8 w-24 rounded-md border border-input bg-background px-2 text-right text-xs tabular-nums shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </label>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6 pt-2">
                        <ChartHistogramPresupuestos bins={histogramaPresupuestos} className="w-full" />
                        {histogramaPresupuestos.length > 0 && (
                          <div className="max-h-48 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-card">
                                <tr className="border-b border-slate-200 text-xs text-muted-foreground">
                                  <th className="py-2 text-left font-medium">Rango</th>
                                  <th className="py-2 text-right font-medium">Consultas</th>
                                </tr>
                              </thead>
                              <tbody>
                                {histogramaPresupuestos.map((b) => (
                                  <tr key={b.from} className="border-b border-slate-100 last:border-b-0">
                                    <td className="py-1.5 tabular-nums">{usdFormatter.format(b.from)} – {usdFormatter.format(b.to)}</td>
                                    <td className="py-1.5 text-right tabular-nums">{b.count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
