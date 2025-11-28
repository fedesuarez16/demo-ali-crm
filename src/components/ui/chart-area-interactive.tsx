"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface ChartAreaInteractiveProps {
  data: Array<Record<string, any>>
  config: ChartConfig
  dateKey?: string
  valueKey?: string
}

export function ChartAreaInteractive({
  data,
  config,
  dateKey = "date",
  valueKey = "value",
}: ChartAreaInteractiveProps) {
  const [activeDate, setActiveDate] = React.useState<string | null>(null)

  const activeData = React.useMemo(() => {
    if (!activeDate) return data

    return data.map((item) => ({
      ...item,
      isActive: item[dateKey] === activeDate,
    }))
  }, [activeDate, data, dateKey])

  const chartData = React.useMemo(() => {
    return activeData.map((item) => ({
      ...item,
      active: item.isActive ? "yes" : "no",
    }))
  }, [activeData])

  const CustomTooltip = (props: any) => {
    if (!props) return null
    
    if (props.active && props.payload && props.payload.length) {
      const date = props.payload[0].payload[dateKey]
      setActiveDate(date)
    }

    return <ChartTooltipContent {...props} />
  }

  return (
    <ChartContainer config={config} className="h-[350px] w-full">
      <AreaChart
        data={chartData}
        onMouseLeave={() => setActiveDate(null)}
        margin={{
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey={dateKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => {
            const date = new Date(value)
            return date.toLocaleDateString("es-AR", {
              month: "short",
              day: "numeric",
            })
          }}
        />
        <Tooltip content={CustomTooltip} />
        {Object.keys(config).map((key) => {
          if (key === dateKey) return null
          const itemConfig = config[key]
          const color = itemConfig?.color || "#0ea5e9"
          return (
            <Area
              key={key}
              dataKey={key}
              type="natural"
              fill={color}
              fillOpacity={0.6}
              stroke={color}
              stackId="a"
            />
          )
        })}
      </AreaChart>
    </ChartContainer>
  )
}

