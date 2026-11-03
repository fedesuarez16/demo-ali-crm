import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CICLO, getPaso, type Especiales } from '../../services/seguimientoCicloService';

type ToquesChartProps = {
  /** Cantidad de leads cuyo PRÓXIMO toque es cada número (1..8, o el código de una plantilla genérica). */
  porToque: Record<number, number>;
  especiales: Especiales;
  seleccionado: number | null;
  onSeleccionar: (toque: number | null) => void;
};

const BAR_MAX_PX = 140;

type BarraProps = {
  toque: number;
  n: number;
  max: number;
  especiales: Especiales;
  seleccionado: number | null;
  onSeleccionar: (toque: number | null) => void;
};

function Barra({ toque, n, max, especiales, seleccionado, onSeleccionar }: BarraProps) {
  const paso = getPaso(toque, especiales);
  if (!paso) return null;
  const alto = n === 0 ? 2 : Math.max(6, Math.round((n / max) * BAR_MAX_PX));
  const activo = seleccionado === toque;
  const atenuado = seleccionado !== null && !activo;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          role="listitem"
          onClick={() => onSeleccionar(activo ? null : toque)}
          aria-pressed={activo}
          aria-label={`${paso.titulo}: ${n} leads. ${activo ? 'Quitar filtro' : 'Filtrar la tabla'}`}
          className={cn(
            'group flex flex-col items-center justify-end rounded-lg px-1 pt-2 pb-1 transition-colors',
            'hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activo && 'bg-muted',
          )}
          style={{ minHeight: BAR_MAX_PX + 64 }}
        >
          <span className="text-xs sm:text-sm font-semibold tabular-nums text-foreground">{n.toLocaleString('es-AR')}</span>
          <span
            className={cn(
              'mt-1 w-full max-w-[44px] rounded-t transition-opacity',
              paso.especial ? 'bg-primary/60' : 'bg-primary',
              atenuado ? 'opacity-30' : 'opacity-90 group-hover:opacity-100',
            )}
            style={{ height: alto }}
          />
          <span className="mt-2 text-[11px] sm:text-xs font-medium text-foreground text-center leading-tight">{paso.etiqueta}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="font-medium">{paso.titulo} · {n.toLocaleString('es-AR')} leads</p>
        <p className="text-xs opacity-80">{paso.plantilla}</p>
        <p className="text-xs opacity-80">Después: {paso.espera}</p>
        {!paso.lista && <p className="text-xs font-medium">No sale hasta cargar el nombre de YCloud y activarla.</p>}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Cuántos leads esperan cada toque: los 8 del ciclo y, aparte, los especiales (plantillas genéricas).
 * Click en una barra filtra la tabla.
 */
export function ToquesChart({ porToque, especiales, seleccionado, onSeleccionar }: ToquesChartProps) {
  // Las plantillas activas siempre; las inactivas solo si todavía tienen leads esperando.
  const codigosEspeciales = [...especiales.values()]
    .filter((p) => p.activa || (porToque[p.codigo] ?? 0) > 0)
    .map((p) => p.codigo)
    .sort((a, b) => a - b);
  const todos = [...CICLO.map((c) => c.toque), ...codigosEspeciales];
  const max = Math.max(1, ...todos.map((t) => porToque[t] ?? 0));
  const barra = (toque: number) => (
    <Barra
      key={toque}
      toque={toque}
      n={porToque[toque] ?? 0}
      max={max}
      especiales={especiales}
      seleccionado={seleccionado}
      onSeleccionar={onSeleccionar}
    />
  );

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex gap-2 sm:gap-3 overflow-x-auto" role="list" aria-label="Leads por próximo toque">
        <div className="grid grid-cols-8 gap-1 sm:gap-3" style={{ flex: 8, minWidth: 0 }}>
          {CICLO.map((c) => barra(c.toque))}
        </div>
        {codigosEspeciales.length > 0 && (
          <div
            className="grid gap-1 sm:gap-3 border-l border-dashed pl-2 sm:pl-3"
            style={{ flex: codigosEspeciales.length, minWidth: 0, gridTemplateColumns: `repeat(${codigosEspeciales.length}, minmax(0, 1fr))` }}
          >
            {codigosEspeciales.map((c) => barra(c))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
