-- Agregar campo para almacenar colores de columnas
-- Este campo almacena un objeto JSON que mapea nombre_de_columna -> color_hex

ALTER TABLE public.kanban_columns
ADD COLUMN IF NOT EXISTS column_colors JSONB DEFAULT '{}'::JSONB;

-- Actualizar el registro existente con colores por defecto para las columnas estándar
UPDATE public.kanban_columns
SET column_colors = jsonb_build_object(
  'frío', '#3b82f6',      -- Azul
  'tibio', '#eab308',     -- Amarillo
  'caliente', '#ef4444',  -- Rojo
  'llamada', '#8b5cf6',   -- Púrpura
  'visita', '#10b981'     -- Verde
)
WHERE column_colors = '{}'::JSONB OR column_colors IS NULL;

COMMENT ON COLUMN public.kanban_columns.column_colors IS 'Mapeo de nombres de columnas a colores hexadecimales para personalización visual';

