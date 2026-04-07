'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from "../components/AppLayout";
import { Lead } from "../types";
import { getAllLeads, campaignNumericFingerprint } from "../services/leadService";
import { ChartAreaInteractive } from "@/components/ui/chart-area-interactive";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface Pauta {
  id: number;
  texto: string;
  activo?: boolean;
  created_at?: string;
}

function isPautaActiva(p: Pauta): boolean {
  return p.activo !== false;
}

/** YYYY-MM-DD en calendario local (evita desfase UTC de toISOString) */
function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeCampaignText(name: string): string {
  if (!name) return '';
  let normalized = name.toLowerCase().trim();
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  normalized = normalized.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized;
}

function parseDateInput(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Días consecutivos inclusive, ordenados; si inicio > fin se intercambian */
function eachDayInclusive(startStr: string, endStr: string): string[] {
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

function leadCalendarDate(lead: Lead): string {
  const raw = lead.fechaContacto || lead.created_at;
  if (!raw) return toDateInputValue(new Date());
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return toDateInputValue(new Date());
  return toDateInputValue(d);
}

function defaultPeriodEnd(): string {
  return toDateInputValue(new Date());
}

function defaultPeriodStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return toDateInputValue(d);
}

const MAX_CHART_DAYS = 731;

export default function Page() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartPeriodStart, setChartPeriodStart] = useState(defaultPeriodStart);
  const [chartPeriodEnd, setChartPeriodEnd] = useState(defaultPeriodEnd);
  /** '' = todas las campañas en el gráfico combinado; si no, fríos/tibios/calientes de esa campaña */
  const [campaignChartFilter, setCampaignChartFilter] = useState<string>('');
  const [pautas, setPautas] = useState<Pauta[]>([]);

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

  const { periodDates, periodRangeClipped } = useMemo(() => {
    const days = eachDayInclusive(chartPeriodStart, chartPeriodEnd);
    if (days.length === 0) {
      const fallback = eachDayInclusive(defaultPeriodStart(), defaultPeriodEnd());
      return { periodDates: fallback, periodRangeClipped: false };
    }
    if (days.length <= MAX_CHART_DAYS) {
      return { periodDates: days, periodRangeClipped: false };
    }
    return {
      periodDates: days.slice(days.length - MAX_CHART_DAYS),
      periodRangeClipped: true,
    };
  }, [chartPeriodStart, chartPeriodEnd]);

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
  const uniqueCampaigns = useMemo(() => {
    const texts = pautas
      .filter(isPautaActiva)
      .map((p) => String(p.texto || '').trim())
      .filter(Boolean);
    return [...new Set(texts)].sort((a, b) => a.localeCompare(b, 'es'));
  }, [pautas]);

  // Mapeo lead.propiedad_interes → campaña oficial (pauta.texto)
  const leadRawToPautaCampaign = useMemo(() => {
    const pautaByNormalized = new Map<string, string>();
    const pautaByFingerprint = new Map<string, string>();

    for (const campaign of uniqueCampaigns) {
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
      const normLead = normalizeCampaignText(raw);
      const byNorm = pautaByNormalized.get(normLead);
      if (byNorm) {
        map.set(raw, byNorm);
        continue;
      }

      // 2) match por huella numérica (une variantes como "466 e/ 24 y 25" con "466 ENTRE 24 Y 25")
      const fpLead = campaignNumericFingerprint(raw);
      if (fpLead) {
        const byFp = pautaByFingerprint.get(fpLead);
        if (byFp) {
          map.set(raw, byFp);
          continue;
        }
      }
    }
    return map;
  }, [leads, uniqueCampaigns]);

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

  const applyPresetDays = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    setChartPeriodStart(toDateInputValue(start));
    setChartPeriodEnd(toDateInputValue(end));
  };

  const periodDayCount = periodDates.length;

  // Calcular totales
  const totalLeads = leads.length;
  const leadsLast7Days = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return leads.filter(lead => {
      const leadDate = new Date(lead.fechaContacto || lead.created_at || new Date());
      return leadDate >= sevenDaysAgo;
    }).length;
  }, [leads]);

  const leadsLast30Days = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return leads.filter(lead => {
      const leadDate = new Date(lead.fechaContacto || lead.created_at || new Date());
      return leadDate >= thirtyDaysAgo;
    }).length;
  }, [leads]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="mb-8 m-2 space-y-6">
          {/* Breadcrumbs skeleton */}
          <div className="px-2 py-2  bg-slate-100 z-10 backdrop-blur  border-b border-slate-200 mb-6">
            <Skeleton className="h-4 w-48" />
          </div>
          
          {/* Header skeleton */}
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Cards skeleton */}
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main chart skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>

          {/* Category charts skeleton */}
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[200px] w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8 px-2 space-y-6">
         {/* Breadcrumbs */}
         <div className="px-3 py-3 sticky top-0 z-10   bg-slate-100 border-b border-slate-200 mb-6">
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
                    <svg className="w-6  h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                    </svg>
                    <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Dashboard</span>
                  </div>
                </li>
               
              </ol>
            </nav>
          </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">Métricas y estadísticas de leads</p>
        </div>

        {/* Cards de métricas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center  justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Leads
              </CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeads}</div>
              <p className="text-xs text-muted-foreground">
                Todos los leads registrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Últimos 7 días
              </CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                className="h-4 w-4 text-muted-foreground"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leadsLast7Days}</div>
              <p className="text-xs text-muted-foreground">
                Leads ingresados esta semana
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Últimos 30 días
              </CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leadsLast30Days}</div>
              <p className="text-xs text-muted-foreground">
                Leads ingresados este mes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de leads por período */}
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Leads por Período</CardTitle>
                <CardDescription>
                  Total, tibios, fríos y calientes según fecha de ingreso (
                  <span className="font-medium text-foreground">{chartPeriodStart}</span>
                  {' → '}
                  <span className="font-medium text-foreground">{chartPeriodEnd}</span>
                  {periodDayCount > 0 ? ` · ${periodDayCount} días` : ''})
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dash-period-start" className="text-xs text-muted-foreground">
                    Desde
                  </Label>
                  <input
                    id="dash-period-start"
                    type="date"
                    value={chartPeriodStart}
                    onChange={(e) => setChartPeriodStart(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dash-period-end" className="text-xs text-muted-foreground">
                    Hasta
                  </Label>
                  <input
                    id="dash-period-end"
                    type="date"
                    value={chartPeriodEnd}
                    onChange={(e) => setChartPeriodEnd(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="mr-1 self-center text-xs text-muted-foreground">Atajos:</span>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => applyPresetDays(7)}>
                  7 días
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => applyPresetDays(30)}>
                  30 días
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => applyPresetDays(90)}>
                  90 días
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setChartPeriodStart(defaultPeriodStart());
                    setChartPeriodEnd(defaultPeriodEnd());
                  }}
                >
                  Por defecto (30 días)
                </Button>
              </div>
              {periodRangeClipped && (
                <p className="text-xs text-amber-700">
                  El rango supera {MAX_CHART_DAYS} días; el gráfico muestra solo los últimos {MAX_CHART_DAYS} días hasta la fecha &quot;Hasta&quot;.
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ChartAreaInteractive
              data={leadsByDate}
              config={chartConfig}
              dateKey="date"
              valueKey="leads"
            />
          </CardContent>
        </Card>

        {/* Gráficos de categorías en una fila */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Llamadas</CardTitle>
              <CardDescription>
                Misma ventana de fechas que &quot;Leads por Período&quot; ({chartPeriodStart} → {chartPeriodEnd})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartAreaInteractive
                data={llamadasByDate}
                config={llamadasChartConfig}
                dateKey="date"
                valueKey="leads"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visitas</CardTitle>
              <CardDescription>
                Misma ventana de fechas que &quot;Leads por Período&quot;
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartAreaInteractive
                data={visitasByDate}
                config={visitasChartConfig}
                dateKey="date"
                valueKey="leads"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vender</CardTitle>
              <CardDescription>
                Misma ventana de fechas que &quot;Leads por Período&quot;
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartAreaInteractive
                data={venderByDate}
                config={venderChartConfig}
                dateKey="date"
                valueKey="leads"
              />
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de leads por campaña */}
        {uniqueCampaigns.length > 0 && (
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>Leads por Campaña</CardTitle>
                <CardDescription>
                  {effectiveCampaignChartFilter ? (
                    <>
                      Fríos, tibios y calientes para la campaña{' '}
                      <span className="font-medium text-foreground">{effectiveCampaignChartFilter}</span>
                      {' '}(fecha de ingreso en el rango del dashboard)
                    </>
                  ) : (
                    <>
                      Comparativa por campaña en el rango seleccionado. Las campañas se toman de{' '}
                      <span className="font-medium text-foreground">pautas</span> y solo se grafican leads que matchean alguna pauta (por nombre o por números).
                    </>
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:max-w-md">
                <Label htmlFor="campaign-chart-filter" className="text-xs text-muted-foreground">
                  Filtrar gráfico por campaña
                </Label>
                <select
                  id="campaign-chart-filter"
                  value={campaignChartFilter}
                  onChange={(e) => setCampaignChartFilter(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Todas las campañas (comparar campañas)</option>
                  {uniqueCampaigns.map((c, idx) => (
                    <option key={`camp-filter-${idx}-${c}`} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {effectiveCampaignChartFilter && (
                  <p className="text-xs text-muted-foreground">
                    Séries: total del día y desglose frío / tibio / caliente (otros estados no se apilan en estas curvas).
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ChartAreaInteractive
                data={campaignMainChartData}
                config={campaignMainChartConfig}
                dateKey="date"
                valueKey="leads"
              />
            </CardContent>
          </Card>
        )}

        {/* Gráficos individuales por campaña (máximo 6 campañas más importantes) */}
        {uniqueCampaigns.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Leads por Campaña Individual</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {uniqueCampaigns.slice(0, 6).map((campaign) => {
                const campaignData = individualCampaignsData[campaign] || [];
                const safeKey = campaign.replace(/[^a-zA-Z0-9]/g, '_');
                const campaignChartConfig: ChartConfig = {
                  leads: {
                    label: campaign,
                    color: campaignsChartConfig[safeKey]?.color || "#1E90FF",
                  },
                };

                return (
                  <Card key={campaign}>
                    <CardHeader>
                      <CardTitle className="text-sm">{campaign}</CardTitle>
                      <CardDescription className="text-xs">
                        En el rango de fechas del dashboard
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartAreaInteractive
                        data={campaignData}
                        config={campaignChartConfig}
                        dateKey="date"
                        valueKey="leads"
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {uniqueCampaigns.length > 6 && (
              <p className="text-sm text-gray-500 mt-4">
                Mostrando las 6 campañas con más leads. Total de campañas: {uniqueCampaigns.length}
              </p>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
