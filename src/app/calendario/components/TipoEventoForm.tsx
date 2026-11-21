'use client';

import React, { useState } from 'react';
import type { PersonaPublica, TipoEvento } from '../hooks/useCalendario';
import { DIAS_SEMANA, horarioATextos, textosAHorario, type HorarioTextos } from '../calendarioUi';

interface Props {
  tipo: TipoEvento | null; // null = nuevo
  personas: PersonaPublica[];
  guardando: boolean;
  error: string | null;
  onGuardar: (datos: Partial<TipoEvento>) => void;
  onBorrar?: () => void;
  onClose: () => void;
}

const inputCls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

export function TipoEventoForm({ tipo, personas, guardando, error, onGuardar, onBorrar, onClose }: Props) {
  const [nombre, setNombre] = useState(tipo?.nombre ?? '');
  const [slug, setSlug] = useState(tipo?.slug ?? '');
  const [descripcion, setDescripcion] = useState(tipo?.descripcion ?? '');
  const [duracion, setDuracion] = useState(String(tipo?.duracion_min ?? 30));
  const [buffer, setBuffer] = useState(String(tipo?.buffer_min ?? 0));
  const [anticipacionHs, setAnticipacionHs] = useState(String((tipo?.anticipacion_min ?? 120) / 60));
  const [ventana, setVentana] = useState(String(tipo?.ventana_dias ?? 14));
  const [personaId, setPersonaId] = useState(tipo?.persona_id ? String(tipo.persona_id) : '');
  const [color, setColor] = useState(tipo?.color ?? '#3b82f6');
  const [bot, setBot] = useState(tipo?.agendable_por_bot ?? false);
  const [activo, setActivo] = useState(tipo?.activo ?? true);
  const [textos, setTextos] = useState<HorarioTextos>(horarioATextos(tipo?.horario ?? {}));
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  function enviar() {
    const h = textosAHorario(textos);
    if (!h.ok) return setErrorLocal(h.error);
    const slugFinal = slug || nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!nombre.trim() || !slugFinal) return setErrorLocal('Poné un nombre');
    setErrorLocal(null);
    onGuardar({
      nombre: nombre.trim(),
      slug: slugFinal,
      descripcion: descripcion.trim() || null,
      duracion_min: Number(duracion),
      buffer_min: Number(buffer),
      anticipacion_min: Math.round(Number(anticipacionHs) * 60),
      ventana_dias: Number(ventana),
      persona_id: personaId ? Number(personaId) : null,
      color,
      agendable_por_bot: bot,
      activo,
      horario: h.horario,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{tipo ? `Editar: ${tipo.nombre}` : 'Nuevo tipo de evento'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} placeholder="Ej: Firma de reserva" />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Identificador (para el bot)</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} className={inputCls} placeholder="se genera del nombre" disabled={!!tipo} />
          </label>
        </div>
        <label className="block text-sm mb-3">
          <span className="block text-gray-600 mb-1">Descripción (cuándo corresponde este evento)</span>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} className={inputCls} />
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Duración (min)</span>
            <input type="number" min={5} value={duracion} onChange={(e) => setDuracion(e.target.value)} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Margen (min)</span>
            <input type="number" min={0} value={buffer} onChange={(e) => setBuffer(e.target.value)} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Anticipación (hs)</span>
            <input type="number" min={0} step={0.5} value={anticipacionHs} onChange={(e) => setAnticipacionHs(e.target.value)} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Ventana (días)</span>
            <input type="number" min={1} max={90} value={ventana} onChange={(e) => setVentana(e.target.value)} className={inputCls} />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Responsable</span>
            <select value={personaId} onChange={(e) => setPersonaId(e.target.value)} className={inputCls}>
              <option value="">Primer calendario vinculado</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Color</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-[38px] w-full rounded-md border border-slate-300" />
          </label>
        </div>

        <fieldset className="mb-3">
          <legend className="text-sm text-gray-600 mb-1">Horario de atención (hora local)</legend>
          <div className="space-y-1.5">
            {DIAS_SEMANA.map((d) => (
              <label key={d.clave} className="flex items-center gap-2 text-sm">
                <span className="w-20 shrink-0 text-slate-600">{d.nombre}</span>
                <input
                  value={textos[d.clave]}
                  onChange={(e) => setTextos({ ...textos, [d.clave]: e.target.value })}
                  placeholder="no atiende"
                  className={inputCls}
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1">Formato: 09:00-13:00, 15:00-19:00</p>
        </fieldset>

        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={bot} onChange={(e) => setBot(e.target.checked)} />
            El bot de WhatsApp puede agendarlo
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            Activo
          </label>
        </div>

        {(errorLocal || error) && <p className="text-sm text-red-600 mb-3">{errorLocal || error}</p>}
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            {onBorrar && (
              <button type="button" disabled={guardando} onClick={onBorrar} className="px-3 py-2 text-sm rounded-md border border-red-200 text-red-600 hover:bg-red-50">
                Eliminar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="button" disabled={guardando} onClick={enviar} className="px-3 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
