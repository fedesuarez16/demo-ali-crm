-- =====================================================
-- SCRIPT COMPLETO DE CONFIGURACIÓN DE SUPABASE
-- CRM Inmobiliario - Todas las tablas en un solo archivo
-- =====================================================
-- 
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard → SQL Editor
-- 2. Copia y pega TODO este archivo
-- 3. Ejecuta el script (botón "Run" o Ctrl/Cmd + Enter)
-- 4. Verifica que todas las tablas se crearon correctamente
--
-- =====================================================

-- =====================================================
-- 1. TABLA: leads
-- =====================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id SERIAL PRIMARY KEY,
  whatsapp_id TEXT UNIQUE NOT NULL,
  nombre TEXT,
  estado TEXT DEFAULT 'frío',
  presupuesto NUMERIC,
  zona TEXT,
  tipo_propiedad TEXT,
  forma_pago TEXT,
  intencion TEXT,
  caracteristicas_buscadas TEXT,
  caracteristicas_venta TEXT,
  propiedades_mostradas TEXT,
  propiedad_interes TEXT,
  seguimientos_count INTEGER DEFAULT 0 NOT NULL,
  notas TEXT,
  estado_chat INTEGER DEFAULT 0,
  chatwoot_conversation_id INTEGER,
  ultima_interaccion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para leads
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_id ON public.leads(whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_leads_estado ON public.leads(estado);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_seguimientos_count ON public.leads(seguimientos_count);
CREATE INDEX IF NOT EXISTS idx_leads_chatwoot_conversation_id ON public.leads(chatwoot_conversation_id);

COMMENT ON TABLE public.leads IS 'Tabla principal de leads/contactos del CRM';
COMMENT ON COLUMN public.leads.estado IS 'Estado del lead: frío, tibio, caliente, llamada, visita u otros personalizados';
COMMENT ON COLUMN public.leads.estado_chat IS 'Estado del chat: 1 = activo, 0 = inactivo (independiente del estado del lead)';
COMMENT ON COLUMN public.leads.chatwoot_conversation_id IS 'ID de la conversación en Chatwoot para calificación automática';

-- =====================================================
-- 2. TABLA: propiedades
-- =====================================================
CREATE TABLE IF NOT EXISTS public.propiedades (
  id SERIAL PRIMARY KEY,
  tipo_de_propiedad TEXT,
  direccion TEXT,
  zona TEXT,
  valor TEXT,
  dormitorios TEXT,
  banos TEXT,
  patio_parque TEXT,
  garage TEXT,
  mts_const TEXT,
  lote TEXT,
  piso TEXT,
  link TEXT,
  columna_1 TEXT,
  apto_banco TEXT,
  alternativa_menor_1 TEXT,
  alternativa_menor_2 TEXT,
  alternativa_menor_3 TEXT,
  alternativa_menor_4 TEXT,
  alternativa_menor_5 TEXT,
  alternativa_mayor TEXT,
  alternativa_mayor_2 TEXT,
  alternativa_mayor_3 TEXT,
  alternativa_mayor_4 TEXT,
  alternativa_mayor_5 TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para propiedades
CREATE INDEX IF NOT EXISTS idx_propiedades_zona ON public.propiedades(zona);
CREATE INDEX IF NOT EXISTS idx_propiedades_tipo ON public.propiedades(tipo_de_propiedad);

-- =====================================================
-- 3. TABLA: kanban_columns
-- =====================================================
CREATE TABLE IF NOT EXISTS public.kanban_columns (
  id SERIAL PRIMARY KEY,
  custom_columns TEXT[] DEFAULT '{}'::TEXT[],
  visible_columns TEXT[] DEFAULT ARRAY['frío', 'tibio', 'caliente', 'llamada', 'visita']::TEXT[],
  column_colors JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_kanban_columns_updated_at 
  BEFORE UPDATE ON public.kanban_columns 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insertar registro inicial
INSERT INTO public.kanban_columns (custom_columns, visible_columns, column_colors)
VALUES (
  '{}'::TEXT[],
  ARRAY['frío', 'tibio', 'caliente', 'llamada', 'visita']::TEXT[],
  jsonb_build_object(
    'frío', '#3b82f6',
    'tibio', '#eab308',
    'caliente', '#ef4444',
    'llamada', '#8b5cf6',
    'visita', '#10b981'
  )
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. TABLA: agent_status
-- =====================================================
CREATE TABLE IF NOT EXISTS public.agent_status (
  id INTEGER NOT NULL PRIMARY KEY,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar registro inicial
INSERT INTO public.agent_status (id, is_active) 
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. TABLA: pautas
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pautas (
  id SERIAL PRIMARY KEY,
  texto TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para pautas
CREATE INDEX IF NOT EXISTS idx_pautas_created_at ON public.pautas(created_at DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_pautas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pautas_updated_at
  BEFORE UPDATE ON public.pautas
  FOR EACH ROW
  EXECUTE FUNCTION update_pautas_updated_at();

-- =====================================================
-- 6. TABLA: cola_seguimientos
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cola_seguimientos (
  id SERIAL PRIMARY KEY,
  remote_jid TEXT NOT NULL,
  session_id TEXT,
  mensaje TEXT NOT NULL,
  fecha_programada TIMESTAMP WITH TIME ZONE NOT NULL,
  estado TEXT DEFAULT 'pendiente',
  tipo_lead TEXT,
  seguimientos_count INTEGER DEFAULT 0,
  chatwoot_conversation_id INTEGER,
  plantilla VARCHAR(50),
  fecha_ultima_interaccion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para cola_seguimientos
CREATE INDEX IF NOT EXISTS idx_cola_seguimientos_estado ON public.cola_seguimientos(estado);
CREATE INDEX IF NOT EXISTS idx_cola_seguimientos_fecha ON public.cola_seguimientos(fecha_programada);

-- =====================================================
-- 7. TABLA: cola_seguimientos_dos
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cola_seguimientos_dos (
  id SERIAL PRIMARY KEY,
  remote_jid TEXT NOT NULL,
  session_id TEXT,
  mensaje TEXT NOT NULL,
  fecha_programada TIMESTAMP WITH TIME ZONE NOT NULL,
  estado TEXT DEFAULT 'pendiente',
  tipo_lead TEXT,
  seguimientos_count INTEGER DEFAULT 0,
  chatwoot_conversation_id INTEGER,
  plantilla VARCHAR(50),
  fecha_ultima_interaccion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para cola_seguimientos_dos
CREATE INDEX IF NOT EXISTS idx_cola_seguimientos_dos_estado ON public.cola_seguimientos_dos(estado);
CREATE INDEX IF NOT EXISTS idx_cola_seguimientos_dos_fecha ON public.cola_seguimientos_dos(fecha_programada);

-- =====================================================
-- 8. CONFIGURAR ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on leads" ON public.leads;
CREATE POLICY "Allow all operations on leads" ON public.leads
  FOR ALL USING (true) WITH CHECK (true);

-- Propiedades
ALTER TABLE public.propiedades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on propiedades" ON public.propiedades;
CREATE POLICY "Allow all operations on propiedades" ON public.propiedades
  FOR ALL USING (true) WITH CHECK (true);

-- Kanban columns
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on kanban_columns" ON public.kanban_columns;
CREATE POLICY "Allow all operations on kanban_columns" ON public.kanban_columns
  FOR ALL USING (true) WITH CHECK (true);

-- Agent status
ALTER TABLE public.agent_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on agent_status" ON public.agent_status;
CREATE POLICY "Allow all operations on agent_status" ON public.agent_status
  FOR ALL USING (true) WITH CHECK (true);

-- Pautas
ALTER TABLE public.pautas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on pautas" ON public.pautas;
CREATE POLICY "Allow all operations on pautas" ON public.pautas
  FOR ALL USING (true) WITH CHECK (true);

-- Cola seguimientos
ALTER TABLE public.cola_seguimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on cola_seguimientos" ON public.cola_seguimientos;
CREATE POLICY "Allow all operations on cola_seguimientos" ON public.cola_seguimientos
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.cola_seguimientos_dos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on cola_seguimientos_dos" ON public.cola_seguimientos_dos;
CREATE POLICY "Allow all operations on cola_seguimientos_dos" ON public.cola_seguimientos_dos
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- 
-- Verificación: Ejecuta esto para verificar que todo se creó correctamente
-- 
-- SELECT 
--   'leads' as tabla, COUNT(*) as registros FROM public.leads
-- UNION ALL
-- SELECT 'propiedades', COUNT(*) FROM public.propiedades
-- UNION ALL
-- SELECT 'kanban_columns', COUNT(*) FROM public.kanban_columns
-- UNION ALL
-- SELECT 'agent_status', COUNT(*) FROM public.agent_status
-- UNION ALL
-- SELECT 'pautas', COUNT(*) FROM public.pautas
-- UNION ALL
-- SELECT 'cola_seguimientos', COUNT(*) FROM public.cola_seguimientos
-- UNION ALL
-- SELECT 'cola_seguimientos_dos', COUNT(*) FROM public.cola_seguimientos_dos
--
--
-- =====================================================
