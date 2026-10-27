-- ============================================================================
-- Fix: leads que reciben seguimientos pero NO AVANZAN en el ciclo
-- ============================================================================
--
-- SINTOMA REPORTADO: hay leads a los que se les manda seguimiento pero el
-- ciclo nunca progresa.
--
-- MECANISMO:
--   La escalera de seguimientos va del toque 0 al 5. El nodo que reprograma
--   marca `estado = 'completado'` cuando `seguimientos_count >= 5`.
--
--   Pero el viejo `UPDATE cola_seguimientos SET count = count + 1
--   WHERE remote_jid = ...` empujaba el contador de TODAS las filas del lead,
--   mientras que el nodo que marca 'completado' filtraba por `id`.
--   Las filas hermanas cruzaron el 5 sin que nadie las cerrara y quedaron
--   'pendiente' con counts 6, 10, 202 — fuera de la escalera.
--
--   El Switch del workflow tiene salidas para count 6, 7, 8 pero NO ESTAN
--   CONECTADAS. Y la query de seleccion igual las declaraba elegibles:
--     IN (0,1,2,3,4,5, 6,7,8, 300,400)
--   Resultado: la fila se elegia, arrancaba la ejecucion, caia en una salida
--   muerta y terminaba sin mandar mensaje, sin incrementar el contador y sin
--   reprogramar la fecha. La fila quedaba idéntica.
--
--   Peor: la query ordena `fecha_programada ASC LIMIT 1`, y la fila mas vieja
--   de la cola (id 4871, count 6, 2026-07-01) era una de estas. El cron la
--   elegia cada 3 minutos eternamente y nunca llegaba al resto de la cola.
--   Head-of-line block: la cola entera trabada por una fila muerta.
--
-- FIX EN EL WORKFLOW (ya sincronizado):
--   `SQL - Cancelar Seguimiento1` ahora solo declara elegibles los counts que
--   tienen rama real: IN (0,1,2,3,4,5,300,400).
--
-- FIX DE DATOS (esta migracion):
--   Cerrar las filas huerfanas. Ya recibieron sus 6 toques, el ciclo terminó.
--   Cerrarlas ademas libera el slot del indice unico parcial, para que el lead
--   pueda volver a entrar a la cola si retoma la conversacion.
-- ============================================================================

UPDATE cola_seguimientos
SET estado = 'completado',
    procesando_desde = NULL
WHERE estado IN ('pendiente', 'procesando')
  AND COALESCE(seguimientos_count, 0) > 5
  AND COALESCE(seguimientos_count, 0) NOT IN (300, 400);
-- Esperado: ~11 filas (6 con count 6, 2 con count 10, 1 con count 202,
--           2 con count 999 = telefono invalido).

-- ============================================================================
-- VERIFICACION
-- ============================================================================
-- -- debe devolver 0 filas: nada pendiente fuera de la escalera
-- SELECT COALESCE(seguimientos_count,0) AS count, count(*)
-- FROM cola_seguimientos
-- WHERE estado IN ('pendiente','procesando')
--   AND COALESCE(seguimientos_count,0) > 5
--   AND COALESCE(seguimientos_count,0) NOT IN (300,400)
-- GROUP BY 1;
