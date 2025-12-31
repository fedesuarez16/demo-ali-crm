-- Agregar columna plantilla a las tablas cola_seguimientos y cola_seguimientos_dos
-- Este campo almacena el nombre de la plantilla seleccionada para el mensaje programado
-- Valores posibles: 'toque_1_frio', 'toque_2_frio', 'toque_1_tibio', 'toque_2_tibio', 'toque_3_tibio', o NULL

-- Agregar columna a cola_seguimientos
ALTER TABLE cola_seguimientos 
ADD COLUMN IF NOT EXISTS plantilla VARCHAR(50);

-- Agregar columna a cola_seguimientos_dos
ALTER TABLE cola_seguimientos_dos 
ADD COLUMN IF NOT EXISTS plantilla VARCHAR(50);

-- Comentarios para documentación
COMMENT ON COLUMN cola_seguimientos.plantilla IS 'Nombre de la plantilla seleccionada: toque_1_frio, toque_2_frio, toque_1_tibio, toque_2_tibio, toque_3_tibio. NULL si no hay plantilla asignada.';
COMMENT ON COLUMN cola_seguimientos_dos.plantilla IS 'Nombre de la plantilla seleccionada: toque_1_frio, toque_2_frio, toque_1_tibio, toque_2_tibio, toque_3_tibio. NULL si no hay plantilla asignada.';

