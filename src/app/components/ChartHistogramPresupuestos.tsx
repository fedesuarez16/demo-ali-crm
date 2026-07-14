'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';

const USD_FORMATTER = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const chartConfig: ChartConfig = {
  count: { label: 'Consultas', color: '#10B981' },
};

export interface HistogramBin {
  from: number;
  to: number;
  count: number;
}

export interface ChartHistogramPresupuestosProps {
  bins: HistogramBin[];
  className?: string;
}

function formatK(value: number): string {
  if (value >= 1000 && value % 1000 === 0) {
    return `${(value / 1000).toLocaleString('es-AR')}k`;
  }
  return value.toLocaleString('es-AR');
}

interface BinDatum extends HistogramBin {
  label: string;
}

interface TooltipPayloadEntry {
  payload?: BinDatum;
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
          style={{ background: '#10B981' }}
          aria-hidden="true"
        />
        {USD_FORMATTER.format(datum.from)} – {USD_FORMATTER.format(datum.to)}
      </div>
      <div className="flex items-center justify-between gap-4 text-slate-600">
        <span>Consultas</span>
        <span className="tabular-nums font-semibold text-slate-900">{datum.count}</span>
      </div>
    </div>
  );
}

export function ChartHistogramPresupuestos({
  bins,
  className,
}: ChartHistogramPresupuestosProps) {
  const chartData = useMemo<BinDatum[]>(
    () => bins.map(b => ({ ...b, label: `${formatK(b.from)}–${formatK(b.to)}` })),
    [bins],
  );

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center text-sm text-muted-foreground">
        Sin presupuestos para la selección actual.
      </div>
    );
  }

  const rotated = chartData.length > 8;

  return (
    <ChartContainer
      config={chartConfig}
      className={`h-[320px] w-full${className ? ` ${className}` : ''}`}
    >
      <BarChart
        data={chartData}
        margin={{ top: 16, right: 16, left: 0, bottom: rotated ? 56 : 16 }}
        barCategoryGap="12%"
      >
        <defs>
          <linearGradient id="histogram-presupuestos-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0.55} />
          </linearGradient>
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
          width={40}
          allowDecimals={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(148, 163, 184, 0.10)' }}
          content={<CustomTooltip />}
        />
        <Bar dataKey="count" fill="url(#histogram-presupuestos-fill)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
