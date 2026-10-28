import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CICLO } from '../../services/seguimientoCicloService';

type ToquesChartProps = {
  /** Cantidad de leads cuyo PRÓXIMO toque es cada número (1..8). */
  porToque: Record<number, number>;
  seleccionado: number | null;
  onSeleccionar: (toque: number | null) => void;
};

const BAR_MAX_PX = 140;

/** Una sola serie: cuántos leads esperan cada toque. Click en una barra filtra la tabla. */
export function ToquesChart({ porToque, seleccionado, onSeleccionar }: ToquesChartProps) {
  const max = Math.max(1, ...CICLO.map((c) => porToque[c.toque] ?? 0));

  return (
    <TooltipProvider delayDuration={100}>
      <div className="grid grid-cols-8 gap-2 sm:gap-3" role="list" aria-label="Leads por próximo toque">
        {CICLO.map(({ toque, plantilla, espera }) => {
          const n = porToque[toque] ?? 0;
          const alto = n === 0 ? 2 : Math.max(6, Math.round((n / max) * BAR_MAX_PX));
          const activo = seleccionado === toque;
          const atenuado = seleccionado !== null && !activo;
          return (
            <Tooltip key={toque}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="listitem"
                  onClick={() => onSeleccionar(activo ? null : toque)}
                  aria-pressed={activo}
                  aria-label={`Toque ${toque}: ${n} leads. ${activo ? 'Quitar filtro' : 'Filtrar la tabla'}`}
                  className={cn(
                    'group flex flex-col items-center justify-end rounded-lg px-1 pt-2 pb-1 transition-colors',
                    'hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    activo && 'bg-muted',
                  )}
                  style={{ minHeight: BAR_MAX_PX + 64 }}
                >
                  <span className="text-xs sm:text-sm font-semibold tabular-nums text-foreground">
                    {n.toLocaleString('es-AR')}
                  </span>
                  <span
                    className={cn(
                      'mt-1 w-full max-w-[44px] rounded-t bg-primary transition-opacity',
                      atenuado ? 'opacity-30' : 'opacity-90 group-hover:opacity-100',
                    )}
                    style={{ height: alto }}
                  />
                  <span className="mt-2 text-xs font-medium text-foreground">T{toque}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="font-medium">Toque {toque} · {n.toLocaleString('es-AR')} leads</p>
                <p className="text-xs opacity-80">{plantilla}</p>
                <p className="text-xs opacity-80">Después: {espera}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
