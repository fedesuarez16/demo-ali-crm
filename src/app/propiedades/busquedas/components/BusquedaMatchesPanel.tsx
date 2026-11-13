'use client';

import React from 'react';
import { Copy } from 'lucide-react';
import type { RuedaMatch } from '../../../types';
import { MatchCard } from '../../../components/rueda/MatchCard';
import { CasiMatches } from '../../../components/rueda/CasiMatches';
import { formatPropiedadFicha } from '../busquedasFormat';

interface Props {
  busquedaId: string;
  matches: RuedaMatch[];
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
  onChange: (m: RuedaMatch) => void;
}

/** Contenido de la fila expandida: matches persistidos de una búsqueda (top 10 por score). */
export function BusquedaMatchesPanel({ busquedaId, matches, copiedKey, onCopy, onChange }: Props) {
  if (matches.length === 0) return <CasiMatches busquedaId={busquedaId} lado="propiedad" />;
  const top = matches.slice(0, 10);
  const copyAllKey = `all-${busquedaId}`;
  const copyAllText = top.filter((m) => m.propiedad).map((m) => formatPropiedadFicha(m.propiedad!)).join('\n\n---\n\n');
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <div className="text-xs text-gray-600">
          Top {top.length} de {matches.length} coincidencia{matches.length === 1 ? '' : 's'}:
        </div>
        <button
          type="button"
          onClick={() => onCopy(copyAllKey, copyAllText)}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-md text-xs font-medium border border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
          title="Copiar todas las fichas coincidentes"
        >
          <Copy className="h-3.5 w-3.5" />
          {copiedKey === copyAllKey ? '¡Copiado!' : `Copiar todas (${top.length})`}
        </button>
      </div>
      <div className="space-y-2">
        {top.map((m) => (
          <MatchCard key={m.id} match={m} lado="propiedad" onChange={onChange} />
        ))}
      </div>
    </div>
  );
}
