-- Búsquedas importadas: valor, zona, patio, piscina, habitaciones, baños (banos), mts2
-- Ejecutar en Supabase SQL Editor.
-- Si ya tenías la tabla vieja y querés reemplazarla, el DROP borra datos previos.

DROP TABLE IF EXISTS public.propiedad_busquedas CASCADE;

CREATE TABLE public.propiedad_busquedas (
  id SERIAL PRIMARY KEY,
  valor TEXT,
  zona TEXT,
  patio TEXT,
  piscina TEXT,
  habitaciones TEXT,
  banos TEXT,
  mts2 TEXT,
  archivo_origen TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON COLUMN public.propiedad_busquedas.banos IS 'Baños (CSV puede usar encabezado baños o banos)';
COMMENT ON COLUMN public.propiedad_busquedas.mts2 IS 'Metros cuadrados';

CREATE INDEX IF NOT EXISTS idx_propiedad_busquedas_zona ON public.propiedad_busquedas(zona);
CREATE INDEX IF NOT EXISTS idx_propiedad_busquedas_created ON public.propiedad_busquedas(created_at DESC);

ALTER TABLE public.propiedad_busquedas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on propiedad_busquedas" ON public.propiedad_busquedas;
CREATE POLICY "Allow all operations on propiedad_busquedas" ON public.propiedad_busquedas
  FOR ALL USING (true) WITH CHECK (true);
