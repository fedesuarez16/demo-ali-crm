-- =============================================================================
-- Migration: system_costs
-- File:      20260519000000_system_costs.sql
-- Purpose:   Single-row configuration table that stores monthly system
--            maintenance costs (Hosting, OpenAI, Claude). Used by the
--            "Gasto mensual" card on /dashboard.
--
-- Single-row pattern: PK fixed to 1 via CHECK constraint. Avoids upsert
-- ambiguity — the row is INSERTed once at migration time and only UPDATEd
-- afterwards.
--
-- RLS: open policy following the project convention (single-tenant internal
-- CRM using the anon key — see CLAUDE.md §RLS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.system_costs (
  id          int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hosting     numeric NOT NULL DEFAULT 0,
  openai      numeric NOT NULL DEFAULT 0,
  claude      numeric NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_costs_all ON public.system_costs;
CREATE POLICY system_costs_all
  ON public.system_costs
  FOR ALL
  USING (true)
  WITH CHECK (true);

INSERT INTO public.system_costs (id, hosting, openai, claude)
VALUES (1, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;
