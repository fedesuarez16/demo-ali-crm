'use client';

import React from 'react';
import type { RuedaMatch } from '../../../types';
import { MatchCard } from '../../../components/rueda/MatchCard';

interface Props {
  matches: RuedaMatch[];
  loading: boolean;
  error: string | null;
  onChange: (m: RuedaMatch) => void;
}

/** Pestaña "Nuevos": todos los matches en estado 'nuevo' (ya ordenados por score desc, first_seen_at desc). */
export function NuevosMatchesList({ matches, loading, error, onChange }: Props) {
  if (loading && matches.length === 0) return <p className="text-sm text-gray-500 py-8 text-center">Cargando…</p>;
  if (error) return <p className="text-sm text-red-600 py-4">{error}</p>;
  if (matches.length === 0) return <p className="text-sm text-gray-500 py-8 text-center">No hay coincidencias nuevas.</p>;
  return (
    <div className="space-y-3">
      {matches.map((m) => {
        const b = m.busqueda;
        const quien = [b?.agente_cliente, b?.tipo_de_propiedad, b?.zona].filter(Boolean).join(' · ') || `Búsqueda #${m.busqueda_id}`;
        return (
          <div key={m.id}>
            <p className="text-[11px] text-gray-500 mb-1 px-1">
              Búsqueda: <span className="font-medium text-gray-700">{quien}</span>
              {b?.valor ? ` · ${b.valor}` : ''}
            </p>
            <MatchCard match={m} lado="propiedad" onChange={onChange} />
          </div>
        );
      })}
    </div>
  );
}
