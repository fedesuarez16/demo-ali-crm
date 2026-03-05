# 🚀 Guía Completa: Clonar y Configurar el CRM Inmobiliario desde Cero

Esta guía te llevará paso a paso para clonar el repositorio y configurar todo el sistema en una nueva cuenta de Supabase.

---

## 📋 Índice

1. [Clonar el Repositorio](#1-clonar-el-repositorio)
2. [Crear Nueva Cuenta de Supabase](#2-crear-nueva-cuenta-de-supabase)
3. [Crear Todas las Tablas en Supabase](#3-crear-todas-las-tablas-en-supabase)
4. [Configurar Variables de Entorno](#4-configurar-variables-de-entorno)
5. [Instalar Dependencias](#5-instalar-dependencias)
6. [Configurar Chatwoot (Opcional)](#6-configurar-chatwoot-opcional)
7. [Configurar n8n (Opcional)](#7-configurar-n8n-opcional)
8. [Verificar que Todo Funciona](#8-verificar-que-todo-funciona)

---

## 1. Clonar el Repositorio

### Opción A: Clonar desde Git (si tienes acceso al repositorio remoto)

```bash
# Navegar a donde quieres clonar el proyecto
cd ~/proyectos  # o donde prefieras

# Clonar el repositorio
git clone <URL_DEL_REPOSITORIO> nuevo-crm-inmobiliario

# Entrar al directorio
cd nuevo-crm-inmobiliario
```

### Opción B: Copiar el proyecto localmente

```bash
# Navegar al directorio del proyecto original
cd /Users/federicosuarez/demo-ali

# Copiar todo el proyecto (excluyendo node_modules y .next)
rsync -av --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  /Users/federicosuarez/demo-ali/ ~/proyectos/nuevo-crm-inmobiliario/

# O usar cp si prefieres
cp -r /Users/federicosuarez/demo-ali ~/proyectos/nuevo-crm-inmobiliario
cd ~/proyectos/nuevo-crm-inmobiliario

# Eliminar archivos que no necesitas copiar
rm -rf node_modules .next .git
```

---

## 2. Crear Nueva Cuenta de Supabase

### Paso 2.1: Crear cuenta en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Haz clic en **"Start your project"** o **"Sign up"**
3. Crea una cuenta nueva (puedes usar GitHub, Google, o email)
4. Verifica tu email si es necesario

### Paso 2.2: Crear un nuevo proyecto

1. En el dashboard de Supabase, haz clic en **"New Project"**
2. Completa el formulario:
   - **Name**: `crm-inmobiliario` (o el nombre que prefieras)
   - **Database Password**: Genera una contraseña segura y **guárdala** (la necesitarás)
   - **Region**: Elige la región más cercana a ti
   - **Pricing Plan**: Free tier es suficiente para empezar
3. Haz clic en **"Create new project"**
4. Espera 2-3 minutos mientras Supabase crea tu proyecto

### Paso 2.3: Obtener las credenciales de API

1. En el dashboard de tu proyecto, ve a **Settings** (⚙️) → **API**
2. Encontrarás:
   - **Project URL**: `https://xxxxx.supabase.co` → Esta es tu `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key: Una clave larga que empieza con `eyJ...` → Esta es tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Copia ambas** y guárdalas temporalmente (las usarás en el paso 4)

---

## 3. Crear Todas las Tablas en Supabase

Ahora vamos a crear todas las tablas necesarias. Ve al **SQL Editor** en Supabase (menú lateral izquierdo) y ejecuta cada script en orden.

### Paso 3.1: Crear tabla `leads`

```sql
-- Tabla principal de leads/contactos
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

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_id ON public.leads(whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_leads_estado ON public.leads(estado);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_seguimientos_count ON public.leads(seguimientos_count);
CREATE INDEX IF NOT EXISTS idx_leads_chatwoot_conversation_id ON public.leads(chatwoot_conversation_id);

-- Comentarios para documentación
COMMENT ON TABLE public.leads IS 'Tabla principal de leads/contactos del CRM';
COMMENT ON COLUMN public.leads.estado IS 'Estado del lead: frío, tibio, caliente, llamada, visita u otros personalizados';
COMMENT ON COLUMN public.leads.estado_chat IS 'Estado del chat: 1 = activo, 0 = inactivo (independiente del estado del lead)';
COMMENT ON COLUMN public.leads.chatwoot_conversation_id IS 'ID de la conversación en Chatwoot para calificación automática';
```

### Paso 3.2: Crear tabla `propiedades`

```sql
-- Tabla de propiedades inmobiliarias
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_propiedades_zona ON public.propiedades(zona);
CREATE INDEX IF NOT EXISTS idx_propiedades_tipo ON public.propiedades(tipo_de_propiedad);
```

### Paso 3.3: Crear tabla `documents` (opcional, para búsqueda semántica)

```sql
-- Tabla de documentos de propiedades con embeddings
CREATE TABLE IF NOT EXISTS public.documents (
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
  content TEXT,
  descripcion TEXT,
  metadata JSONB,
  embedding VECTOR(1536), -- Ajusta la dimensión según tu modelo de embeddings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsqueda vectorial (requiere extensión pgvector)
-- CREATE INDEX IF NOT EXISTS idx_documents_embedding ON public.documents 
-- USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Nota:** La tabla `documents` requiere la extensión `pgvector` de Supabase. Si no la necesitas ahora, puedes omitir esta tabla.

### Paso 3.4: Crear tabla `kanban_columns`

```sql
-- Tabla para guardar las columnas personalizadas del Kanban
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

-- Insertar un registro inicial con valores por defecto
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
```

### Paso 3.5: Crear tabla `agent_status`

```sql
-- Tabla para el estado del agente IA
CREATE TABLE IF NOT EXISTS public.agent_status (
  id INTEGER NOT NULL PRIMARY KEY,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar el registro inicial
INSERT INTO public.agent_status (id, is_active) 
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;
```

### Paso 3.6: Crear tabla `pautas`

```sql
-- Tabla para almacenar las pautas de campañas activas
CREATE TABLE IF NOT EXISTS public.pautas (
  id SERIAL PRIMARY KEY,
  texto TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_pautas_created_at ON public.pautas(created_at DESC);

-- Trigger para actualizar updated_at automáticamente
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
```

### Paso 3.7: Crear tablas `cola_seguimientos` y `cola_seguimientos_dos`

```sql
-- Tabla para la cola de seguimientos
CREATE TABLE IF NOT EXISTS public.cola_seguimientos (
  id SERIAL PRIMARY KEY,
  remote_jid TEXT NOT NULL,
  session_id TEXT,
  mensaje TEXT NOT NULL,
  fecha_programada TIMESTAMP WITH TIME ZONE NOT NULL,
  estado TEXT DEFAULT 'pendiente', -- 'pendiente' o 'enviado'
  tipo_lead TEXT,
  seguimientos_count INTEGER DEFAULT 0,
  chatwoot_conversation_id INTEGER,
  plantilla VARCHAR(50), -- 'toque_1_frio', 'toque_2_frio', etc.
  fecha_ultima_interaccion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para la segunda cola de seguimientos
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

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_cola_seguimientos_estado ON public.cola_seguimientos(estado);
CREATE INDEX IF NOT EXISTS idx_cola_seguimientos_fecha ON public.cola_seguimientos(fecha_programada);
CREATE INDEX IF NOT EXISTS idx_cola_seguimientos_dos_estado ON public.cola_seguimientos_dos(estado);
CREATE INDEX IF NOT EXISTS idx_cola_seguimientos_dos_fecha ON public.cola_seguimientos_dos(fecha_programada);
```

### Paso 3.8: Configurar Permisos (RLS - Row Level Security)

Por defecto, Supabase tiene RLS habilitado. Necesitas crear políticas para permitir acceso a las tablas. Ejecuta este SQL:

```sql
-- Deshabilitar RLS temporalmente para desarrollo (o crear políticas específicas)
-- Para producción, deberías crear políticas más restrictivas

-- Leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on leads" ON public.leads
  FOR ALL USING (true) WITH CHECK (true);

-- Propiedades
ALTER TABLE public.propiedades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on propiedades" ON public.propiedades
  FOR ALL USING (true) WITH CHECK (true);

-- Documents (si la creaste)
-- ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations on documents" ON public.documents
--   FOR ALL USING (true) WITH CHECK (true);

-- Kanban columns
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on kanban_columns" ON public.kanban_columns
  FOR ALL USING (true) WITH CHECK (true);

-- Agent status
ALTER TABLE public.agent_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on agent_status" ON public.agent_status
  FOR ALL USING (true) WITH CHECK (true);

-- Pautas
ALTER TABLE public.pautas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on pautas" ON public.pautas
  FOR ALL USING (true) WITH CHECK (true);

-- Cola seguimientos
ALTER TABLE public.cola_seguimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on cola_seguimientos" ON public.cola_seguimientos
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.cola_seguimientos_dos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on cola_seguimientos_dos" ON public.cola_seguimientos_dos
  FOR ALL USING (true) WITH CHECK (true);
```

**⚠️ Nota de Seguridad:** Estas políticas permiten acceso completo a todos. Para producción, deberías crear políticas más restrictivas basadas en autenticación de usuarios.

---

## 4. Configurar Variables de Entorno

### Paso 4.1: Crear archivo `.env.local`

En la raíz del proyecto, crea un archivo llamado `.env.local`:

```bash
# Desde la raíz del proyecto
touch .env.local
```

### Paso 4.2: Agregar las variables de entorno

Abre `.env.local` con tu editor y agrega:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Chatwoot (Opcional - solo si usas integración con Chatwoot)
CHATWOOT_URL=https://chatwoot.tu-dominio.com
CHATWOOT_ACCOUNT_ID=2
CHATWOOT_API_TOKEN=tu_token_de_chatwoot

# n8n (Opcional - solo si usas webhooks de n8n)
N8N_WEBHOOK_URL=https://mia-n8n.w9weud.easypanel.host
```

**Reemplaza:**
- `https://xxxxx.supabase.co` con tu **Project URL** de Supabase
- `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` con tu **anon public key** de Supabase
- Los valores de Chatwoot y n8n si los usas

### Paso 4.3: Verificar que el archivo no se suba a Git

Asegúrate de que `.env.local` esté en tu `.gitignore`:

```bash
# Verificar que existe .gitignore
cat .gitignore | grep .env.local

# Si no está, agregarlo
echo ".env.local" >> .gitignore
```

---

## 5. Instalar Dependencias

### Paso 5.1: Instalar Node.js (si no lo tienes)

Verifica que tienes Node.js instalado:

```bash
node --version  # Debe ser v18 o superior
npm --version
```

Si no lo tienes, instálalo desde [nodejs.org](https://nodejs.org/)

### Paso 5.2: Instalar dependencias del proyecto

```bash
# Desde la raíz del proyecto
npm install
```

Esto instalará todas las dependencias listadas en `package.json`. Puede tardar 1-2 minutos.

---

## 6. Configurar Chatwoot (Opcional)

Si quieres usar la integración con Chatwoot para WhatsApp:

### Paso 6.1: Instalar Chatwoot

1. Sigue la [guía oficial de instalación de Chatwoot](https://www.chatwoot.com/docs/self-hosted/deployment/overview)
2. O usa una instancia alojada en la nube

### Paso 6.2: Obtener credenciales de Chatwoot

1. Ve a tu instancia de Chatwoot
2. Ve a **Settings** → **Applications** → **Access Tokens**
3. Crea un nuevo token de acceso con permisos de lectura/escritura
4. Copia el token

### Paso 6.3: Obtener Account ID

1. En Chatwoot, ve a **Settings** → **Accounts**
2. Copia el **Account ID** (generalmente es `1` o `2`)

### Paso 6.4: Agregar a `.env.local`

```env
CHATWOOT_URL=https://tu-chatwoot.com
CHATWOOT_ACCOUNT_ID=2
CHATWOOT_API_TOKEN=tu_token_aqui
```

---

## 7. Configurar n8n (Opcional)

Si quieres usar automatizaciones con n8n:

### Paso 7.1: Instalar n8n

1. Sigue la [guía oficial de n8n](https://docs.n8n.io/hosting/installation/)
2. O usa una instancia alojada

### Paso 7.2: Configurar webhooks

1. Crea workflows en n8n que escuchen en:
   - `/webhook/agregar-jid` - Para agregar JIDs a Redis
   - `/webhook/eliminar-jid` - Para eliminar JIDs de Redis

2. Agrega la URL de n8n a `.env.local`:

```env
N8N_WEBHOOK_URL=https://tu-n8n.com
```

---

## 8. Verificar que Todo Funciona

### Paso 8.1: Iniciar el servidor de desarrollo

```bash
npm run dev
```

Deberías ver algo como:

```
  ▲ Next.js 15.3.6
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

### Paso 8.2: Abrir el navegador

1. Ve a [http://localhost:3000](http://localhost:3000)
2. Deberías ver el dashboard del CRM

### Paso 8.3: Verificar conexión con Supabase

1. Abre la **consola del navegador** (F12 → Console)
2. No deberías ver errores relacionados con Supabase
3. Intenta crear un lead de prueba desde la interfaz
4. Verifica en Supabase que el lead se creó:
   ```sql
   SELECT * FROM leads ORDER BY created_at DESC LIMIT 1;
   ```

### Paso 8.4: Verificar tablas creadas

En Supabase, ve a **Table Editor** y verifica que todas las tablas estén creadas:

- ✅ `leads`
- ✅ `propiedades`
- ✅ `kanban_columns`
- ✅ `agent_status`
- ✅ `pautas`
- ✅ `cola_seguimientos`
- ✅ `cola_seguimientos_dos`

### Paso 8.5: Probar funcionalidades básicas

1. **Dashboard**: Debería cargar sin errores
2. **Leads (Kanban)**: Debería mostrar el tablero vacío (o con leads si agregaste algunos)
3. **Leads (Tabla)**: Debería mostrar la tabla vacía
4. **Propiedades**: Debería mostrar el Kanban de propiedades
5. **Chats**: Solo funcionará si configuraste Chatwoot

---

## 🐛 Solución de Problemas Comunes

### Error: "Supabase env vars missing"

**Solución:** Verifica que `.env.local` existe y tiene las variables correctas. Reinicia el servidor después de cambiar `.env.local`.

### Error: "relation does not exist"

**Solución:** Verifica que ejecutaste todos los scripts SQL en orden. Revisa en Supabase → Table Editor que todas las tablas existen.

### Error: "permission denied"

**Solución:** Verifica que creaste las políticas RLS correctamente (Paso 3.8).

### Error: "Cannot connect to Supabase"

**Solución:** 
1. Verifica que tu proyecto de Supabase esté activo
2. Verifica que la URL y la key sean correctas
3. Verifica tu conexión a internet

### El servidor no inicia

**Solución:**
```bash
# Eliminar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install

# Limpiar caché de Next.js
rm -rf .next
npm run dev
```

### Error: "ERESOLVE could not resolve" con react-beautiful-dnd

**Problema:** `react-beautiful-dnd` no es compatible con React 19.

**Solución:** Este paquete ya fue eliminado del `package.json` porque no se usa (el drag and drop usa eventos nativos de HTML5). Si aún aparece el error:

```bash
# Opción 1: Instalar con legacy peer deps (si hay otros conflictos)
npm install --legacy-peer-deps

# Opción 2: Limpiar e instalar de nuevo
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Checklist Final

Antes de considerar que todo está configurado, verifica:

- [ ] Repositorio clonado/copiado
- [ ] Nueva cuenta de Supabase creada
- [ ] Todas las tablas creadas (7 tablas principales)
- [ ] Políticas RLS configuradas
- [ ] Archivo `.env.local` creado con todas las variables
- [ ] Dependencias instaladas (`npm install`)
- [ ] Servidor inicia sin errores (`npm run dev`)
- [ ] Dashboard carga correctamente
- [ ] Puedes crear un lead de prueba
- [ ] El lead aparece en Supabase
- [ ] Chatwoot configurado (si lo usas)
- [ ] n8n configurado (si lo usas)

---

## 🎉 ¡Listo!

Tu CRM inmobiliario debería estar funcionando. Si encuentras algún problema, revisa la sección de "Solución de Problemas" o consulta los logs en la consola del navegador y del servidor.

---

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Chatwoot](https://www.chatwoot.com/docs)
- [Documentación de n8n](https://docs.n8n.io/)

---

**Última actualización:** 2024
**Versión del proyecto:** Next.js 15.3.6
