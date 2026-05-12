-- =============================================================================
-- Migration: consolidate_frios_estado
-- File:      20260512020000_consolidate_frios_estado.sql
-- Purpose:   Canonicalize all 'frío' variants in leads.estado and
--            kanban_columns to the single canonical form 'frío'.
--
-- Variants observed in production:
--   leads.estado:             'frio' (401 rows), 'frío' (293 rows), 'Frio', etc.
--   kanban_columns.column_colors keys: 'Frio', 'frios', 'Fríos', etc.
--
-- Root cause: Three (later found to be four) divergent local copies of a
--   normalization helper all failed to map 'frio' (no accent) → 'frío'
--   (with accent), causing the Kanban board to render separate columns for
--   each variant.
--
-- Approach: DB migration + read-time canonicalEstado() shield in the frontend.
--   Both are needed: migration cleans historical data; the shield handles future
--   non-canonical writes from n8n (which is the authoritative lead qualifier
--   and writes 'frio' without accent).
--
-- Idempotency:
--   - UPDATE ... WHERE ... IN (...) clauses are no-ops when data is already
--     canonical.
--   - CREATE TABLE IF NOT EXISTS for backup tables: first run creates them
--     (with pre-migration data); subsequent runs on the SAME DAY are no-ops
--     (backup tables already exist and are NOT overwritten — this is safe
--     because the UPDATEs below are idempotent).
--   - NOTE: If you drop the backup tables and re-run, new snapshots are taken
--     of the already-canonical data. That is acceptable.
--
-- Rollback procedure (run manually AFTER reverting the application code):
--
--   BEGIN;
--   UPDATE public.leads l
--      SET estado = b.estado
--     FROM public.leads_estado_backup_20260512 b
--    WHERE l.id = b.id;
--   DELETE FROM public.kanban_columns;
--   INSERT INTO public.kanban_columns (id, custom_columns, visible_columns,
--                                      column_colors, created_at, updated_at)
--   SELECT id, custom_columns, visible_columns, column_colors,
--          created_at, updated_at
--     FROM public.kanban_columns_backup_20260512;
--   COMMIT;
--   -- Then git revert the code commit and redeploy.
--
-- Cleanup of backup tables (30 days after successful migration):
--   DROP TABLE public.leads_estado_backup_20260512;
--   DROP TABLE public.kanban_columns_backup_20260512;
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Snapshot leads.estado for all non-null rows (pre-migration state).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads_estado_backup_20260512 AS
SELECT id, estado, NOW() AS snapshot_at
FROM public.leads
WHERE estado IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Snapshot the entire kanban_columns table (typically one row).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kanban_columns_backup_20260512 AS
SELECT *, NOW() AS snapshot_at
FROM public.kanban_columns;

-- ---------------------------------------------------------------------------
-- 3. Canonicalize leads.estado.
--    Match every spelling that lowercases + accent-strips to 'frio' or 'frios'
--    using the portable translate() builtin (no unaccent extension needed).
--    Covered accent chars: á é í ó ú Á É Í Ó Ú ü Ü
-- ---------------------------------------------------------------------------
UPDATE public.leads
   SET estado = 'frío'
 WHERE estado IS NOT NULL
   AND lower(translate(estado, 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU')) IN ('frio', 'frios');

-- ---------------------------------------------------------------------------
-- 4. Canonicalize kanban_columns.custom_columns (text[]).
--    Replace any frío variant with 'frío', then deduplicate.
-- ---------------------------------------------------------------------------
UPDATE public.kanban_columns kc
   SET custom_columns = sub.cleaned
  FROM (
    SELECT id,
           ARRAY(
             SELECT DISTINCT
               CASE
                 WHEN lower(translate(c, 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU')) IN ('frio', 'frios') THEN 'frío'
                 ELSE c
               END
             FROM unnest(custom_columns) AS c
           ) AS cleaned
    FROM public.kanban_columns
  ) sub
 WHERE kc.id = sub.id
   AND kc.custom_columns IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Canonicalize kanban_columns.visible_columns (text[]). Same pattern.
-- ---------------------------------------------------------------------------
UPDATE public.kanban_columns kc
   SET visible_columns = sub.cleaned
  FROM (
    SELECT id,
           ARRAY(
             SELECT DISTINCT
               CASE
                 WHEN lower(translate(c, 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU')) IN ('frio', 'frios') THEN 'frío'
                 ELSE c
               END
             FROM unnest(visible_columns) AS c
           ) AS cleaned
    FROM public.kanban_columns
  ) sub
 WHERE kc.id = sub.id
   AND kc.visible_columns IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. Canonicalize kanban_columns.column_colors (jsonb).
--
--    Collision precedence (most-canonical wins):
--      'frío' > 'frio' > 'Frío' > 'Frio' > 'fríos' > 'Fríos' > 'frios' > 'Frios'
--    All keys that lower+unaccent to 'frio'/'frios' are stripped and replaced
--    by a single 'frío' key carrying the highest-precedence value.
-- ---------------------------------------------------------------------------
UPDATE public.kanban_columns kc
   SET column_colors = sub.cleaned
  FROM (
    SELECT id,
           CASE
             WHEN picked.color IS NOT NULL
               THEN (stripped.j || jsonb_build_object('frío', picked.color))
             ELSE stripped.j
           END AS cleaned
    FROM public.kanban_columns
    -- Strip every frío-variant key from column_colors
    CROSS JOIN LATERAL (
      SELECT COALESCE(
               jsonb_object_agg(k, v) FILTER (
                 WHERE lower(translate(k, 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU')) NOT IN ('frio', 'frios')
               ),
               '{}'::jsonb
             ) AS j
      FROM jsonb_each(COALESCE(column_colors, '{}'::jsonb)) AS e(k, v)
    ) stripped
    -- Pick the highest-precedence frío color
    CROSS JOIN LATERAL (
      SELECT COALESCE(
               column_colors->>'frío',
               column_colors->>'frio',
               column_colors->>'Frío',
               column_colors->>'Frio',
               column_colors->>'fríos',
               column_colors->>'Fríos',
               column_colors->>'frios',
               column_colors->>'Frios'
             ) AS color
    ) picked
  ) sub
 WHERE kc.id = sub.id;

-- ---------------------------------------------------------------------------
-- 7. Verification — must return ZERO rows. RAISE EXCEPTION on any residual.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  bad_leads int;
  bad_jsonb int;
  bad_arr   int;
BEGIN
  SELECT count(*) INTO bad_leads
  FROM public.leads
  WHERE estado IS NOT NULL
    AND lower(translate(estado, 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU')) IN ('frio', 'frios')
    AND estado <> 'frío';

  SELECT count(*) INTO bad_jsonb
  FROM public.kanban_columns kc,
       jsonb_each(COALESCE(kc.column_colors, '{}'::jsonb)) AS e(k, v)
  WHERE lower(translate(e.k, 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU')) IN ('frio', 'frios')
    AND e.k <> 'frío';

  SELECT count(*) INTO bad_arr
  FROM public.kanban_columns kc,
       unnest(
         COALESCE(kc.custom_columns, ARRAY[]::text[]) ||
         COALESCE(kc.visible_columns, ARRAY[]::text[])
       ) AS c
  WHERE lower(translate(c, 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU')) IN ('frio', 'frios')
    AND c <> 'frío';

  IF bad_leads + bad_jsonb + bad_arr > 0 THEN
    RAISE EXCEPTION
      'Migration verification failed: leads=%, jsonb_keys=%, arrays=%',
      bad_leads, bad_jsonb, bad_arr;
  END IF;
END $$;

COMMIT;
