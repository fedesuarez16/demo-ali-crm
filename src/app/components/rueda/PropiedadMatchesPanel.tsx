'use client';

import React, { useState } from 'react';
import { MatchCard } from './MatchCard';
import { CasiMatches } from './CasiMatches';
import { useRuedaMatches } from '../../propiedades/busquedas/hooks/useRuedaMatches';

/** Match inverso: búsquedas que coinciden con una propiedad. */
export function PropiedadMatchesPanel({ propiedadId }: { propiedadId: string | number }) {
  const [mostrarDescartados, setMostrarDescartados] = useState(false);
  const { matches, loading, error, aplicarCambio } = useRuedaMatches(
    { propiedadId, incluirDescartados: mostrarDescartados },
    !!propiedadId,
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 mb-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-gray-800">Búsquedas que coinciden ({matches.length})</h2>
        <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input type="checkbox" checked={mostrarDescartados} onChange={(e) => setMostrarDescartados(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
          Mostrar descartados
        </label>
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {loading && matches.length === 0 ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : matches.length === 0 ? (
        <CasiMatches propiedadId={propiedadId} lado="busqueda" vacio="Ninguna búsqueda coincide con esta propiedad por ahora." />
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} lado="busqueda" onChange={aplicarCambio} />
          ))}
        </div>
      )}
    </div>
  );
}
