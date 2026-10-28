import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CICLO, type EstadoSeguimiento, type SeguimientoCiclo } from '../../services/seguimientoCicloService';

const TZ = 'America/Argentina/Buenos_Aires';

export const ETIQUETA_ESTADO: Record<EstadoSeguimiento, { texto: string; clase: string }> = {
  vencido: { texto: 'Sale ahora', clase: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  programado: { texto: 'Programado', clase: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300' },
  en_pausa: { texto: 'En pausa', clase: 'bg-muted text-muted-foreground' },
  enviando: { texto: 'Enviando', clase: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300' },
  completado: { texto: 'Completó el ciclo', clase: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  error: { texto: 'Error de envío', clase: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300' },
  fuera_de_ciclo: { texto: 'Fuera de ciclo', clase: 'bg-muted text-muted-foreground' },
};

const fmtFecha = (d: Date | null) =>
  d
    ? new Intl.DateTimeFormat('es-AR', { timeZone: TZ, day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d)
    : '—';

const relativa = (d: Date | null) => {
  if (!d) return '';
  const dias = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (dias === 0) return 'hoy';
  const rtf = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });
  return Math.abs(dias) >= 60 ? rtf.format(Math.round(dias / 30), 'month') : rtf.format(dias, 'day');
};

/** Valor para <input type="datetime-local"> en la hora local del navegador. */
const aInputLocal = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

type SeguimientosTableProps = {
  filas: SeguimientoCiclo[];
  ocupadoId: number | null;
  onReprogramar: (id: number, fecha: Date) => Promise<void>;
  onReintentar: (id: number) => Promise<void>;
  onQuitar: (fila: SeguimientoCiclo) => Promise<void>;
};

const POR_PAGINA = 50;

export function SeguimientosTable({ filas, ocupadoId, onReprogramar, onReintentar, onQuitar }: SeguimientosTableProps) {
  const [pagina, setPagina] = useState(0);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [fechaTemp, setFechaTemp] = useState('');

  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const visibles = filas.slice(paginaActual * POR_PAGINA, (paginaActual + 1) * POR_PAGINA);

  if (filas.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No hay seguimientos con estos filtros.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Lead</th>
              <th className="py-2 pr-3 font-medium">Próximo toque</th>
              <th className="py-2 pr-3 font-medium">Fecha</th>
              <th className="py-2 pr-3 font-medium hidden md:table-cell">Último envío</th>
              <th className="py-2 pr-3 font-medium">Estado</th>
              <th className="py-2 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => {
              const paso = f.proximoToque ? CICLO[f.proximoToque - 1] : null;
              const editando = editandoId === f.id;
              const ocupado = ocupadoId === f.id;
              return (
                <tr key={f.id} className="border-b last:border-0 align-top hover:bg-muted/40">
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-foreground">{f.nombre || 'Sin nombre'}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {f.telefono}
                      {f.estadoLead && <span className="ml-1.5">· {f.estadoLead}</span>}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    {paso ? (
                      <>
                        <div className="font-medium">Toque {paso.toque} <span className="text-muted-foreground font-normal">de 8</span></div>
                        <div className="text-xs text-muted-foreground">{paso.plantilla}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        {f.estado === 'completado' ? '8 de 8 enviados' : `Contador ${f.seguimientosCount}`}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    {editando ? (
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="datetime-local"
                          value={fechaTemp}
                          onChange={(e) => setFechaTemp(e.target.value)}
                          className="rounded-md border bg-background px-2 py-1 text-xs"
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={!fechaTemp || ocupado}
                            onClick={async () => {
                              await onReprogramar(f.id, new Date(fechaTemp));
                              setEditandoId(null);
                            }}
                          >
                            Guardar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditandoId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : f.estado === 'completado' ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <>
                        <div className="tabular-nums">{fmtFecha(f.fechaProgramada)}</div>
                        <div className="text-xs text-muted-foreground">{relativa(f.fechaProgramada)}</div>
                      </>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 hidden md:table-cell whitespace-nowrap text-muted-foreground tabular-nums">
                    {fmtFecha(f.enviadoAt)}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap', ETIQUETA_ESTADO[f.estado].clase)}>
                      {ETIQUETA_ESTADO[f.estado].texto}
                    </span>
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    {f.estado === 'error' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs mr-1" disabled={ocupado} onClick={() => onReintentar(f.id)}>
                        Reintentar
                      </Button>
                    )}
                    {f.estado !== 'completado' && !editando && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        disabled={ocupado}
                        onClick={() => {
                          setFechaTemp(aInputLocal(f.fechaProgramada ?? new Date()));
                          setEditandoId(f.id);
                        }}
                      >
                        Cambiar fecha
                      </Button>
                    )}
                    {f.estado !== 'completado' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
                        disabled={ocupado}
                        onClick={() => onQuitar(f)}
                      >
                        Quitar
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {(paginaActual * POR_PAGINA + 1).toLocaleString('es-AR')}–
          {Math.min(filas.length, (paginaActual + 1) * POR_PAGINA).toLocaleString('es-AR')} de{' '}
          {filas.length.toLocaleString('es-AR')}
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={paginaActual === 0} onClick={() => setPagina(paginaActual - 1)}>
            Anterior
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={paginaActual >= totalPaginas - 1} onClick={() => setPagina(paginaActual + 1)}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
