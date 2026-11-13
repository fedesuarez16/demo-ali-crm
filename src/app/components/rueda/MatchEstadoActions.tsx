'use client';

import React from 'react';
import type { MatchEstado } from '../../types';
import { accionesDisponibles } from '../../utils/ruedaUi';

const ETIQUETAS: Partial<Record<MatchEstado, string>> = {
  contactado: 'Contactado',
  pendiente: 'Pendiente',
  interesado: 'Interesado',
  descartado: 'Descartar',
};

const CLASES: Partial<Record<MatchEstado, string>> = {
  contactado: 'border-blue-200 text-blue-700 hover:bg-blue-50',
  pendiente: 'border-amber-200 text-amber-700 hover:bg-amber-50',
  interesado: 'border-green-200 text-green-700 hover:bg-green-50',
  descartado: 'border-red-200 text-red-700 hover:bg-red-50',
};

interface Props {
  estado: MatchEstado;
  disabled?: boolean;
  onEstado: (estado: MatchEstado) => void;
  onRestaurar: () => void;
}

export function MatchEstadoActions({ estado, disabled, onEstado, onRestaurar }: Props) {
  const { estados, restaurar } = accionesDisponibles(estado);
  const base = 'px-2 py-1 rounded-md text-xs font-medium border bg-white disabled:opacity-50 disabled:cursor-not-allowed';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {estados.map((e) => (
        <button key={e} type="button" disabled={disabled} onClick={() => onEstado(e)} className={`${base} ${CLASES[e] ?? ''}`}>
          {ETIQUETAS[e]}
        </button>
      ))}
      {restaurar && (
        <button type="button" disabled={disabled} onClick={onRestaurar} className={`${base} border-slate-300 text-slate-700 hover:bg-slate-50`}>
          Restaurar
        </button>
      )}
    </div>
  );
}
