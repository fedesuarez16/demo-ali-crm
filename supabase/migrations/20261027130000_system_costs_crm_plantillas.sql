-- =============================================================================
-- Migration: system_costs.mantenimiento_crm + system_costs.plantillas
-- File:      20261027130000_system_costs_crm_plantillas.sql
-- Purpose:   Dos costos fijos mensuales nuevos en la card "CRM · Costos fijos"
--            de /gastos: "Mantenimiento CRM y Propsearch" y "Gastos plantillas".
-- =============================================================================

ALTER TABLE public.system_costs
  ADD COLUMN IF NOT EXISTS mantenimiento_crm numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plantillas        numeric NOT NULL DEFAULT 0;
