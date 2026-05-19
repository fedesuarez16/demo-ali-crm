'use client';

import React, { useId, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { canonicalEstado } from '@/app/services/columnService';
import type { Lead } from '@/app/types';

const FALLBACK_COLORS: Record<string, string> = {
  'frío':     '#4169E1',
  'tibio':    '#FFA500',
  'caliente': '#FF4500',
  'llamada':  '#10B981',
  'visita':   '#3B82F6',
  'vender':   '#F59E0B',
};

const FALLBACK_CUSTOM_COLOR = '#8B5CF6';

const BASE_ORDER: readonly string[] = [
  'frío', 'tibio', 'caliente', 'llamada', 'visita', 'vender',
];

const LABEL_BY_CANONICAL: Record<string, string> = {
  'frío':     'Fríos',
  'tibio':    'Tibios',
  'caliente': 'Calientes',
  'llamada':  'Llamadas',
  'visita':   'Visitas',
  'vender':   'Vender',
};

const PERCENT_FORMATTER = new Intl.NumberFormat('es-AR', {
  style: 'percent',
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

function toLabel(canonical: string): string {
  if (LABEL_BY_CANONICAL[canonical]) return LABEL_BY_CANONICAL[canonical];
  return canonical.charAt(0).toUpperCase() + canonical.slice(1);
}

function computeOrder(keys: Iterable<string>, estadoOrder?: string[]): string[] {
  if (estadoOrder && estadoOrder.length > 0) {
    const canonical = estadoOrder.map(canonicalEstado).filter(Boolean);
    const keySet = new Set(keys);
    const ordered = canonical.filter(k => keySet.has(k));
    const remaining = Array.from(keySet).filter(k => !canonical.includes(k));
    remaining.sort((a, b) => a.localeCompare(b, 'es'));
    return [...ordered, ...remaining];
  }

  const keyArray = Array.from(keys);
  const base = BASE_ORDER.filter(k => keyArray.includes(k));
  const custom = keyArray.filter(k => !BASE_ORDER.includes(k));
  custom.sort((a, b) => a.localeCompare(b, 'es'));
  return [...base, ...custom];
}

interface BarDatum {
  estado:    string;
  label:     string;
  count:     number;
  percent:   number;
  color:     string;
  gradientId: string;
}

export interface ChartBarLeadsPorEstadoProps {
  leads: Lead[];
  columnColors?: Record<string, string>;
  estadoOrder?: string[];
  className?: string;
}

const chartConfig: ChartConfig = {
  count: { label: 'Leads', color: '#1E90FF' },
};

interface TooltipPayloadEntry {
  payload?: BarDatum;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="mb-1 flex items-center gap-2 font-medium text-slate-800">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: datum.color }}
          aria-hidden="true"
        />
        {datum.label}
      </div>
      <div className="flex items-center justify-between gap-4 text-slate-600">
        <span>Leads</span>
        <span className="tabular-nums font-semibold text-slate-900">{datum.count}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-slate-600">
        <span>% del total</span>
        <span className="tabular-nums font-semibold text-slate-900">
          {PERCENT_FORMATTER.format(datum.percent)}
        </span>
      </div>
    </div>
  );
}

export function ChartBarLeadsPorEstado({
  leads,
  columnColors,
  estadoOrder,
  className,
}: ChartBarLeadsPorEstadoProps) {
  const reactId = useId();
  const gradientPrefix = `bar-gradient-${reactId.replace(/[:]/g, '')}`;

  const data = useMemo<BarDatum[]>(() => {
    const counts = new Map<string, number>();

    for (const lead of leads) {
      const key = canonicalEstado(lead.estado);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const orderedKeys = computeOrder(counts.keys(), estadoOrder);
    const total = leads.length;

    return orderedKeys
      .filter(k => (counts.get(k) ?? 0) > 0)
      .map(k => {
        const count = counts.get(k)!;
        const color = columnColors?.[k] ?? FALLBACK_COLORS[k] ?? FALLBACK_CUSTOM_COLOR;
        return {
          estado:     k,
          label:      toLabel(k),
          count,
          percent:    total > 0 ? count / total : 0,
          color,
          gradientId: `${gradientPrefix}-${k.replace(/[^a-zA-Z0-9]/g, '_')}`,
        };
      });
  }, [leads, columnColors, estadoOrder, gradientPrefix]);

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center text-sm text-muted-foreground">
        Sin leads para mostrar.
      </div>
    );
  }

  const rotated = data.length > 8;

  return (
    <ChartContainer
      config={chartConfig}
      className={`h-[320px] w-full${className ? ` ${className}` : ''}`}
    >
      <BarChart
        data={data}
        margin={{ top: 16, right: 16, left: 0, bottom: rotated ? 56 : 16 }}
      >
        <defs>
          {data.map(d => (
            <linearGradient key={d.gradientId} id={d.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={d.color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={d.color} stopOpacity={0.55} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={0}
          angle={rotated ? -35 : 0}
          textAnchor={rotated ? 'end' : 'middle'}
          height={rotated ? 64 : 32}
          tick={{ fill: '#64748b', fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          allowDecimals={false}
          width={36}
          tick={{ fill: '#64748b', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(148, 163, 184, 0.10)' }}
          content={<CustomTooltip />}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.estado} fill={`url(#${d.gradientId})`} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
