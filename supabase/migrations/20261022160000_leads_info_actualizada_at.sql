-- =============================================================================
-- Migration: leads_info_actualizada_at
-- File:      20261022160000_leads_info_actualizada_at.sql
-- Purpose:   Marca de cuándo POST /api/leads/[id]/reanalizar re-extrajo con LLM
--            los datos del lead (intencion, presupuesto, zona, tipo_propiedad,
--            forma_pago, caracteristicas_*) leyendo la conversación de Chatwoot.
--            Si no hay mensajes nuevos desde esta fecha, el endpoint no vuelve
--            a llamar al LLM.
--
-- Rollback: ALTER TABLE public.leads DROP COLUMN IF EXISTS info_actualizada_at;
-- =============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS info_actualizada_at timestamptz;
