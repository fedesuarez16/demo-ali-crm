'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
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
  estado: string;
  label:  string;
  count:  number;
  fill:   string;
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

export function ChartBarLeadsPorEstado({
  leads,
  columnColors,
  estadoOrder,
  className,
}: ChartBarLeadsPorEstadoProps): JSX.Element {
  const data = useMemo<BarDatum[]>(() => {
    const counts = new Map<string, number>();

    for (const lead of leads) {
      const key = canonicalEstado(lead.estado);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const orderedKeys = computeOrder(counts.keys(), estadoOrder);

    return orderedKeys
      .filter(k => (counts.get(k) ?? 0) > 0)
      .map(k => ({
        estado: k,
        label:  toLabel(k),
        count:  counts.get(k)!,
        fill:   columnColors?.[k] ?? FALLBACK_COLORS[k] ?? FALLBACK_CUSTOM_COLOR,
      }));
  }, [leads, columnColors, estadoOrder]);

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
      className={`h-[350px] w-full${className ? ` ${className}` : ''}`}
    >
      <BarChart
        data={data}
        margin={{ top: 16, right: 16, left: 0, bottom: rotated ? 56 : 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={0}
          angle={rotated ? -35 : 0}
          textAnchor={rotated ? 'end' : 'middle'}
          height={rotated ? 64 : 32}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          allowDecimals={false}
          width={36}
        />
        <Tooltip
          cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.estado} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
