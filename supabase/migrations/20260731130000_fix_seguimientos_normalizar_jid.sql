-- ============================================================================
-- Fix complementario: remote_jid convive en DOS formatos
-- ============================================================================
--
-- `cola_seguimientos.remote_jid` guarda tanto '+5492215065324' como
-- '5492215065324' para el MISMO lead: 1648 filas en vuelo con '+' y 503 sin él.
--
-- La migración 20260731120000 dedupló y creó el índice único comparando el
-- valor CRUDO, así que trató al mismo lead como dos leads distintos.
-- Resultado: 41 leads quedaron igual con dos filas en vuelo — o sea, seguían
-- expuestos a recibir el mismo seguimiento dos veces.
--
-- NO se reescriben los valores de `remote_jid`: otros sistemas (Evolution,
-- Chatwoot) leen el formato almacenado. Se normaliza en la COMPARACIÓN.
--
-- Nota: `leads.whatsapp_id` NO lleva '+' (2716 de 2725), por eso todos los
-- JOINs contra `leads` usan LTRIM(remote_jid, '+').
-- ============================================================================

BEGIN;

-- 1. Re-deduplicar usando el jid normalizado
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY LTRIM(remote_jid, '+')
      ORDER BY COALESCE(seguimientos_count, 0) DESC,
               fecha_programada DESC,
               id DESC
    ) AS rn
  FROM cola_seguimientos
  WHERE estado IN ('pendiente', 'procesando')
)
UPDATE cola_seguimientos cs
SET estado = 'duplicado'
FROM ranked
WHERE cs.id = ranked.id
  AND ranked.rn > 1;
-- Esperado: ~41 filas afectadas.

-- 2. Reemplazar el índice crudo por uno sobre la expresión normalizada
DROP INDEX IF EXISTS uniq_cola_seguimientos_lead_en_vuelo;

CREATE UNIQUE INDEX uniq_cola_seguimientos_lead_en_vuelo
  ON cola_seguimientos (LTRIM(remote_jid, '+'))
  WHERE estado IN ('pendiente', 'procesando');

COMMENT ON INDEX uniq_cola_seguimientos_lead_en_vuelo IS
  'Un lead no puede tener más de un seguimiento en vuelo. Normaliza el prefijo + porque remote_jid convive en ambos formatos.';

COMMIT;

-- ============================================================================
-- VERIFICACION
-- ============================================================================
-- -- debe devolver 0 filas
-- SELECT LTRIM(remote_jid,'+'), count(*)
-- FROM cola_seguimientos
-- WHERE estado IN ('pendiente','procesando')
-- GROUP BY 1 HAVING count(*) > 1;
