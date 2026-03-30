-- Campaña activa/inactiva en tabla pautas (ejecutar en Supabase SQL editor si la tabla ya existe)
ALTER TABLE public.pautas
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.pautas.activo IS 'true = campaña activa; false = inactiva';

CREATE INDEX IF NOT EXISTS idx_pautas_activo ON public.pautas(activo);
