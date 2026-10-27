-- Etiquetas visibles de columnas del Kanban.
-- Mapea estado canónico (valor real en leads.estado) -> nombre que ve el usuario.
-- Renombrar una columna solo toca este mapa; leads.estado no cambia, así n8n,
-- seguimientos y el calificador siguen funcionando con la clave original.
ALTER TABLE public.kanban_columns
  ADD COLUMN IF NOT EXISTS column_labels jsonb NOT NULL DEFAULT '{}'::jsonb;
