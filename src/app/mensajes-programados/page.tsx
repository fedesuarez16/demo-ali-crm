'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToquesChart } from '../components/seguimientos/ToquesChart';
import { CargaDiariaChart } from '../components/seguimientos/CargaDiariaChart';
import { ETIQUETA_ESTADO, SeguimientosTable } from '../components/seguimientos/SeguimientosTable';
import {
  getSeguimientosCiclo,
  quitarDelCiclo,
  reintentarSeguimiento,
  reprogramarSeguimiento,
  type EstadoSeguimiento,
  type SeguimientoCiclo,
} from '../services/seguimientoCicloService';

const TZ = 'America/Argentina/Buenos_Aires';
const DIAS_CARGA = 60;
const EN_CICLO: EstadoSeguimiento[] = ['vencido', 'programado', 'en_pausa', 'enviando'];

type FiltroEstado = 'en_ciclo' | EstadoSeguimiento | 'todos';

const FILTROS: { valor: FiltroEstado; texto: string }[] = [
  { valor: 'en_ciclo', texto: 'En ciclo' },
  { valor: 'vencido', texto: ETIQUETA_ESTADO.vencido.texto },
  { valor: 'programado', texto: ETIQUETA_ESTADO.programado.texto },
  { valor: 'en_pausa', texto: ETIQUETA_ESTADO.en_pausa.texto },
  { valor: 'error', texto: ETIQUETA_ESTADO.error.texto },
  { valor: 'completado', texto: ETIQUETA_ESTADO.completado.texto },
  { valor: 'todos', texto: 'Todos' },
];

/** YYYY-MM-DD en hora argentina. */
const diaArg = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

function StatCard({ titulo, valor, detalle, destacado }: { titulo: string; valor: number; detalle: string; destacado?: boolean }) {
  return (
    <Card className={cn(destacado && 'border-primary/40')}>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{valor.toLocaleString('es-AR')}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>
      </CardContent>
    </Card>
  );
}

