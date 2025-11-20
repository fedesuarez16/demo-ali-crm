-- Crear tabla pautas para almacenar las pautas de campañas activas
CREATE TABLE IF NOT EXISTS pautas (
  id SERIAL PRIMARY KEY,
  texto TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_pautas_created_at ON pautas(created_at DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_pautas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pautas_updated_at
  BEFORE UPDATE ON pautas
  FOR EACH ROW
  EXECUTE FUNCTION update_pautas_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE pautas IS 'Tabla para almacenar las pautas de campañas activas';
COMMENT ON COLUMN pautas.id IS 'Identificador único de la pauta';
COMMENT ON COLUMN pautas.texto IS 'Texto de la pauta';
COMMENT ON COLUMN pautas.created_at IS 'Fecha y hora de creación';
COMMENT ON COLUMN pautas.updated_at IS 'Fecha y hora de última actualización';

