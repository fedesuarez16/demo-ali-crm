"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface ChartAreaInteractiveProps {
  data: Array<Record<string, any>>
  config: ChartConfig
  dateKey?: string
  valueKey?: string
  className?: string
  /** Leyenda debajo del gráfico. Por defecto: solo si hay 2+ series */
  showLegend?: boolean
  /** Eje Y con escala. Por defecto: visible */
  showYAxis?: boolean
}

function formatDay(value: string, opts: Intl.DateTimeFormatOptions) {
  // 'YYYY-MM-DD' se parsea como UTC; forzamos hora local para no correr un día
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("es-AR", opts)
}

export function ChartAreaInteractive({
  data,
  config,
  dateKey = "date",
  valueKey: _valueKey = "value",
  className = "h-[350px] w-full",
  showLegend,
  showYAxis = true,
}: ChartAreaInteractiveProps) {
  const reactId = React.useId()
  const idPrefix = `area-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`
  const seriesKeys = Object.keys(config).filter((k) => k !== dateKey)
  const legend = showLegend ?? seriesKeys.length > 1
  // Con una sola serie el relleno da cuerpo; con varias se superponen y ensucian
  const fillOpacity = seriesKeys.length > 1 ? 0.12 : 0.28

  return (
    <ChartContainer config={config} className={`bg-transparent p-0 ${className}`}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          {seriesKeys.map((key) => {
            const color = config[key]?.color || "#2a78d6"
            return (
              <linearGradient key={key} id={`${idPrefix}-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            )
          })}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey={dateKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          tickFormatter={(value) => formatDay(String(value), { day: "numeric", month: "short" })}
        />
        {showYAxis && (
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            width={32}
            allowDecimals={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
        )}
        <ChartTooltip
          cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(value) =>
                formatDay(String(value), { weekday: "short", day: "numeric", month: "long" })
              }
            />
          }
        />
        {seriesKeys.map((key) => {
          const color = config[key]?.color || "#2a78d6"
          return (
            <Area
              key={key}
              dataKey={key}
              type="monotone"
              fill={`url(#${idPrefix}-${key})`}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--background))" }}
            />
          )
        })}
        {legend && (
          <ChartLegend
            content={
              <ChartLegendContent className="flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground [&>div]:whitespace-nowrap" />
            }
          />
        )}
      </AreaChart>
    </ChartContainer>
  )
}
