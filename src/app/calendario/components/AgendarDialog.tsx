'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api, type TipoEvento } from '../hooks/useCalendario';

interface Props {
  tipos: TipoEvento[];
  onClose: () => void;
  onAgendado: (mensaje: string) => void;
}

type Slot = { inicio: string; fin: string; texto: string };

const inputCls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

export function AgendarDialog({ tipos, onClose, onAgendado }: Props) {
  const activos = tipos.filter((t) => t.activo);
  const [tipo, setTipo] = useState(activos[0]?.slug ?? '');
  const [fecha, setFecha] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [errorSlots, setErrorSlots] = useState<string | null>(null);
  const [inicio, setInicio] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [telefono, setTelefono] = useState('');
  const [nombre, setNombre] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [superpuesto, setSuperpuesto] = useState(false);

  useEffect(() => {
    if (!tipo) return;
    let vigente = true;
    setCargandoSlots(true);
    setErrorSlots(null);
    setInicio(null);
    api
      .disponibilidad(tipo, fecha || undefined, fecha ? 1 : undefined)
      .then((r) => vigente && setSlots(r.slots))
      .catch((e) => vigente && (setSlots([]), setErrorSlots(e.message)))
      .finally(() => vigente && setCargandoSlots(false));
    return () => {
      vigente = false;
    };
  }, [tipo, fecha]);

  const porDia = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots.slice(0, 60)) {
      const dia = s.texto.split(' ').slice(0, 2).join(' ');
      m.set(dia, [...(m.get(dia) ?? []), s]);
    }
    return [...m.entries()];
  }, [slots]);

  const elegido = manual ? new Date(manual).toISOString() : inicio;

  async function guardar(forzar = false) {
    if (!elegido) return setError('Elegí un horario');
    if (!telefono.trim() && !nombre.trim()) return setError('Indicá al menos el teléfono o el nombre de la persona');
    setGuardando(true);
    setError(null);
    try {
      const r = await api.crearEvento({
        tipo,
        inicio: elegido,
        whatsapp_id: telefono.trim() || undefined,
        nombre: nombre.trim() || undefined,
        notas: notas.trim() || undefined,
        forzar,
      });
      onAgendado(r.confirmacion);
    } catch (e: any) {
      setError(e.message);
      setSuperpuesto(e.codigo === 'ocupado');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Agendar evento</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Tipo</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
              {activos.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.nombre} ({t.duracion_min} min)
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Día (opcional)</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
          </label>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Horarios libres</p>
          {cargandoSlots && <p className="text-sm text-slate-400">Buscando disponibilidad…</p>}
          {errorSlots && <p className="text-sm text-red-600">{errorSlots}</p>}
          {!cargandoSlots && !errorSlots && slots.length === 0 && <p className="text-sm text-slate-400">No hay turnos libres en ese período.</p>}
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {porDia.map(([dia, lista]) => (
              <div key={dia}>
                <p className="text-xs font-medium text-slate-500 capitalize mb-1">{dia}</p>
                <div className="flex flex-wrap gap-1.5">
                  {lista.map((s) => (
                    <button
                      key={s.inicio}
                      type="button"
                      onClick={() => {
                        setInicio(s.inicio);
                        setManual('');
                      }}
                      className={`px-2.5 py-1 text-xs rounded-md border ${
                        inicio === s.inicio && !manual ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {s.texto.split(' ')[2]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <label className="block text-sm mt-3">
            <span className="block text-gray-600 mb-1">…u otro horario</span>
            <input type="datetime-local" value={manual} onChange={(e) => setManual(e.target.value)} className={inputCls} />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Teléfono / WhatsApp</span>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+549221..." className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
          </label>
        </div>
        <label className="block text-sm mb-4">
          <span className="block text-gray-600 mb-1">Notas</span>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} className={inputCls} />
        </label>
        <p className="text-xs text-slate-400 mb-3">Si el teléfono coincide con un lead (últimos 10 dígitos), el evento queda vinculado a ese lead.</p>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          {superpuesto && (
            <button type="button" disabled={guardando} onClick={() => guardar(true)} className="px-3 py-2 text-sm rounded-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">
              Agendar igual
            </button>
          )}
          <button
            type="button"
            disabled={guardando || !elegido}
            onClick={() => guardar(false)}
            className="px-3 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {guardando ? 'Agendando…' : 'Agendar'}
          </button>
        </div>
      </div>
    </div>
  );
}
