-- Calendario: personas con Google Calendar vinculado, tipos de evento configurables y eventos agendados.
--
-- SEGURIDAD: `calendario_personas` guarda refresh/access tokens de Google (cifrados con AES-GCM desde la app).
-- A diferencia del resto del esquema, esta tabla tiene RLS ACTIVADA y SIN POLÍTICAS: la anon key (que viaja
-- en el bundle del navegador) no puede leerla ni escribirla. Solo la service role (server-side, /api/calendario/**)
-- accede. No agregar una policy "USING (true)" acá.
-- Idempotente.

-- 1) Personas con calendario vinculado
CREATE TABLE IF NOT EXISTS public.calendario_personas (
  id                    bigserial PRIMARY KEY,
  nombre                text NOT NULL,
  email                 text NOT NULL UNIQUE,
  google_calendar_id    text NOT NULL DEFAULT 'primary',
  zona_horaria          text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  refresh_token_cifrado text,
  access_token_cifrado  text,
  access_token_expira   timestamptz,
  activo                boolean NOT NULL DEFAULT true,
  conectado_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.calendario_personas IS 'Personas con Google Calendar vinculado vía OAuth del CRM. Tokens cifrados. RLS sin policies: solo service role.';

ALTER TABLE public.calendario_personas ENABLE ROW LEVEL SECURITY;
-- (sin policies a propósito)

-- 2) Tipos de evento configurables (llamada, visita, presentación ACM, precaptación, ...)
CREATE TABLE IF NOT EXISTS public.calendario_tipos_evento (
  id                 bigserial PRIMARY KEY,
  slug               text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9_]+$'),
  nombre             text NOT NULL,
  descripcion        text,
  duracion_min       integer NOT NULL DEFAULT 30 CHECK (duracion_min BETWEEN 5 AND 600),
  buffer_min         integer NOT NULL DEFAULT 0 CHECK (buffer_min BETWEEN 0 AND 240),
  anticipacion_min   integer NOT NULL DEFAULT 120 CHECK (anticipacion_min >= 0),
  ventana_dias       integer NOT NULL DEFAULT 14 CHECK (ventana_dias BETWEEN 1 AND 90),
  persona_id         bigint REFERENCES public.calendario_personas(id) ON DELETE SET NULL,
  horario            jsonb NOT NULL DEFAULT '{}'::jsonb,
  color              text NOT NULL DEFAULT '#3b82f6',
  agendable_por_bot  boolean NOT NULL DEFAULT false,
  activo             boolean NOT NULL DEFAULT true,
  orden              integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.calendario_tipos_evento.horario IS 'Horario de atención en hora local de la persona: {"1": [["09:00","13:00"],["15:00","19:00"]], ...} con 1 = lunes ... 7 = domingo.';
COMMENT ON COLUMN public.calendario_tipos_evento.persona_id IS 'Responsable. NULL = primera persona activa vinculada.';
COMMENT ON COLUMN public.calendario_tipos_evento.agendable_por_bot IS 'Si el agente de WhatsApp puede ofrecer y agendar este tipo por sí solo.';

-- 3) Eventos creados desde el CRM o el bot (espejo local del evento de Google, vinculado al lead)
CREATE TABLE IF NOT EXISTS public.calendario_eventos (
  id               bigserial PRIMARY KEY,
  tipo_evento_id   bigint REFERENCES public.calendario_tipos_evento(id) ON DELETE SET NULL,
  persona_id       bigint REFERENCES public.calendario_personas(id) ON DELETE SET NULL,
  lead_id          integer REFERENCES public.leads(id) ON DELETE SET NULL,
  google_event_id  text,
  titulo           text NOT NULL,
  descripcion      text,
  inicio           timestamptz NOT NULL,
  fin              timestamptz NOT NULL,
  estado           text NOT NULL DEFAULT 'confirmado' CHECK (estado IN ('confirmado', 'cancelado')),
  origen           text NOT NULL DEFAULT 'crm' CHECK (origen IN ('crm', 'bot')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (fin > inicio)
);

CREATE INDEX IF NOT EXISTS calendario_eventos_inicio_idx ON public.calendario_eventos (inicio);
CREATE INDEX IF NOT EXISTS calendario_eventos_lead_idx   ON public.calendario_eventos (lead_id);
CREATE UNIQUE INDEX IF NOT EXISTS calendario_eventos_google_idx ON public.calendario_eventos (google_event_id) WHERE google_event_id IS NOT NULL;

-- RLS abierta para tipos y eventos (sin secretos; misma convención que el resto del CRM)
ALTER TABLE public.calendario_tipos_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_eventos      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendario_tipos_evento_all" ON public.calendario_tipos_evento;
CREATE POLICY "calendario_tipos_evento_all" ON public.calendario_tipos_evento FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "calendario_eventos_all" ON public.calendario_eventos;
CREATE POLICY "calendario_eventos_all" ON public.calendario_eventos FOR ALL USING (true) WITH CHECK (true);

-- 4) Tipos iniciales. Solo "llamada" es agendable por el bot (el prompt actual prohíbe coordinar visitas
-- sin llamada previa); el resto se habilita desde /calendario cuando el equipo lo decida.
INSERT INTO public.calendario_tipos_evento
  (slug, nombre, descripcion, duracion_min, buffer_min, anticipacion_min, ventana_dias, horario, color, agendable_por_bot, orden)
VALUES
  ('llamada', 'Llamada', 'Llamada de Andrés con el lead para avanzar en la operación (después de la precalificación).',
   20, 10, 120, 7,
   '{"1":[["09:00","13:00"],["15:00","19:00"]],"2":[["09:00","13:00"],["15:00","19:00"]],"3":[["09:00","13:00"],["15:00","19:00"]],"4":[["09:00","13:00"],["15:00","19:00"]],"5":[["09:00","13:00"],["15:00","19:00"]]}'::jsonb,
   '#22c55e', true, 1),
  ('visita', 'Visita', 'Visita presencial a una propiedad con el lead.',
   60, 30, 1440, 14,
   '{"1":[["10:00","13:00"],["15:00","18:30"]],"2":[["10:00","13:00"],["15:00","18:30"]],"3":[["10:00","13:00"],["15:00","18:30"]],"4":[["10:00","13:00"],["15:00","18:30"]],"5":[["10:00","13:00"],["15:00","18:30"]],"6":[["10:00","13:00"]]}'::jsonb,
   '#3b82f6', false, 2),
  ('presentacion_acm', 'Presentación ACM', 'Presentación del análisis comparativo de mercado (tasación) al propietario.',
   60, 30, 1440, 14,
   '{"1":[["10:00","13:00"],["15:00","19:00"]],"2":[["10:00","13:00"],["15:00","19:00"]],"3":[["10:00","13:00"],["15:00","19:00"]],"4":[["10:00","13:00"],["15:00","19:00"]],"5":[["10:00","13:00"],["15:00","19:00"]]}'::jsonb,
   '#a855f7', false, 3),
  ('precaptacion', 'Precaptación', 'Primera reunión con un propietario que quiere vender o permutar, para relevar la propiedad.',
   45, 15, 1440, 14,
   '{"1":[["10:00","13:00"],["15:00","19:00"]],"2":[["10:00","13:00"],["15:00","19:00"]],"3":[["10:00","13:00"],["15:00","19:00"]],"4":[["10:00","13:00"],["15:00","19:00"]],"5":[["10:00","13:00"],["15:00","19:00"]]}'::jsonb,
   '#f59e0b', false, 4)
ON CONFLICT (slug) DO NOTHING;
