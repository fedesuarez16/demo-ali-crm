-- Tabla para guardar las columnas personalizadas del Kanban
-- Esta tabla permite que las columnas persistan en todos los dispositivos

CREATE TABLE IF NOT EXISTS kanban_columns (
  id SERIAL PRIMARY KEY,
  custom_columns TEXT[] DEFAULT '{}'::TEXT[],
  visible_columns TEXT[] DEFAULT ARRAY['frío', 'tibio', 'caliente', 'llamada', 'visita']::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear un trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_kanban_columns_updated_at 
  BEFORE UPDATE ON kanban_columns 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insertar un registro inicial con valores por defecto
INSERT INTO kanban_columns (custom_columns, visible_columns)
VALUES (
  '{}'::TEXT[],
  ARRAY['frío', 'tibio', 'caliente', 'llamada', 'visita']::TEXT[]
)
ON CONFLICT DO NOTHING;

-- Habilitar RLS (Row Level Security) si es necesario
-- ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a todos (ajustar según tus necesidades)
-- CREATE POLICY "Allow read access to kanban_columns" ON kanban_columns
--   FOR SELECT USING (true);

-- Política para permitir escritura a todos (ajustar según tus necesidades)
-- CREATE POLICY "Allow write access to kanban_columns" ON kanban_columns
--   FOR ALL USING (true);

