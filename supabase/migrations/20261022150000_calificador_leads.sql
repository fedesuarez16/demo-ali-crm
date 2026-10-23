-- =============================================================================
-- Migration: calificador_leads
-- File:      20261022150000_calificador_leads.sql
-- Purpose:   1) Re-unificar 'frio' → 'frío' en leads.estado y BLINDARLO con un
--               trigger para que no vuelva a crecer.
--            2) Crear la tabla de auditoría del calificador LLM de n8n
--               (workflow "Team ali - calificador").
--
-- Contexto:
--   20260512020000_consolidate_frios_estado.sql ya había unificado los datos,
--   pero los writers de n8n siguieron escribiendo 'frio' sin tilde
--   ("Team ali - agente" → capturar informacion, "Team ali - seguimiento" →
--   UPDATE leads SET estado = 'frio'). Al 2026-10-22 había 1848 'frío' y 495
--   'frio'. Sin una barrera en la base, cualquier writer nuevo vuelve a romperlo.
--
-- Idempotencia: UPDATE con WHERE, CREATE ... IF NOT EXISTS, CREATE OR REPLACE,
--   DROP TRIGGER IF EXISTS.
--
-- Rollback (manual):
--   BEGIN;
--   DROP TRIGGER IF EXISTS trg_normalizar_estado_lead ON public.leads;
--   DROP FUNCTION IF EXISTS public.normalizar_estado_lead();
--   ALTER TABLE public.leads ALTER COLUMN estado SET DEFAULT 'inicial';
--   UPDATE public.leads l SET estado = b.estado
--     FROM public.leads_estado_backup_20261022 b WHERE l.id = b.id;
--   DROP TABLE IF EXISTS public.lead_calificaciones;
--   COMMIT;
--
-- Cleanup (30 días después): DROP TABLE public.leads_estado_backup_20261022;
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Backup de las filas que se van a tocar.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads_estado_backup_20261022 AS
SELECT id, estado, NOW() AS snapshot_at
FROM public.leads
WHERE estado IS NOT NULL
  AND lower(translate(estado, 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU')) IN ('frio', 'frios')
  AND estado <> 'frío';

-- ---------------------------------------------------------------------------
-- 2. Trigger: toda variante de frío que entre se guarda como 'frío'.
--    Va ANTES del UPDATE de datos para que el backfill también pase por acá.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalizar_estado_lead()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado IS NOT NULL
     AND lower(translate(NEW.estado, 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU')) IN ('frio', 'frios') THEN
    NEW.estado := 'frío';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalizar_estado_lead ON public.leads;
CREATE TRIGGER trg_normalizar_estado_lead
BEFORE INSERT OR UPDATE OF estado ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.normalizar_estado_lead();

-- ---------------------------------------------------------------------------
-- 3. Backfill.
-- ---------------------------------------------------------------------------
UPDATE public.leads
   SET estado = 'frío'
 WHERE estado IS NOT NULL
   AND lower(translate(estado, 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU')) IN ('frio', 'frios')
   AND estado <> 'frío';

-- ---------------------------------------------------------------------------
-- 4. Default: 'inicial' no es una columna real del Kanban (el frontend ya lo
--    corregía a 'frío' al cargar). Un lead nuevo nace en 'frío'.
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads ALTER COLUMN estado SET DEFAULT 'frío';

-- ---------------------------------------------------------------------------
-- 5. Auditoría del calificador LLM. Se escribe una fila por cada evaluación,
--    se aplique o no (modo sombra, confianza baja, columna humana, etc.).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_calificaciones (
  id                 bigserial PRIMARY KEY,
  whatsapp_id        text        NOT NULL,
  conversation_id    text,
  estado_anterior    text,
  estado_sugerido    text,
  confianza          numeric(3,2),
  motivo             text,
  aplicado           boolean     NOT NULL DEFAULT false,
  razon_no_aplicado  text,
  modo_sombra        boolean     NOT NULL DEFAULT true,
  modelo             text,
  mensajes           jsonb,
  created_at         timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_calificaciones_whatsapp_id_idx
  ON public.lead_calificaciones (whatsapp_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_calificaciones_created_at_idx
  ON public.lead_calificaciones (created_at DESC);

ALTER TABLE public.lead_calificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lead_calificaciones_all" ON public.lead_calificaciones;
CREATE POLICY "lead_calificaciones_all" ON public.lead_calificaciones
  FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 6. Verificación.
-- ---------------------------------------------------------------------------
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM public.leads
   WHERE estado IS NOT NULL
     AND lower(translate(estado, 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU')) IN ('frio', 'frios')
     AND estado <> 'frío';
  IF bad > 0 THEN
    RAISE EXCEPTION 'Quedaron % leads con variantes de frío', bad;
  END IF;
END $$;

COMMIT;
