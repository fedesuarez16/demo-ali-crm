/**
 * Nombres de todas las campañas (tabla `pautas`), activas y desactivadas.
 * Es la misma fuente que muestra /campanas-activas, así los filtros de /leads coinciden.
 */
export const getNombresCampanas = async (): Promise<string[]> => {
  try {
    const response = await fetch('/api/pautas');
    if (!response.ok) return [];
    const pautas: Array<{ texto?: string; activo?: boolean | null }> = await response.json();

    const vistos = new Set<string>();
    const nombres: string[] = [];
    for (const pauta of pautas) {
      const texto = (pauta.texto || '').trim();
      const clave = texto.toLowerCase();
      if (!texto || vistos.has(clave)) continue;
      vistos.add(clave);
      nombres.push(texto);
    }
    return nombres.sort((a, b) => a.localeCompare(b, 'es'));
  } catch (error) {
    console.error('Error obteniendo campañas activas:', error);
    return [];
  }
};
