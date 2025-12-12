-- Agregar columna estado_chat a la tabla leads
-- Este campo almacena el estado del chat (1 = activo, 0 = inactivo) independientemente del estado del lead

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS estado_chat INTEGER DEFAULT 0;

-- Agregar comentario a la columna para documentación
COMMENT ON COLUMN leads.estado_chat IS 'Estado del chat del lead: 1 = activo (agente activo), 0 = inactivo (agente desactivado). Independiente del campo estado del lead.';

-- Opcional: Crear un índice si necesitas buscar por estado_chat frecuentemente
-- CREATE INDEX IF NOT EXISTS idx_leads_estado_chat ON leads(estado_chat);

