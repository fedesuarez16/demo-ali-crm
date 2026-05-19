'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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

const ARS_FORMATTER = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

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

interface CostoRow {
  estado:  string;
  label:   string;
  count:   number;
  percent: number | null;
  cost:    number | null;
  color:   string;
}

export interface CostoPorLeadCardProps {
  leads: Lead[];
  columnColors?: Record<string, string>;
  estadoOrder?: string[];
  className?: string;
}

export function CostoPorLeadCard({
  leads,
  columnColors,
  estadoOrder,
  className,
}: CostoPorLeadCardProps) {
  const [monto, setMonto] = useState<string>('');

  const montoNumber = useMemo<number | null>(() => {
    const n = parseFloat(monto);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [monto]);

  const rows = useMemo<CostoRow[]>(() => {
    const counts = new Map<string, number>();
    for (const lead of leads) {
      const key = canonicalEstado(lead.estado);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const totalLeads = leads.length;
    const orderedKeys = computeOrder(counts.keys(), estadoOrder);
    return orderedKeys.map(k => {
      const count = counts.get(k) ?? 0;
      const percent = totalLeads > 0 ? count / totalLeads : null;
      const cost = montoNumber !== null && percent !== null
        ? montoNumber * percent
        : null;
      return {
        estado:  k,
        label:   toLabel(k),
        count,
        percent,
        cost,
        color:   columnColors?.[k] ?? FALLBACK_COLORS[k] ?? FALLBACK_CUSTOM_COLOR,
      };
    });
  }, [leads, columnColors, estadoOrder, montoNumber]);

  const totalRow = useMemo(() => {
    const count = leads.length;
    const cost = montoNumber !== null && count > 0 ? montoNumber : null;
    return { count, cost };
  }, [leads, montoNumber]);

  return (
    <Card className={className}>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>Presupuesto por estado</CardTitle>
          <CardDescription>
            Ingresá el monto gastado para ver cómo se distribuye el presupuesto entre los estados, proporcional a la cantidad de leads (filtro de campaña + rango de fechas).
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:max-w-md">
          <Label htmlFor="costo-monto-input" className="text-xs text-muted-foreground">
            Monto gastado
          </Label>
          <input
            id="costo-monto-input"
            type="number"
            min="0"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0.00"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Estado</th>
                <th className="py-2 text-right font-medium">Cantidad</th>
                <th className="py-2 text-right font-medium">% del total</th>
                <th className="py-2 text-right font-medium">Presupuesto asignado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.estado} className="border-b last:border-b-0">
                  <td className="py-2">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: r.color }}
                        aria-hidden="true"
                      />
                      {r.label}
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{r.count}</td>
                  <td className="py-2 text-right tabular-nums">
                    {r.percent !== null ? PERCENT_FORMATTER.format(r.percent) : '—'}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {r.cost !== null ? ARS_FORMATTER.format(r.cost) : '—'}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 font-semibold">
                <td className="py-2">Total</td>
                <td className="py-2 text-right tabular-nums">{totalRow.count}</td>
                <td className="py-2 text-right tabular-nums">
                  {totalRow.count > 0 ? PERCENT_FORMATTER.format(1) : '—'}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {totalRow.cost !== null ? ARS_FORMATTER.format(totalRow.cost) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
