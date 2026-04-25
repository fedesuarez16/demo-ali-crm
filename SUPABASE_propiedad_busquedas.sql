-- propiedad_busquedas: mismo esquema que public.propiedades + archivo_origen + created_at
-- Ejecutar en Supabase SQL Editor.
-- ATENCIÓN: el DROP elimina los datos previos (el esquema viejo era distinto e incompatible).

DROP TABLE IF EXISTS public.propiedad_busquedas CASCADE;

CREATE TABLE public.propiedad_busquedas (
  id SERIAL PRIMARY KEY,
  tipo_de_propiedad TEXT,
  direccion TEXT,
  zona TEXT,
  valor TEXT,
  dormitorios TEXT,
  banos TEXT,
  patio_parque TEXT,
  garage TEXT,
  mts_const TEXT,
  lote TEXT,
  piso TEXT,
  link TEXT,
  columna_1 TEXT,
  apto_banco TEXT,
  alternativa_menor_1 TEXT,
  alternativa_menor_2 TEXT,
  alternativa_menor_3 TEXT,
  alterniva_menor_4 TEXT,
  alternativa_menor_5 TEXT,
  alternativa_mayor TEXT,
  alternativa_mayor_2 TEXT,
  alternativa_mayor_3 TEXT,
  alternativa_mayor_4 TEXT,
  alternativa_mayor_5 TEXT,
  notas TEXT,
  archivo_origen TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON COLUMN public.propiedad_busquedas.alterniva_menor_4 IS 'Typo intencional para coincidir con public.propiedades.alterniva_menor_4';
COMMENT ON COLUMN public.propiedad_busquedas.archivo_origen IS 'Archivo CSV de origen (o "manual")';

CREATE INDEX IF NOT EXISTS idx_propiedad_busquedas_zona ON public.propiedad_busquedas(zona);
CREATE INDEX IF NOT EXISTS idx_propiedad_busquedas_direccion ON public.propiedad_busquedas(direccion);
CREATE INDEX IF NOT EXISTS idx_propiedad_busquedas_created ON public.propiedad_busquedas(created_at DESC);

ALTER TABLE public.propiedad_busquedas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on propiedad_busquedas" ON public.propiedad_busquedas;
CREATE POLICY "Allow all operations on propiedad_busquedas" ON public.propiedad_busquedas
  FOR ALL USING (true) WITH CHECK (true);
