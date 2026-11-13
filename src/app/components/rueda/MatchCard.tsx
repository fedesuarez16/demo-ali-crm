'use client';

import React, { useState } from 'react';
import { Check, AlertTriangle, X, HelpCircle, ChevronDown, ExternalLink, Copy } from 'lucide-react';
import type { MatchEstado, RuedaMatch } from '../../types';
import { motivoIcono, matchEsNuevo, type MotivoIconoId } from '../../utils/ruedaUi';
import { patchMatch } from '../../services/ruedaService';
import { copyToClipboard, formatPropiedadFicha } from '../../propiedades/busquedas/busquedasFormat';
import { MatchScoreBadge } from './MatchScoreBadge';
import { MatchEstadoActions } from './MatchEstadoActions';

const ICONOS: Record<MotivoIconoId, { Icon: React.ComponentType<{ className?: string }>; clase: string }> = {
  check: { Icon: Check, clase: 'text-green-600' },
  alerta: { Icon: AlertTriangle, clase: 'text-amber-600' },
  x: { Icon: X, clase: 'text-red-600' },
  interrogacion: { Icon: HelpCircle, clase: 'text-gray-400' },
};

const ESTADO_CLASES: Record<MatchEstado, string> = {
  nuevo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  revisado: 'bg-gray-100 text-gray-600 border-gray-200',
  contactado: 'bg-blue-50 text-blue-700 border-blue-200',
  pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  interesado: 'bg-green-50 text-green-700 border-green-200',
  descartado: 'bg-red-50 text-red-700 border-red-200',
};

interface Props {
  match: RuedaMatch;
  /** 'propiedad': muestra la propiedad coincidente (vista de búsqueda). 'busqueda': muestra la búsqueda (vista inversa). */
  lado: 'propiedad' | 'busqueda';
  /** Se llama con el match actualizado tras cualquier PATCH exitoso. */
  onChange: (m: RuedaMatch) => void;
  /** "Casi match": bajo el umbral, no persistido. Estilo apagado, sin acciones de estado. */
  casi?: boolean;
}

export function MatchCard({ match, lado, onChange, casi = false }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const nuevo = !casi && matchEsNuevo(match);
  const p = match.propiedad;
  const b = match.busqueda;
  const titulo =
    lado === 'propiedad'
      ? [p?.tipo_de_propiedad, p?.direccion || p?.zona].filter(Boolean).join(' · ') || `Propiedad #${match.propiedad_id}`
      : [b?.agente_cliente, b?.tipo_de_propiedad, b?.zona].filter(Boolean).join(' · ') || `Búsqueda #${match.busqueda_id}`;
  const detalle =
    lado === 'propiedad'
      ? [p?.zona, p?.valor, p?.dormitorios && `${p.dormitorios} dorm.`, p?.mts_const && `${p.mts_const} m²`].filter(Boolean).join(' · ')
      : [b?.valor, b?.dormitorios && `${b.dormitorios} dorm.`, b?.mts_const && `${b.mts_const} m²`].filter(Boolean).join(' · ');
  const link = (p?.link ?? '').trim();

  const ejecutar = async (cambios: Parameters<typeof patchMatch>[1]) => {
    setGuardando(true);
    setError(null);
    try {
      onChange(await patchMatch(match.id, cambios));
    } catch (e: any) {
      setError(e?.message || 'No se pudo actualizar');
    } finally {
      setGuardando(false);
    }
  };

  const toggle = () => {
    const abrir = !abierto;
    setAbierto(abrir);
    // Abrir un match nuevo lo marca como revisado (sin pasar a "usuario").
    if (abrir && nuevo && !casi) void ejecutar({ via: 'apertura' });
  };

  const copiar = async () => {
    if (!p) return;
    if (await copyToClipboard(formatPropiedadFicha(p))) {
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1500);
    }
  };

  return (
    <div
      className={`rounded-lg border bg-white ${
        nuevo ? 'border-indigo-300 border-l-4 border-l-indigo-500 shadow-sm' : 'border-gray-200'
      } ${match.estado === 'descartado' || casi ? 'opacity-70' : ''} ${casi ? 'bg-gray-50 border-dashed' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button type="button" onClick={toggle} className="flex-1 min-w-0 flex items-center gap-2 text-left" aria-expanded={abierto}>
          <MatchScoreBadge score={match.score} />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-gray-900 truncate">{titulo}</span>
            {detalle && <span className="block text-xs text-gray-500 truncate">{detalle}</span>}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </button>
        {casi ? (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-300 bg-gray-100 text-gray-600">Casi match</span>
        ) : (
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${ESTADO_CLASES[match.estado]}`}>
            {nuevo ? 'Nuevo' : match.estado.charAt(0).toUpperCase() + match.estado.slice(1)}
          </span>
        )}
        {lado === 'propiedad' && p && (
          <div className="flex items-center gap-1">
            {link ? (
              <a href={link} target="_blank" rel="noopener noreferrer" className="p-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50" title="Abrir ficha (link)" aria-label="Abrir ficha">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="p-1 rounded border border-gray-200 text-gray-300" title="Sin link">
                <ExternalLink className="h-3.5 w-3.5" />
              </span>
            )}
            <button
              type="button"
              onClick={copiar}
              className={`p-1 rounded border ${copiado ? 'bg-green-50 text-green-700 border-green-300' : 'text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              title="Copiar ficha"
              aria-label="Copiar ficha"
            >
              {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>

      {abierto && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-2">
          <ul className="space-y-1">
            {match.motivos.map((mo, i) => {
              const { Icon, clase } = ICONOS[motivoIcono(mo.estado)];
              return (
                <li key={`${mo.criterio}-${i}`} className="flex items-start gap-2 text-xs text-gray-700">
                  <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${clase}`} />
                  <span>{mo.texto}</span>
                </li>
              );
            })}
            {match.motivos.length === 0 && <li className="text-xs text-gray-400">Sin detalle de motivos.</li>}
          </ul>
          {!casi && (
            <MatchEstadoActions
              estado={match.estado}
              disabled={guardando}
              onEstado={(estado) => void ejecutar({ estado })}
              onRestaurar={() => void ejecutar({ via: 'restaurar' })}
            />
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