export default function MensajesProgramadosPage() {
  const [filas, setFilas] = useState<SeguimientoCiclo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ocupadoId, setOcupadoId] = useState<number | null>(null);

  const [workflowActivo, setWorkflowActivo] = useState<boolean | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('en_ciclo');
  const [filtroToque, setFiltroToque] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const loadFilas = useCallback(async () => {
    setIsLoading(true);
    try {
      setFilas(await getSeguimientosCiclo());
      setLoadError(null);
    } catch (e) {
      console.error('Error cargando seguimientos:', e);
      setLoadError('No se pudieron cargar los seguimientos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadWorkflowState = useCallback(async () => {
    try {
      const res = await fetch('/api/n8n/seguimiento-workflow', { method: 'GET', cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setWorkflowActivo(data.active);
        setWorkflowError(null);
      } else {
        setWorkflowActivo(null);
        setWorkflowError(data.error ?? 'No se pudo cargar el estado del workflow');
      }
    } catch {
      setWorkflowActivo(null);
      setWorkflowError('No se pudo cargar el estado del workflow');
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadFilas(), loadWorkflowState()]);
  }, [loadFilas, loadWorkflowState]);

  const handleToggleWorkflow = async () => {
    if (workflowActivo === null) return;
    if (workflowActivo) {
      const ok = window.confirm('¿Pausar el envío automático de seguimientos? Nada se borra: los toques quedan esperando hasta que lo reactives.');
      if (!ok) return;
    }
    setIsToggling(true);
    try {
      const res = await fetch('/api/n8n/seguimiento-workflow', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: workflowActivo ? 'deactivate' : 'activate' }),
      });
      const data = await res.json();
      if (res.ok) {
        setWorkflowActivo(data.active);
        setWorkflowError(null);
      } else {
        window.alert('No se pudo cambiar el estado: ' + (data.error ?? res.statusText));
      }
    } catch {
      window.alert('Error de red al cambiar el estado del workflow.');
    } finally {
      setIsToggling(false);
    }
  };

  const conAccion = async (id: number, accion: () => Promise<boolean>, mensajeError: string) => {
    setOcupadoId(id);
    try {
      if (await accion()) await loadFilas();
      else window.alert(mensajeError);
    } finally {
      setOcupadoId(null);
    }
  };

  const handleReprogramar = (id: number, fecha: Date) =>
    conAccion(id, () => reprogramarSeguimiento(id, fecha), 'No se pudo cambiar la fecha.');

  const handleReintentar = (id: number) =>
    conAccion(id, () => reintentarSeguimiento(id), 'No se pudo reintentar el envío.');

  const handleQuitar = async (fila: SeguimientoCiclo) => {
    const quien = fila.nombre ? `${fila.nombre} (${fila.telefono})` : fila.telefono;
    if (!window.confirm(`¿Sacar a ${quien} del ciclo de seguimientos? No va a recibir más toques automáticos.`)) return;
    await conAccion(fila.id, () => quitarDelCiclo(fila.id), 'No se pudo quitar el seguimiento.');
  };

  const stats = useMemo(() => {
    const en7Dias = Date.now() + 7 * 86_400_000;
    const porToque: Record<number, number> = {};
    let enCiclo = 0, vencidos = 0, proximos7 = 0, enPausa = 0, errores = 0, completados = 0;
    for (const f of filas) {
      if (EN_CICLO.includes(f.estado)) {
        enCiclo++;
        if (f.proximoToque) porToque[f.proximoToque] = (porToque[f.proximoToque] ?? 0) + 1;
      }
      if (f.estado === 'vencido') vencidos++;
      if (f.estado === 'programado' && f.fechaProgramada && f.fechaProgramada.getTime() <= en7Dias) proximos7++;
      if (f.estado === 'en_pausa') enPausa++;
      if (f.estado === 'error') errores++;
      if (f.estado === 'completado') completados++;
    }
    return { porToque, enCiclo, vencidos, proximos7, enPausa, errores, completados };
  }, [filas]);

  const cargaDiaria = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const f of filas) {
      if ((f.estado === 'programado' || f.estado === 'vencido') && f.fechaProgramada) {
        const dia = diaArg(f.fechaProgramada < new Date() ? new Date() : f.fechaProgramada);
        conteo.set(dia, (conteo.get(dia) ?? 0) + 1);
      }
    }
    const dias: { dia: string; cantidad: number }[] = [];
    for (let i = 0; i < DIAS_CARGA; i++) {
      const dia = diaArg(new Date(Date.now() + i * 86_400_000));
      dias.push({ dia, cantidad: conteo.get(dia) ?? 0 });
    }
    return dias;
  }, [filas]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const qDigitos = q.replace(/\D/g, '');
    return filas
      .filter((f) => {
        if (filtroEstado === 'en_ciclo' && !EN_CICLO.includes(f.estado)) return false;
        if (filtroEstado !== 'en_ciclo' && filtroEstado !== 'todos' && f.estado !== filtroEstado) return false;
        if (filtroToque !== null && f.proximoToque !== filtroToque) return false;
        if (q) {
          const porNombre = (f.nombre ?? '').toLowerCase().includes(q);
          const porTelefono = qDigitos.length >= 3 && f.telefono.replace(/\D/g, '').includes(qDigitos);
          if (!porNombre && !porTelefono) return false;
        }
        return true;
      })
      .sort((a, b) => (a.fechaProgramada?.getTime() ?? Infinity) - (b.fechaProgramada?.getTime() ?? Infinity));
  }, [filas, filtroEstado, filtroToque, busqueda]);

  const conteoFiltro = (valor: FiltroEstado) =>
    valor === 'todos' ? filas.length : valor === 'en_ciclo' ? stats.enCiclo : filas.filter((f) => f.estado === valor).length;

  return (
    <AppLayout>
      <div className="mb-8">
        <div className="sticky top-0 z-10 backdrop-blur bg-background/70 border-b mb-2">
          <div className="pl-16 pr-2 py-2 lg:px-2">
            <nav className="flex text-sm" aria-label="Breadcrumb">
              <Link href="/" className="font-medium text-muted-foreground hover:text-foreground">Inicio</Link>
              <span className="mx-2 text-muted-foreground">/</span>
              <span className="font-medium text-foreground">Seguimientos</span>
            </nav>
          </div>

          <div className="px-3 sm:px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">Seguimientos automáticos</h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    'inline-block h-2 w-2 rounded-full',
                    workflowActivo === true ? 'bg-emerald-500' : workflowActivo === false ? 'bg-amber-500' : 'bg-muted-foreground/40',
                  )}
                  aria-hidden
                />
                {workflowActivo === true && 'Enviando · de 15 a 21 h, cada 3 minutos'}
                {workflowActivo === false && 'Pausado · no sale ningún toque'}
                {workflowActivo === null && (workflowError ?? 'Cargando estado…')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleWorkflow}
                disabled={isToggling || workflowActivo === null}
                className={workflowActivo ? 'text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800' : ''}
              >
                {isToggling ? 'Cambiando…' : workflowActivo ? 'Pausar envíos' : 'Activar envíos'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void Promise.all([loadFilas(), loadWorkflowState()])} disabled={isLoading}>
                {isLoading ? 'Actualizando…' : 'Actualizar'}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-3 sm:p-6">
          {loadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {loadError}
            </div>
          )}

          {isLoading && filas.length === 0 ? (
            <div className="py-24 text-center text-sm text-muted-foreground">Cargando seguimientos…</div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <StatCard titulo="En ciclo" valor={stats.enCiclo} detalle="leads recibiendo toques" destacado />
                <StatCard titulo="Salen ahora" valor={stats.vencidos} detalle="en la próxima corrida" />
                <StatCard titulo="Próximos 7 días" valor={stats.proximos7} detalle="toques programados" />
                <StatCard titulo="En pausa" valor={stats.enPausa} detalle="lead en otra columna" />
                <StatCard titulo="Con error" valor={stats.errores} detalle="YCloud rechazó el envío" />
                <StatCard titulo="Completaron" valor={stats.completados} detalle="los 8 toques" />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <Card className="xl:col-span-3">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Leads por próximo toque</CardTitle>
                    <CardDescription>
                      T1 es el mensaje de la IA; del T2 al T8 son plantillas. Tocá una barra para filtrar la tabla.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ToquesChart porToque={stats.porToque} seleccionado={filtroToque} onSeleccionar={setFiltroToque} />
                  </CardContent>
                </Card>

                <Card className="xl:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Envíos por día</CardTitle>
                    <CardDescription>Próximos {DIAS_CARGA} días. El tope es de unos 100 por día.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CargaDiariaChart dias={cargaDiaria} />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">Seguimientos</CardTitle>
                      <CardDescription>
                        {filtroToque !== null ? (
                          <>
                            Mostrando el toque {filtroToque}.{' '}
                            <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => setFiltroToque(null)}>
                              Ver todos los toques
                            </button>
                          </>
                        ) : (
                          'Ordenados por fecha del próximo toque.'
                        )}
                      </CardDescription>
                    </div>
                    <Input
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar por nombre o teléfono"
                      className="lg:w-72 h-9"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2" role="group" aria-label="Filtrar por estado">
                    {FILTROS.map(({ valor, texto }) => (
                      <button
                        key={valor}
                        type="button"
                        onClick={() => setFiltroEstado(valor)}
                        aria-pressed={filtroEstado === valor}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          filtroEstado === valor
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {texto} <span className="tabular-nums opacity-70">{conteoFiltro(valor).toLocaleString('es-AR')}</span>
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <SeguimientosTable
                    key={`${filtroEstado}-${filtroToque}-${busqueda}`}
                    filas={filtradas}
                    ocupadoId={ocupadoId}
                    onReprogramar={handleReprogramar}
                    onReintentar={handleReintentar}
                    onQuitar={handleQuitar}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
