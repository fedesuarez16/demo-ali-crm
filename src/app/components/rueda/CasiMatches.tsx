'use client';

import React, { useEffect, useState } from 'react';
import type { RuedaMatch } from '../../types';
import { listCercanos } from '../../services/ruedaService';
import { MatchCard } from './MatchCard';

type Props = ({ busquedaId: number | string } | { propiedadId: number | string }) & {
  /** Qué lado muestra cada card: 'propiedad' desde una búsqueda, 'busqueda' desde una propiedad. */
  lado: 'propiedad' | 'busqueda';
  /** Texto cuando no hay ni casi matches. */
  vacio?: string;
};

const noop = () => {};

/** Estado "0 matches": mensaje + "Ver las más cercanas (N)" colapsado (cálculo en vivo, sin LLM). */
export function CasiMatches(props: Props) {
  const { lado, vacio } = props;
  const clave = 'busquedaId' in props ? `b${props.busquedaId}` : `p${props.propiedadId}`;
  const [items, setItems] = useState<RuedaMatch[]>([]);
  const [umbral, setUmbral] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const filtro = 'busquedaId' in props ? { busquedaId: props.busquedaId } : { propiedadId: props.propiedadId };
    listCercanos(filtro)
      .then((r) => {
        if (!vivo) return;
        setItems(r.cercanos);
        setUmbral(r.umbral);
      })
      .catch((e) => vivo && setError(e?.message || 'No se pudieron calcular las más cercanas'));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">
        {umbral !== null ? `Sin coincidencias de ${umbral}% o más.` : (vacio ?? 'Sin coincidencias.')}
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {items.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-indigo-700 hover:underline">
            Ver las más cercanas ({items.length})
          </summary>
          <div className="space-y-2 mt-2">
            {items.map((m) => (
              <MatchCard key={m.id} match={m} lado={lado} onChange={noop} casi />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
