-- =============================================================================
-- Migration: leads_resumen_conversacion
-- File:      20261027140000_leads_resumen_conversacion.sql
-- Purpose:   Resumen de la conversación de WhatsApp generado por LLM. Lo escribe
--            POST /api/leads/[id]/reanalizar en la misma llamada que re-extrae
--            los datos del lead, y se regenera solo si hay mensajes nuevos.
--
-- Rollback: ALTER TABLE public.leads DROP COLUMN IF EXISTS resumen_conversacion;
-- =============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS resumen_conversacion text;
