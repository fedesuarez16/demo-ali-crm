'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RuedaMatch } from '../../../types';
import { listMatches, backfillRueda, RUEDA_EVENTO, type FiltrosMatches, type ProgresoBackfill } from '../../../services/ruedaService';
import { agruparPorBusqueda, ordenarMatches } from '../../../utils/ruedaUi';

/**
 * Matches persistidos (GET /api/rueda/matches). Recarga al montar, al cambiar filtros y ante RUEDA_EVENTO.
 * `enabled=false` evita el fetch (p. ej. pestaña inactiva).
 */
export function useRuedaMatches(filtros: FiltrosMatches = {}, enabled = true) {
  const [matches, setMatches] = useState<RuedaMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clave = JSON.stringify(filtros);
  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setMatches(await listMatches(filtrosRef.current));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar los matches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, clave, reload]);

  useEffect(() => {
    if (!enabled) return;
    const h = () => void reload();
    window.addEventListener(RUEDA_EVENTO, h);
    return () => window.removeEventListener(RUEDA_EVENTO, h);
  }, [enabled, reload]);

  /** Aplica localmente el match devuelto por PATCH (quita los descartados si no se muestran). */
  const aplicarCambio = useCallback(
    (m: RuedaMatch) => {
      setMatches((prev) => {
        const siguiente = prev.map((x) => (x.id === m.id ? { ...x, ...m, propiedad: x.propiedad ?? m.propiedad, busqueda: x.busqueda ?? m.busqueda } : x));
        const f = filtrosRef.current;
        return siguiente.filter((x) => {
          if (f.estado && x.estado !== f.estado) return false;
          if (!f.estado && !f.incluirDescartados && x.estado === 'descartado') return false;
          return true;
        });
      });
    },
    [],
  );

  const ordenados = useMemo(() => ordenarMatches(matches), [matches]);
  const porBusqueda = useMemo(() => agruparPorBusqueda(ordenados), [ordenados]);

  return { matches: ordenados, porBusqueda, loading, error, reload, aplicarCambio };
}

/** Botón "Recalcular todo": backfillRueda con progreso y resumen final. */
export function useBackfillRueda() {
  const [corriendo, setCorriendo] = useState(false);
  const [progreso, setProgreso] = useState<ProgresoBackfill | null>(null);
  const [resumen, setResumen] = useState<ProgresoBackfill | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = async () => {
    setCorriendo(true);
    setError(null);
    setResumen(null);
    setProgreso(null);
    try {
      setResumen(await backfillRueda(setProgreso));
    } catch (e: any) {
      setError(e?.message || 'Error al recalcular');
    } finally {
      setCorriendo(false);
    }
  };

  return { corriendo, progreso, resumen, error, ejecutar, cerrar: () => { setResumen(null); setError(null); } };
}
