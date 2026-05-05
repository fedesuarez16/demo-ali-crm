-- Fix: kanban drag-drop to long custom columns (e.g. "trabaja con otro agente"
-- = 23 chars) failed because leads.estado was varchar(20). Postgres rejected
-- with SQLSTATE 22001 ("value too long for type character varying(20)"),
-- updateLeadStatus() in src/app/services/leadService.ts returned false, the
-- frontend skipped the optimistic state update, and the dragged card snapped
-- back to its original column.
--
-- kanban_columns.custom_columns already stores names of any length; the
-- mismatch was that the leads.estado column itself was the bottleneck.
ALTER TABLE public.leads ALTER COLUMN estado TYPE text;
