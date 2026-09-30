-- =============================================================================
-- Migration: system_costs.mantenimiento
-- File:      20260930120000_system_costs_mantenimiento.sql
-- Purpose:   Nuevo costo fijo mensual del CRM: "Mantenimiento y optimizaciones".
--            Usado por la card "CRM · Costos fijos" en /gastos.
-- =============================================================================

ALTER TABLE public.system_costs
  ADD COLUMN IF NOT EXISTS mantenimiento numeric NOT NULL DEFAULT 0;
