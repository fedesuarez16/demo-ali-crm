'use client';

import { useCallback, useEffect, useState } from 'react';
import { getNuevosCount, RUEDA_EVENTO } from '../../services/ruedaService';

const POLL_MS = 60_000;

/** Cantidad de matches 'nuevo': al montar, cada 60 s y ante el evento RUEDA_EVENTO. Falla en silencio (conserva el último valor). */
export function useRuedaNuevosCount(): number {
  const [count, setCount] = useState(0);

  const refrescar = useCallback(async () => {
    try {
      setCount(await getNuevosCount());
    } catch {
      /* 401 (sin sesión) u offline: se mantiene el valor anterior */
    }
  }, []);

  useEffect(() => {
    void refrescar();
    const t = window.setInterval(() => void refrescar(), POLL_MS);
    const h = () => void refrescar();
    window.addEventListener(RUEDA_EVENTO, h);
    return () => {
      window.clearInterval(t);
      window.removeEventListener(RUEDA_EVENTO, h);
    };
  }, [refrescar]);

  return count;
}
