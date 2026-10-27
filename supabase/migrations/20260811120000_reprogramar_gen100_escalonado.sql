-- ============================================================================
-- Reprogramacion escalonada de la cohorte Gen100 estacionada en toque 3
-- ============================================================================
--
-- SINTOMA: leads frios sin seguimiento durante el periodo que correspondia.
--
-- CAUSA: las ramas que hacen `SET seguimientos_count = 3` (baja valor 300,
--   plantilla venta 400, Gen100) escriben el contador y el nodo siguiente lo
--   relee para elegir el intervalo. El 3 no significaba "proximo toque = 3":
--   significaba "usa la fila 3 de la tabla de intervalos", que decia 3 meses.
--   Resultado: 2049 filas pendientes con fecha_programada en oct/nov.
--
--   Corregido en el workflow: los tres nodos de reprogramacion de esas ramas
--   (`SQL - Reprogramar (baja valor)`, `SQL - Reprogramar (plantilla venta)`,
--   `SQL - Marcar como Procesando16`) ahora mapean count=3 -> 15 days.
--   Ese fix aplica de aca en adelante; no mueve las filas ya escritas.
--
-- IDENTIFICACION DE LA COHORTE:
--   cola_seguimientos no guarda de que rama vino una fila (plantilla NULL en
--   2048/2049, enviado_at y procesado_at NULL en las 3054, sin updated_at).
--   Se usan dos señales independientes que coinciden:
--
--     1. leads.toque_register = 'Gen100'  (tag manual, escrito solo desde el
--        front en LeadEditSidebar.tsx)
--     2. La huella del cron: Schedule Trigger (escalera principal) corre
--        */3, Schedule Trigger1 (Gen100) corre */1. Como
--        fecha_programada = NOW() + 3 months, el minuto de la fecha es el
--        minuto en que corrio la rama.
--
--   Cruce (filas pendientes con count=3):
--     tag        min%3=0  min%3=1  min%3=2
--     Gen100        654      615      616   <- uniforme  => cron */1
--     (null)        156        4        7   <- 93% en 0  => cron */3
--
--   Las ramas 300/400 corren sobre el mismo cron */3 que la escalera organica
--   y no son separables entre si. Volumen despreciable: 4 leads con tag
--   'Gen400', 0 con 'Gen300'.
--
-- ESTRATEGIA:
--   No se restaura la fecha "correcta" (rama + 15 dias) porque esas ramas
--   corrieron entre fines de junio y el 4 de julio: las 1885 filas quedarian
--   vencidas de golpe y el claim las drenaria de a 1 cada 3 minutos, tapando
--   la cola organica ~16 dias.
--
--   En su lugar se reparte desde hoy a LOTE_POR_DIA filas por dia, separadas
--   3 minutos entre si (el periodo del cron), arrancando a las 18:00 UTC.
--
--   Ventana real de envio: el cron es */3 15-20 en TZ de n8n (UTC-3) y
--   Postgres corre en UTC => 18:00-23:59 UTC. Techo: 20/hora * 6h = 120/dia.
--   Con 100/dia el lote ocupa 18:00-22:57 y deja ~20 slots diarios libres
--   para la cola organica, que ademas se intercala sola porque el claim
--   ordena por fecha_programada ASC.
--
--   Orden dentro de la cohorte: por fecha_programada original, o sea los que
--   hace mas tiempo que esperan salen primero.
--
-- REVERSIBLE: se respalda la fecha_programada previa antes de tocarla. Es el
--   unico registro de cuando corrio la rama (fecha - 3 meses).
-- ============================================================================

BEGIN;

-- 1. Respaldo de las fechas actuales
CREATE TABLE IF NOT EXISTS cola_seguimientos_backup_gen100_20260811 (
  id                 integer PRIMARY KEY,
  fecha_programada   timestamp without time zone NOT NULL,
  respaldado_at      timestamp with time zone NOT NULL DEFAULT now()
);

INSERT INTO cola_seguimientos_backup_gen100_20260811 (id, fecha_programada)
SELECT cs.id, cs.fecha_programada
FROM cola_seguimientos cs
JOIN leads l ON l.whatsapp_id = LTRIM(cs.remote_jid, '+')
WHERE l.toque_register = 'Gen100'
  AND cs.estado = 'pendiente'
  AND COALESCE(cs.seguimientos_count, 0) = 3
ON CONFLICT (id) DO NOTHING;
-- Esperado: 1885 filas.

-- 2. Reparto escalonado
WITH cfg AS (
  SELECT 100::int AS lote_por_dia   -- <<< perilla: filas por dia (techo 120)
),
objetivo AS (
  SELECT cs.id,
         (row_number() OVER (ORDER BY cs.fecha_programada, cs.id) - 1)::int AS rn
  FROM cola_seguimientos cs
  JOIN leads l ON l.whatsapp_id = LTRIM(cs.remote_jid, '+')
  WHERE l.toque_register = 'Gen100'
    AND cs.estado = 'pendiente'
    AND COALESCE(cs.seguimientos_count, 0) = 3
)
UPDATE cola_seguimientos cs
SET fecha_programada =
      date_trunc('day', now() AT TIME ZONE 'UTC')
      + (o.rn / c.lote_por_dia) * INTERVAL '1 day'
      + INTERVAL '18 hours'
      + (o.rn % c.lote_por_dia) * INTERVAL '3 minutes'
FROM objetivo o
CROSS JOIN cfg c
WHERE cs.id = o.id;
-- Esperado: 1885 filas repartidas en 19 dias (18 x 100 + 1 x 85).

COMMIT;

-- ============================================================================
-- VERIFICACION
-- ============================================================================
-- -- reparto por dia: ningun dia debe superar 120 ni salirse de 18:00-23:59
-- SELECT fecha_programada::date AS dia, count(*),
--        min(fecha_programada)::time AS primera,
--        max(fecha_programada)::time AS ultima
-- FROM cola_seguimientos cs
-- JOIN leads l ON l.whatsapp_id = LTRIM(cs.remote_jid, '+')
-- WHERE l.toque_register = 'Gen100'
--   AND cs.estado = 'pendiente'
--   AND COALESCE(cs.seguimientos_count, 0) = 3
-- GROUP BY 1 ORDER BY 1;
--
-- -- debe devolver 0: ninguna fila de la cohorte quedo vencida
-- SELECT count(*) FROM cola_seguimientos cs
-- JOIN leads l ON l.whatsapp_id = LTRIM(cs.remote_jid, '+')
-- WHERE l.toque_register = 'Gen100'
--   AND cs.estado = 'pendiente'
--   AND COALESCE(cs.seguimientos_count, 0) = 3
--   AND cs.fecha_programada <= now();

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- UPDATE cola_seguimientos cs
-- SET fecha_programada = b.fecha_programada
-- FROM cola_seguimientos_backup_gen100_20260811 b
-- WHERE cs.id = b.id;
