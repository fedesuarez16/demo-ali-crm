'use client';

import React, { useId, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';

const USD_FORMATTER = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const chartConfig: ChartConfig = {
  total: { label: 'Total USD', color: '#10B981' },
};

interface BarDatum {
  campaign: string;
  count: number;
  total: number;
  promedio: number;
  gradientId: string;
}

export interface ChartBarTicketPorCampanaProps {
  data: { campaign: string; count: number; total: number; promedio: number }[];
  className?: string;
}

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
          style={{ background: '#10B981' }}
          aria-hidden="true"
        />
        {datum.campaign}
      </div>
      <div className="flex items-center justify-between gap-4 text-slate-600">
        <span>Total</span>
        <span className="tabular-nums font-semibold text-slate-900">
          {USD_FORMATTER.format(datum.total)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 text-slate-600">
        <span>Leads</span>
        <span className="tabular-nums font-semibold text-slate-900">{datum.count}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-slate-600">
        <span>Promedio</span>
        <span className="tabular-nums font-semibold text-slate-900">
          {USD_FORMATTER.format(datum.promedio)}
        </span>
      </div>
    </div>
  );
}

export function ChartBarTicketPorCampana({
  data,
  className,
}: ChartBarTicketPorCampanaProps) {
  const reactId = useId();
  const gradientPrefix = `bar-gradient-${reactId.replace(/[:]/g, '')}`;

  const chartData = useMemo<BarDatum[]>(() => {
    return data.map(d => ({
      ...d,
      gradientId: `${gradientPrefix}-${d.campaign.replace(/[^a-zA-Z0-9]/g, '_')}`,
    }));
  }, [data, gradientPrefix]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center text-sm text-muted-foreground">
        Sin datos de presupuesto por campaña.
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
      >
        <defs>
          {chartData.map(d => (
            <linearGradient key={d.gradientId} id={d.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#10B981" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.55} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="campaign"
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
          width={80}
          tickFormatter={(v: number) => USD_FORMATTER.format(v)}
          tick={{ fill: '#64748b', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(148, 163, 184, 0.10)' }}
          content={<CustomTooltip />}
        />
        <Bar dataKey="total" radius={[6, 6, 0, 0]}>
          {chartData.map((d) => (
            <Cell key={d.campaign} fill={`url(#${d.gradientId})`} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
