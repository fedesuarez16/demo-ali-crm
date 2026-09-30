'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  MAX_CHART_DAYS,
  defaultPeriodEnd,
  defaultPeriodStart,
  toDateInputValue,
} from '@/app/utils/periodo';

export interface PeriodoSelectorProps {
  idPrefix: string;
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  clipped?: boolean;
  /** 'inline': una sola fila compacta, sin recuadro (para headers) */
  variant?: 'box' | 'inline';
}

const PRESETS = [7, 30, 90] as const;

export function PeriodoSelector({
  idPrefix,
  start,
  end,
  onStartChange,
  onEndChange,
  clipped = false,
  variant = 'box',
}: PeriodoSelectorProps) {
  const applyPresetDays = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    onStartChange(toDateInputValue(startDate));
    onEndChange(toDateInputValue(endDate));
  };

  if (variant === 'inline') {
    const dateClass =
      'h-8 rounded-md border border-input bg-background px-2 text-xs tabular-nums shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
    return (
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={`${idPrefix}-period-start`}
            aria-label="Desde"
            type="date"
            value={start}
            onChange={(e) => onStartChange(e.target.value)}
            className={dateClass}
          />
          <span className="text-xs text-muted-foreground">→</span>
          <input
            id={`${idPrefix}-period-end`}
            aria-label="Hasta"
            type="date"
            value={end}
            onChange={(e) => onEndChange(e.target.value)}
            className={dateClass}
          />
          <div className="flex rounded-md border border-input p-0.5 shadow-sm">
            {PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => applyPresetDays(d)}
                className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground"
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {clipped && (
          <p className="text-xs text-amber-700">
            Rango acotado a los últimos {MAX_CHART_DAYS} días.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-period-start`} className="text-xs text-muted-foreground">
            Desde
          </Label>
          <input
            id={`${idPrefix}-period-start`}
            type="date"
            value={start}
            onChange={(e) => onStartChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-period-end`} className="text-xs text-muted-foreground">
            Hasta
          </Label>
          <input
            id={`${idPrefix}-period-end`}
            type="date"
            value={end}
            onChange={(e) => onEndChange(e.target.value)}
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
            onStartChange(defaultPeriodStart());
            onEndChange(defaultPeriodEnd());
          }}
        >
          Por defecto (30 días)
        </Button>
      </div>
      {clipped && (
        <p className="text-xs text-amber-700">
          El rango supera {MAX_CHART_DAYS} días; se muestran solo los últimos {MAX_CHART_DAYS} días hasta la fecha &quot;Hasta&quot;.
        </p>
      )}
    </div>
  );
}
