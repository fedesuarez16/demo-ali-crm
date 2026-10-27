-- ============================================================================
-- Fix: seguimientos duplicados (mismo mensaje enviado 3+ veces)
-- ============================================================================
--
-- CAUSA RAIZ (ver diagnóstico completo en el workflow "Team ali - seguimiento"):
--
--   1. El INSERT del workflow del agente deduplica POR DIA
--      (`fecha_programada::date = $4::date`), no POR LEAD. Cada día de
--      conversación crea otra fila `pendiente` para el mismo remote_jid.
--      Estado al momento de escribir esta migración:
--        2839 pendientes / 2428 leads → 411 filas sobrantes en 307 leads.
--
--   2. Como los UPDATE del workflow sincronizan `seguimientos_count` por
--      `remote_jid`, todas las filas hermanas quedan con el MISMO count,
--      caen en la MISMA rama del Switch y disparan el MISMO template.
--      El cron toma `LIMIT 1` por tick → el lead recibe N veces el mismo texto.
--
--   3. El índice `UNIQUE (remote_jid, fecha_programada)` no protege nada:
--      sólo colisiona si dos filas coinciden al microsegundo.
--
-- Esta migración limpia los datos y agrega el guard que faltaba.
-- Los cambios del workflow n8n van aparte (claim atómico + filtro de fecha).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Columna para el claim atómico + su reaper
--    El workflow marca `estado='procesando'` al tomar la fila. Si la ejecución
--    muere a mitad de camino, `procesando_desde` permite recuperarla.
-- ----------------------------------------------------------------------------
ALTER TABLE cola_seguimientos
  ADD COLUMN IF NOT EXISTS procesando_desde timestamptz;

COMMENT ON COLUMN cola_seguimientos.procesando_desde IS
  'Momento en que el workflow tomó la fila (estado=procesando). NULL si no está en vuelo. Usado por el reaper para liberar filas colgadas.';


-- ----------------------------------------------------------------------------
-- 2. Deduplicar: una sola fila `pendiente` por lead
--
--    Criterio de conservación (por remote_jid):
--      a) mayor `seguimientos_count`  → preserva el avance en la escalera,
--                                       el lead no vuelve a arrancar del toque 0
--      b) `fecha_programada` más tardía → no dispara una fecha rancia al aplicar
--      c) `id` más alto                → desempate determinista
--
--    Las demás pasan a `estado='duplicado'` (NO se borran: quedan auditables
--    y son reversibles con el UPDATE inverso si hiciera falta).
-- ----------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY remote_jid
      ORDER BY COALESCE(seguimientos_count, 0) DESC,
               fecha_programada DESC,
               id DESC
    ) AS rn
  FROM cola_seguimientos
  WHERE estado = 'pendiente'
)
UPDATE cola_seguimientos cs
SET estado = 'duplicado'
FROM ranked
WHERE cs.id = ranked.id
  AND ranked.rn > 1;
-- Esperado: ~411 filas afectadas.


-- ----------------------------------------------------------------------------
-- 3. Expirar el backlog rancio
--
--    Al corregir el filtro del workflow (`fecha_programada <= NOW()` en vez de
--    la ventana por día), los vencidos se vuelven elegibles de golpe.
--    Después del paso 2 quedan ~335 vencidos, de los cuales ~277 llevan más de
--    30 días esperando — el más viejo es de enero.
--
--    DECISION APLICADA: no se envía nada con más de 30 días de atraso.
--    Un "toque 2" de hace seis meses no es un seguimiento, es ruido.
--    Los ~58 vencidos recientes SI se envían: el cron los drena solo
--    (1 cada 3 min, ventana 15-20h) en ~3 horas, sin ráfaga.
--
--    ⬇️ Para cambiar el criterio, ajustá este intervalo (o comentá el bloque
--       entero si preferís que salga TODO el backlog).
-- ----------------------------------------------------------------------------
UPDATE cola_seguimientos
SET estado = 'expirado'
WHERE estado = 'pendiente'
  AND fecha_programada <= NOW() - INTERVAL '30 days';
-- Esperado: ~277 filas afectadas.


-- ----------------------------------------------------------------------------
-- 4. El guard que faltaba: una sola fila pendiente/procesando por lead
--
--    Esto es lo que impide que el bug vuelva. El índice cubre ambos estados
--    "en vuelo" para que el claim atómico (pendiente → procesando) no libere
--    el slot mientras el envío está en curso.
--
--    Nota: se verificó que hoy no hay filas pendientes con los counts
--    especiales (100-103, 300, 400), así que el índice no rompe esos flujos.
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uniq_cola_seguimientos_lead_en_vuelo
  ON cola_seguimientos (remote_jid)
  WHERE estado IN ('pendiente', 'procesando');

COMMENT ON INDEX uniq_cola_seguimientos_lead_en_vuelo IS
  'Un lead no puede tener más de un seguimiento en vuelo. Reemplaza al inútil UNIQUE(remote_jid, fecha_programada), que sólo colisionaba al microsegundo.';


-- ----------------------------------------------------------------------------
-- 5. Índice de apoyo para el claim atómico
--    El claim ordena por fecha_programada filtrando por estado; el índice
--    existente `idx_cola_estado (estado, fecha_programada)` ya sirve.
--    Se agrega uno parcial, mucho más chico, para el hot path.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cola_seguimientos_claim
  ON cola_seguimientos (fecha_programada)
  WHERE estado = 'pendiente';

COMMIT;


-- ============================================================================
-- VERIFICACION (correr después de aplicar)
-- ============================================================================
-- SELECT estado, count(*) FROM cola_seguimientos GROUP BY estado ORDER BY 2 DESC;
--
-- -- debe devolver 0 filas: ningún lead con más de un seguimiento en vuelo
-- SELECT remote_jid, count(*)
-- FROM cola_seguimientos
-- WHERE estado IN ('pendiente','procesando')
-- GROUP BY remote_jid HAVING count(*) > 1;
--
-- -- cuántos salen en el próximo ciclo del cron
-- SELECT count(*) FROM cola_seguimientos
-- WHERE estado='pendiente' AND fecha_programada <= NOW();

-- ============================================================================
-- ROLLBACK (si hiciera falta revertir la limpieza de datos)
-- ============================================================================
-- DROP INDEX IF EXISTS uniq_cola_seguimientos_lead_en_vuelo;
-- UPDATE cola_seguimientos SET estado='pendiente' WHERE estado IN ('duplicado','expirado');
