-- Rueda de match v2: configuración, normalizados cacheados y matches persistidos búsqueda <-> propiedad.
--
-- IMPORTANTE: el normalizado (jsonb producido por LLM/parser) NO vive como columna en `propiedades`
-- ni en `propiedad_busquedas`. Cualquier DML/DDL con trigger sobre `public.propiedades` dispara el
-- vectorizador de n8n, que borra y re-embebe todos los documentos del RAG del agente de WhatsApp.
-- Por eso esta migración NO hace ALTER TABLE ni crea triggers sobre las tablas de origen: el cache
-- se guarda en `rueda_normalizados` (clave lógica tabla + fila_id) y los huérfanos los limpia el
-- código de aplicación (recalcular). Las FK de `rueda_matches` solo actúan sobre `rueda_matches`.
-- Idempotente: aplicar dos veces es un no-op.

-- 1) Configuración global (fila única id = 1)
CREATE TABLE IF NOT EXISTS public.rueda_config (
  id         smallint PRIMARY KEY CHECK (id = 1),
  params     jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rueda_config IS 'Parámetros de la rueda de match (pesos, tolerancias, umbral). Fila única id=1; si falta o es inválida, la app usa DEFAULT_RUEDA_CONFIG.';

INSERT INTO public.rueda_config (id, params) VALUES (
  1,
  '{
    "pesos": {
      "precio": 25, "zona": 25, "tipo": 10, "dormitorios": 10,
      "m2": 10, "caracteristicas": 10, "forma_pago": 5, "necesidades": 5
    },
    "precio_tolerancia": 0.1,
    "precio_fuera_tolerancia_elimina": true,
    "tipo_eliminatorio": true,
    "zona_cercana_credito": 0.6,
    "zona_mismatch_multiplicador": 0.7,
    "umbral": 50,
    "peso_minimo_evaluado": 35,
    "moneda_default": "USD",
    "ars_por_usd": null
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 2) Cache de normalizados (sin FK: apunta a dos tablas; huérfanos se limpian desde la app)
CREATE TABLE IF NOT EXISTS public.rueda_normalizados (
  tabla           text NOT NULL CHECK (tabla IN ('propiedad', 'busqueda')),
  fila_id         integer NOT NULL,
  normalizado     jsonb NOT NULL,
  normalizado_hash text NOT NULL,
  normalizado_at  timestamptz NOT NULL DEFAULT now(),
  fuente          text NOT NULL CHECK (fuente IN ('llm', 'parser')),
  PRIMARY KEY (tabla, fila_id)
);

COMMENT ON TABLE public.rueda_normalizados IS 'Cache del normalizado por fila. Obsoleto si el hash difiere o fuente = parser. Sin FK ni triggers sobre propiedades (ver cabecera).';

-- 3) Matches persistidos
CREATE TABLE IF NOT EXISTS public.rueda_matches (
  id                 bigserial PRIMARY KEY,
  busqueda_id        integer NOT NULL REFERENCES public.propiedad_busquedas(id) ON DELETE CASCADE,
  propiedad_id       integer NOT NULL REFERENCES public.propiedades(id) ON DELETE CASCADE,
  score              smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  motivos            jsonb NOT NULL DEFAULT '[]'::jsonb,
  estado             text NOT NULL DEFAULT 'nuevo'
                     CHECK (estado IN ('nuevo', 'revisado', 'contactado', 'pendiente', 'interesado', 'descartado')),
  estado_origen      text NOT NULL DEFAULT 'sistema' CHECK (estado_origen IN ('sistema', 'usuario')),
  bajo_umbral        boolean NOT NULL DEFAULT false,
  notas              text,
  first_seen_at      timestamptz NOT NULL DEFAULT now(),
  estado_updated_at  timestamptz NOT NULL DEFAULT now(),
  score_updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (busqueda_id, propiedad_id)
);

COMMENT ON COLUMN public.rueda_matches.estado_origen IS 'sistema = estado puesto por la rueda (se puede borrar si baja del umbral); usuario = tocado a mano (se oculta con bajo_umbral, nunca se borra).';
COMMENT ON COLUMN public.rueda_matches.bajo_umbral IS 'true = el par dejó de cumplir el umbral pero el usuario ya había intervenido; oculto en listados.';

CREATE INDEX IF NOT EXISTS rueda_matches_busqueda_estado_idx  ON public.rueda_matches (busqueda_id, estado);
CREATE INDEX IF NOT EXISTS rueda_matches_propiedad_estado_idx ON public.rueda_matches (propiedad_id, estado);
CREATE INDEX IF NOT EXISTS rueda_matches_estado_score_idx     ON public.rueda_matches (estado, score DESC);
CREATE INDEX IF NOT EXISTS rueda_matches_nuevos_idx
  ON public.rueda_matches (score DESC, first_seen_at DESC)
  WHERE estado = 'nuevo' AND NOT bajo_umbral;

-- 4) RLS abierta (CRM interno single-tenant, misma convención que el resto de las migraciones)
ALTER TABLE public.rueda_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rueda_normalizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rueda_matches      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rueda_config_all" ON public.rueda_config;
CREATE POLICY "rueda_config_all" ON public.rueda_config FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rueda_normalizados_all" ON public.rueda_normalizados;
CREATE POLICY "rueda_normalizados_all" ON public.rueda_normalizados FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rueda_matches_all" ON public.rueda_matches;
CREATE POLICY "rueda_matches_all" ON public.rueda_matches FOR ALL USING (true) WITH CHECK (true);
