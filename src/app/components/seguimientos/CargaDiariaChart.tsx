import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type CargaDiariaChartProps = {
  /** Envíos programados por día (clave YYYY-MM-DD en hora argentina), ya ordenados. */
  dias: { dia: string; cantidad: number }[];
};

const BAR_MAX_PX = 72;

const etiquetaDia = (dia: string, formato: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es-AR', { ...formato, timeZone: 'UTC' }).format(new Date(`${dia}T12:00:00Z`));

/** Carga diaria de envíos de los próximos días: sirve para ver que no haya picos. */
export function CargaDiariaChart({ dias }: CargaDiariaChartProps) {
  const max = Math.max(1, ...dias.map((d) => d.cantidad));
  const conEnvios = dias.filter((d) => d.cantidad > 0);

  if (conEnvios.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay envíos programados en este período.</p>;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-end gap-[2px] h-[96px]" aria-label="Envíos programados por día">
        {dias.map(({ dia, cantidad }) => (
          <Tooltip key={dia}>
            <TooltipTrigger asChild>
              <div className="flex-1 h-full flex items-end cursor-default" aria-label={`${etiquetaDia(dia, { day: 'numeric', month: 'short' })}: ${cantidad} envíos`}>
                <div
                  className="w-full rounded-t-[3px] bg-primary/80 hover:bg-primary"
                  style={{ height: cantidad === 0 ? 1 : Math.max(3, Math.round((cantidad / max) * BAR_MAX_PX)) }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-medium capitalize">{etiquetaDia(dia, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <p className="text-xs opacity-80">{cantidad.toLocaleString('es-AR')} envíos</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{etiquetaDia(dias[0].dia, { day: 'numeric', month: 'short' })}</span>
        <span>{etiquetaDia(dias[dias.length - 1].dia, { day: 'numeric', month: 'short' })}</span>
      </div>
    </TooltipProvider>
  );
}
