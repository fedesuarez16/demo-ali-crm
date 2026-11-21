'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '../components/AppLayout';
import { api, useConfigCalendario, useEventosSemana, type EventoVista, type PersonaPublica, type TipoEvento } from './hooks/useCalendario';
import { diasDeSemana, inicioDeSemana } from './calendarioUi';
import { SemanaCalendario } from './components/SemanaCalendario';
import { EventoDialog } from './components/EventoDialog';
import { AgendarDialog } from './components/AgendarDialog';
import { PersonasPanel } from './components/PersonasPanel';
import { TiposEventoPanel } from './components/TiposEventoPanel';
import { TipoEventoForm } from './components/TipoEventoForm';

const hoyLocal = () => new Date().toLocaleDateString('en-CA');

function CalendarioContainer() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = sp.get('tab') === 'config' ? 'config' : 'agenda';
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(() => {
    if (sp.get('conectado')) return { tipo: 'ok', texto: `Google Calendar de ${sp.get('conectado')} conectado.` };
    if (sp.get('error')) return { tipo: 'error', texto: sp.get('error')! };
    return null;
  });

  const config = useConfigCalendario();
  const conectadas = config.personas.filter((p) => p.conectado && p.activo);

  const [lunes, setLunes] = useState(() => inicioDeSemana(hoyLocal()));
  const [personaId, setPersonaId] = useState<number | null>(null);
  const semana = useEventosSemana(lunes, personaId, tab === 'agenda' && conectadas.length > 0);
  const dias = useMemo(() => diasDeSemana(lunes), [lunes]);

  const [eventoAbierto, setEventoAbierto] = useState<EventoVista | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [agendando, setAgendando] = useState(false);
  const [tipoEditado, setTipoEditado] = useState<TipoEvento | 'nuevo' | null>(null);
  const [guardandoTipo, setGuardandoTipo] = useState(false);
  const [errorTipo, setErrorTipo] = useState<string | null>(null);
  const [personaOcupada, setPersonaOcupada] = useState<number | null>(null);

  const moverSemana = (delta: number) => {
    const d = new Date(`${lunes}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta * 7);
    setLunes(d.toISOString().slice(0, 10));
  };

  const irATab = (t: 'agenda' | 'config') => router.replace(t === 'config' ? '/calendario?tab=config' : '/calendario');

  async function cancelarEvento() {
    if (!eventoAbierto?.crm_evento_id || !window.confirm('¿Cancelar este evento? Se borra también de Google Calendar.')) return;
    setCancelando(true);
    try {
      await api.cancelarEvento(eventoAbierto.crm_evento_id);
      setEventoAbierto(null);
      setAviso({ tipo: 'ok', texto: 'Evento cancelado.' });
      semana.recargar();
    } catch (e: any) {
      setAviso({ tipo: 'error', texto: e.message });
    } finally {
      setCancelando(false);
    }
  }

  async function guardarTipo(datos: Partial<TipoEvento>) {
    setGuardandoTipo(true);
    setErrorTipo(null);
    try {
      if (tipoEditado && tipoEditado !== 'nuevo') {
        const { slug: _slug, ...cambios } = datos;
        await api.actualizarTipo(tipoEditado.id, cambios);
      } else {
        await api.crearTipo(datos);
      }
      setTipoEditado(null);
      config.recargar();
    } catch (e: any) {
      setErrorTipo(e.message);
    } finally {
      setGuardandoTipo(false);
    }
  }

  async function borrarTipo() {
    if (!tipoEditado || tipoEditado === 'nuevo' || !window.confirm(`¿Eliminar el tipo "${tipoEditado.nombre}"?`)) return;
    setGuardandoTipo(true);
    try {
      await api.borrarTipo(tipoEditado.id);
      setTipoEditado(null);
      config.recargar();
    } catch (e: any) {
      setErrorTipo(e.message);
    } finally {
      setGuardandoTipo(false);
    }
  }

  async function accionPersona(p: PersonaPublica, accion: 'toggle' | 'desconectar') {
    if (accion === 'desconectar' && !window.confirm(`¿Desconectar el calendario de ${p.nombre}? El bot dejará de usarlo.`)) return;
    setPersonaOcupada(p.id);
    try {
      if (accion === 'toggle') await api.actualizarPersona(p.id, { activo: !p.activo });
      else await api.desconectarPersona(p.id);
      config.recargar();
    } catch (e: any) {
      setAviso({ tipo: 'error', texto: e.message });
    } finally {
      setPersonaOcupada(null);
    }
  }

  const rango = `${dias[0].slice(8, 10)}/${dias[0].slice(5, 7)} – ${dias[6].slice(8, 10)}/${dias[6].slice(5, 7)}/${dias[6].slice(0, 4)}`;

  return (
    <AppLayout>
      <div className="mb-8">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
          <div className="pl-16 pr-4 py-[13.5px] bg-slate-100 border-b border-slate-200 lg:px-6">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3 text-sm">
                <li>
                  <Link href="/" className="text-gray-600 hover:text-indigo-600">Inicio</Link>
                </li>
                <li className="flex items-center text-gray-400">
                  <span className="mx-1">/</span>
                  <span className="text-slate-800 font-medium">Calendario</span>
                </li>
              </ol>
            </nav>
          </div>
          <div className="px-4 lg:px-6 flex gap-4 text-sm">
            {(['agenda', 'config'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => irATab(t)}
                className={`py-3 border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-700 font-medium' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {t === 'agenda' ? 'Agenda' : 'Configuración'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 lg:p-6 space-y-4">
          {aviso && (
            <div className={`flex items-start justify-between gap-3 rounded-md px-4 py-3 text-sm ${aviso.tipo === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <span>{aviso.texto}</span>
              <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso" className="opacity-60 hover:opacity-100">
                ×
              </button>
            </div>
          )}
          {config.error && <div className="rounded-md px-4 py-3 text-sm bg-red-50 text-red-800">{config.error}</div>}

          {tab === 'agenda' &&
            (config.cargando ? (
              <p className="text-sm text-slate-400">Cargando…</p>
            ) : conectadas.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-lg p-8 text-center">
                <p className="text-slate-700 font-medium mb-1">No hay ningún Google Calendar conectado</p>
                <p className="text-sm text-slate-500 mb-4">Conectá la cuenta de Google Workspace de Andrés (o de quien atienda) para ver la agenda y que el bot pueda agendar.</p>
                <a href="/api/calendario/google/conectar" className="inline-block px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
                  Conectar Google Calendar
                </a>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => moverSemana(-1)} className="px-2.5 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50" aria-label="Semana anterior">
                      ←
                    </button>
                    <button type="button" onClick={() => setLunes(inicioDeSemana(hoyLocal()))} className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50">
                      Hoy
                    </button>
                    <button type="button" onClick={() => moverSemana(1)} className="px-2.5 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50" aria-label="Semana siguiente">
                      →
                    </button>
                    <span className="ml-2 text-sm font-medium text-slate-700">{rango}</span>
                    {semana.cargando && <span className="ml-2 text-xs text-slate-400">actualizando…</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {conectadas.length > 1 && (
                      <select
                        value={personaId ?? ''}
                        onChange={(e) => setPersonaId(e.target.value ? Number(e.target.value) : null)}
                        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">Todos los calendarios</option>
                        {conectadas.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                    )}
                    <button type="button" onClick={() => setAgendando(true)} className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
                      Agendar
                    </button>
                  </div>
                </div>

                {semana.error && <div className="rounded-md px-4 py-3 text-sm bg-red-50 text-red-800">{semana.error}</div>}
                {semana.errores.map((e) => (
                  <div key={e.persona_nombre} className="rounded-md px-4 py-3 text-sm bg-amber-50 text-amber-800">
                    {e.persona_nombre}: {e.error}
                    {e.codigo === 'reconectar' && (
                      <button type="button" onClick={() => irATab('config')} className="ml-2 underline">
                        Reconectar
                      </button>
                    )}
                  </div>
                ))}

                <SemanaCalendario dias={dias} eventos={semana.eventos} mostrarPersona={conectadas.length > 1 && !personaId} onEvento={setEventoAbierto} />

                {config.tipos.length > 0 && (
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    {config.tipos
                      .filter((t) => t.activo)
                      .map((t) => (
                        <span key={t.id} className="flex items-center gap-1">
                          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.nombre}
                        </span>
                      ))}
                  </div>
                )}
              </>
            ))}

          {tab === 'config' && (
            <>
              <PersonasPanel
                personas={config.personas}
                ocupado={personaOcupada}
                onToggleActivo={(p) => accionPersona(p, 'toggle')}
                onDesconectar={(p) => accionPersona(p, 'desconectar')}
              />
              <TiposEventoPanel
                tipos={config.tipos}
                personas={config.personas}
                onEditar={(t) => {
                  setErrorTipo(null);
                  setTipoEditado(t);
                }}
                onNuevo={() => {
                  setErrorTipo(null);
                  setTipoEditado('nuevo');
                }}
              />
            </>
          )}
        </div>
      </div>

      {eventoAbierto && (
        <EventoDialog evento={eventoAbierto} tipos={config.tipos} cancelando={cancelando} onCancelar={cancelarEvento} onClose={() => setEventoAbierto(null)} />
      )}
      {agendando && (
        <AgendarDialog
          tipos={config.tipos}
          onClose={() => setAgendando(false)}
          onAgendado={(msg) => {
            setAgendando(false);
            setAviso({ tipo: 'ok', texto: msg });
            semana.recargar();
          }}
        />
      )}
      {tipoEditado && (
        <TipoEventoForm
          tipo={tipoEditado === 'nuevo' ? null : tipoEditado}
          personas={config.personas.filter((p) => p.conectado)}
          guardando={guardandoTipo}
          error={errorTipo}
          onGuardar={guardarTipo}
          onBorrar={tipoEditado === 'nuevo' ? undefined : borrarTipo}
          onClose={() => setTipoEditado(null)}
        />
      )}
    </AppLayout>
  );
}

export default function CalendarioPage() {
  return (
    <Suspense fallback={null}>
      <CalendarioContainer />
    </Suspense>
  );
}
