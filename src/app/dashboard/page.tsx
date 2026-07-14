'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from "../components/AppLayout";
import { Lead } from "../types";
import { getAllLeads, campaignNumericFingerprint } from "../services/leadService";
import { getKanbanColumns } from '@/app/services/columnService';
import { getSystemCosts, updateSystemCosts, type SystemCosts } from '@/app/services/systemCostService';
import { ChartBarLeadsPorEstado } from '@/app/components/ChartBarLeadsPorEstado';
import { ChartHistogramPresupuestos } from '@/app/components/ChartHistogramPresupuestos';
import type { HistogramBin } from '@/app/components/ChartHistogramPresupuestos';
import { CostoPorLeadCard } from '@/app/components/CostoPorLeadCard';
import { ChartAreaInteractive } from "@/components/ui/chart-area-interactive";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
const SIN_CAMPANA_SENTINEL = '__sin_campana__';

export default function Page() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartPeriodStart, setChartPeriodStart] = useState(defaultPeriodStart);
  const [chartPeriodEnd, setChartPeriodEnd] = useState(defaultPeriodEnd);
  /** '' = todas las campañas en el gráfico combinado; si no, fríos/tibios/calientes de esa campaña */
  const [campaignChartFilter, setCampaignChartFilter] = useState<string>('');
  const [barEstadoCampaignFilter, setBarEstadoCampaignFilter] = useState<string>('');
  const [pautas, setPautas] = useState<Pauta[]>([]);
  const [columnColors, setColumnColors] = useState<Record<string, string>>({});
  const [hostingCost, setHostingCost] = useState<string>('');
  const [openaiCost, setOpenaiCost] = useState<string>('');
  const [claudeCost, setClaudeCost] = useState<string>('');
  const [costsSaveStatus, setCostsSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [ticketCampaignFilter, setTicketCampaignFilter] = useState<string>('');
  const [ticketBinSize, setTicketBinSize] = useState<number>(10000);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    const auth = localStorage.getItem('dashboard_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD || 'admin123';
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      localStorage.setItem('dashboard_auth', 'true');
    } else {
      alert('Contraseña incorrecta');
      setPasswordInput('');
    }
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const costs = await getSystemCosts();
        if (cancelled) return;
        setHostingCost(costs.hosting > 0 ? String(costs.hosting) : '');
        setOpenaiCost(costs.openai > 0 ? String(costs.openai) : '');
        setClaudeCost(costs.claude > 0 ? String(costs.claude) : '');
      } catch (e) {
        console.error('Error cargando system_costs:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persistCosts = async (overrides?: Partial<SystemCosts>) => {
    const parse = (s: string) => {
      const n = parseFloat(s);
      return Number.isFinite(n) && n > 0 ? n : 0;
    };
    const next: SystemCosts = {
      hosting: overrides?.hosting ?? parse(hostingCost),
      openai:  overrides?.openai  ?? parse(openaiCost),
      claude:  overrides?.claude  ?? parse(claudeCost),
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

  const barEstadoFilteredLeads = useMemo<Lead[]>(() => {
    const periodSet = new Set(periodDates);
    const out: Lead[] = [];
    for (const lead of leads) {
      if (!periodSet.has(leadCalendarDate(lead))) continue;
      const raw = String((lead as any).propiedad_interes || '').trim();
      if (barEstadoCampaignFilter === '') {
        out.push(lead);
      } else if (barEstadoCampaignFilter === SIN_CAMPANA_SENTINEL) {
        if (!leadRawToPautaCampaign.has(raw)) out.push(lead);
      } else {
        if (leadRawToPautaCampaign.get(raw) === barEstadoCampaignFilter) out.push(lead);
      }
    }
    return out;
  }, [leads, periodDates, leadRawToPautaCampaign, barEstadoCampaignFilter]);

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

  const totalMaintenance = useMemo(() => {
    const parse = (s: string) => {
      const n = parseFloat(s);
      return Number.isFinite(n) && n > 0 ? n : 0;
    };
    return parse(hostingCost) + parse(openaiCost) + parse(claudeCost);
  }, [hostingCost, openaiCost, claudeCost]);

  const maintenanceFormatter = useMemo(
    () => new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }),
    [],
  );

  const arsFormatter = useMemo(
    () => new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }),
    [],
  );

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

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md p-6">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Acceso Restringido</CardTitle>
              <CardDescription>
                Por favor, ingrese la contraseña para acceder al Dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Ingresar
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (

      <AppLayout>
        <div className="mb-8 m-2 space-y-6">
          {/* Breadcrumbs skeleton */}
          <div className="pl-16 pr-2 py-2 lg:px-2  bg-slate-100 z-10 backdrop-blur  border-b border-slate-200 mb-6">
            <Skeleton className="h-4 w-48" />
          </div>

          {/* Header skeleton */}
          <div className="px-2">
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Cards skeleton */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 px-2">
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

          {/* Bar chart estado skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>

          {/* Category charts skeleton */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 px-2">
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
      <div className="mb-8 px-2 m-2 space-y-6">
         {/* Breadcrumbs */}
         <div className="pl-16  pr-3 py-3 lg:px-3  z-10 sticky top-0 bg-white border-b border-slate-200 mb-6">
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
       

        {/* ───────────── SECCIÓN 1 — RESUMEN ───────────── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Resumen</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
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
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold leading-tight">{totalLeads}</div>
              <p className="text-xs text-muted-foreground">
                Todos los leads registrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
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
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold leading-tight">{leadsLast7Days}</div>
              <p className="text-xs text-muted-foreground">
                Leads ingresados esta semana
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
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
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold leading-tight">{leadsLast30Days}</div>
              <p className="text-xs text-muted-foreground">
                Leads ingresados este mes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Gasto mensual
                {costsSaveStatus === 'saving' && (
                  <span className="text-[10px] font-normal text-muted-foreground">Guardando…</span>
                )}
                {costsSaveStatus === 'saved' && (
                  <span className="text-[10px] font-normal text-emerald-600">✓ Guardado</span>
                )}
                {costsSaveStatus === 'error' && (
                  <span className="text-[10px] font-normal text-red-600">Error</span>
                )}
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
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <div className="text-xl font-bold leading-tight tabular-nums">
                {maintenanceFormatter.format(totalMaintenance)}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'gasto-hosting', label: 'Hosting', value: hostingCost, setter: setHostingCost, field: 'hosting' as const },
                  { id: 'gasto-openai',  label: 'OpenAI',  value: openaiCost,  setter: setOpenaiCost,  field: 'openai'  as const },
                  { id: 'gasto-claude',  label: 'Claude',  value: claudeCost,  setter: setClaudeCost,  field: 'claude'  as const },
                ].map(({ id, label, value, setter, field }) => (
                  <div key={id} className="flex flex-col gap-1">
                    <Label htmlFor={id} className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {label}
                    </Label>
                    <input
                      id={id}
                      type="number"
                      min="0"
                      step="0.01"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      onBlur={(e) => {
                        const n = parseFloat(e.target.value);
                        persistCosts({ [field]: Number.isFinite(n) && n > 0 ? n : 0 });
                      }}
                      placeholder="0"
                      className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
              <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
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
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold leading-tight tabular-nums">
                {ticketPromedio !== null ? arsFormatter.format(ticketPromedio) : '—'}
              </div>
              <p className="text-xs text-muted-foreground">
                Promedio de todos los leads con presupuesto
              </p>
            </CardContent>
          </Card>
        </div>
        </section>

        {/* ───────────── SECCIÓN TICKETS ───────────── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tickets</h2>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
                <div>
                  <CardTitle className="text-sm font-medium">Distribución de presupuestos</CardTitle>
                  <CardDescription className="text-xs">
                    {effectiveTicketCampaign
                      ? <>Campaña: <span className="font-medium text-foreground">{effectiveTicketCampaign}</span></>
                      : 'Todas las campañas'}
                  </CardDescription>
                </div>
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
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-xl font-bold leading-tight tabular-nums">
                      {ticketTotalSeleccion > 0 ? usdFormatter.format(ticketTotalSeleccion) : '—'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {effectiveTicketCampaign
                        ? 'Suma de presupuestos de la campaña seleccionada'
                        : 'Suma de presupuestos de leads con campaña asignada'}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Rango (USD)
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={ticketBinSize}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        setTicketBinSize(Number.isFinite(n) ? n : 10000);
                      }}
                      className="h-7 w-24 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                </div>
                <ChartHistogramPresupuestos bins={histogramaPresupuestos} className="w-full" />
                {histogramaPresupuestos.length > 0 && (
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-card">
                        <tr className="border-b">
                          <th className="py-2 text-left font-medium">Rango de búsqueda</th>
                          <th className="py-2 text-right font-medium">Cantidad de consultas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {histogramaPresupuestos.map(b => (
                          <tr key={b.from} className="border-b last:border-b-0">
                            <td className="py-1.5 text-left tabular-nums">
                              {usdFormatter.format(b.from)} – {usdFormatter.format(b.to)}
                            </td>
                            <td className="py-1.5 text-right tabular-nums">{b.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-1">
                <div>
                  <CardTitle className="text-sm font-medium">Ticket por campaña</CardTitle>
                  <CardDescription className="text-xs">
                    Solo leads con presupuesto &gt; 0. Clic en una campaña para ver su distribución.
                  </CardDescription>
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
              <CardContent className="p-4 pt-2">
                {ticketPorCampana.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos de presupuesto por campaña.</p>
                ) : (
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="py-2 text-left font-medium">Campaña</th>
                            <th className="py-2 text-right font-medium">Leads</th>
                            <th className="py-2 text-right font-medium">Total USD</th>
                            <th className="py-2 text-right font-medium">Promedio USD</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ticketPorCampana.map(r => (
                            <tr
                              key={r.campaign}
                              onClick={() =>
                                setTicketCampaignFilter(prev => (prev === r.campaign ? '' : r.campaign))
                              }
                              className={`border-b last:border-b-0 cursor-pointer transition-colors hover:bg-slate-50 ${
                                effectiveTicketCampaign === r.campaign ? 'bg-emerald-50' : ''
                              }`}
                            >
                              <td className="py-1.5 text-left max-w-[140px] truncate" title={r.campaign}>{r.campaign}</td>
                              <td className="py-1.5 text-right tabular-nums">{r.count}</td>
                              <td className="py-1.5 text-right tabular-nums">{usdFormatter.format(r.total)}</td>
                              <td className="py-1.5 text-right tabular-nums">{usdFormatter.format(r.promedio)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 font-semibold">
                            <td className="py-1.5">Total</td>
                            <td className="py-1.5 text-right tabular-nums">
                              {ticketPorCampana.reduce((s, r) => s + r.count, 0)}
                            </td>
                            <td className="py-1.5 text-right tabular-nums">{usdFormatter.format(ticketTotalCampanas)}</td>
                            <td className="py-1.5 text-right tabular-nums">—</td>
                          </tr>
                        </tbody>
                      </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ───────────── SECCIÓN 2 — EVOLUCIÓN ───────────── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Evolución temporal</h2>
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
        </section>

        {/* ───────────── SECCIÓN 3 — PIPELINE ───────────── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pipeline del rango ({chartPeriodStart} → {chartPeriodEnd})
          </h2>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* Bar chart unificado con filtro de campaña */}
            <Card>
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle>Leads por Estado</CardTitle>
                  <CardDescription>
                    {effectiveBarEstadoCampaignFilter === SIN_CAMPANA_SENTINEL ? (
                      <>Leads sin campaña asignada en el rango del dashboard.</>
                    ) : effectiveBarEstadoCampaignFilter ? (
                      <>
                        Leads de la campaña{' '}
                        <span className="font-medium text-foreground">{effectiveBarEstadoCampaignFilter}</span>
                        {' '}en el rango del dashboard.
                      </>
                    ) : (
                      <>Distribución por estado de todos los leads en el rango del dashboard.</>
                    )}
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:max-w-md">
                  <Label htmlFor="bar-estado-campaign-filter" className="text-xs text-muted-foreground">
                    Filtrar por campaña
                  </Label>
                  <select
                    id="bar-estado-campaign-filter"
                    aria-label="Filtrar gráfico Leads por Estado"
                    value={barEstadoCampaignFilter}
                    onChange={(e) => setBarEstadoCampaignFilter(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Todas las campañas</option>
                    {uniqueCampaigns.map((c, idx) => (
                      <option key={`bar-estado-camp-${idx}-${c}`} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value={SIN_CAMPANA_SENTINEL}>Sin campaña</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <ChartBarLeadsPorEstado
                  leads={barEstadoFilteredLeads}
                  columnColors={columnColors}
                />
              </CardContent>
            </Card>

            <CostoPorLeadCard
              leads={barEstadoFilteredLeads}
              columnColors={columnColors}
            />
          </div>
        </section>

        {/* ───────────── SECCIÓN 4 — ACTIVIDAD POR CATEGORÍA ───────────── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Actividad por categoría</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
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
        </section>

        {/* ───────────── SECCIÓN 5 — ANÁLISIS POR CAMPAÑA ───────────── */}
        {uniqueCampaigns.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Análisis por campaña</h2>
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

          {/* Gráficos individuales por campaña (máximo 6 campañas más importantes) */}
          <div className="pt-2">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Por campaña individual</h3>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
        </section>
        )}
      </div>
    </AppLayout>
  );
}
