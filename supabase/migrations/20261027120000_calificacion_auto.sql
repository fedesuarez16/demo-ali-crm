-- =============================================================================
-- Migration: calificacion_auto
-- File:      20261027120000_calificacion_auto.sql
-- Purpose:   Botón del sidebar del lead "Activar calificación automática".
--            1) leads.calificacion_auto: si es true, el calificador LLM de n8n
--               ("Team ali - calificador") lo recalifica en cada mensaje aunque
--               esté en una columna humana (llamada, visita, etc.).
--            2) lead_calificaciones.origen: 'mensaje' (lo disparó el agente) o
--               'manual' (lo pidió alguien desde el CRM).
--
-- Idempotencia: ADD COLUMN IF NOT EXISTS.
--
-- Rollback (manual):
--   ALTER TABLE public.leads DROP COLUMN IF EXISTS calificacion_auto;
--   ALTER TABLE public.lead_calificaciones DROP COLUMN IF EXISTS origen;
-- =============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS calificacion_auto boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.leads.calificacion_auto IS
  'true = el calificador LLM lo recalifica aunque esté en una columna humana. Se activa desde el sidebar del lead.';

ALTER TABLE public.lead_calificaciones
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'mensaje';
