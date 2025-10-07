# 🔧 Configuración de Supabase - Solución de Problemas

## ❌ Problema Actual

El botón del agente no funciona porque **Supabase no está configurado**. Los errores 500 indican que faltan las variables de entorno.

## ✅ Solución Paso a Paso

### 1. **Crear archivo `.env.local`**

Crea un archivo `.env.local` en la raíz del proyecto con:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

### 2. **Obtener credenciales de Supabase**

1. Ve a [supabase.com](https://supabase.com) y entra a tu proyecto
2. En el menú lateral, ve a **Settings** → **API**
3. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. **Crear la tabla en Supabase**

Ejecuta este SQL en el **SQL Editor** de Supabase:

```sql
-- Crear la tabla
CREATE TABLE public.agent_status (
  id integer NOT NULL,
  is_active boolean NULL DEFAULT true,
  CONSTRAINT agent_status_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Insertar el registro inicial
INSERT INTO agent_status (id, is_active) VALUES (1, true);

-- Verificar que se creó correctamente
SELECT * FROM agent_status;
```

### 4. **Configurar permisos (RLS)**

En Supabase, ve a **Authentication** → **Policies** y crea estas políticas:

```sql
-- Permitir lectura pública
CREATE POLICY "Enable read access for all users" ON public.agent_status
FOR SELECT USING (true);

-- Permitir actualización pública
CREATE POLICY "Enable update for all users" ON public.agent_status
FOR UPDATE USING (true);
```

### 5. **Reiniciar el servidor**

```bash
npm run dev
```

## 🧪 Verificar que Funciona

1. **Abre la consola del navegador** (F12)
2. **Recarga la página** y verifica que no hay errores 500
3. **Haz clic en el botón** del agente
4. **Verifica en Supabase** que el valor cambió:
   ```sql
   SELECT * FROM agent_status WHERE id = 1;
   ```

## 🔍 Diagnóstico de Errores

### Error: "Supabase no está configurado"
- ✅ **Solución**: Configura las variables de entorno en `.env.local`

### Error: "relation 'agent_status' does not exist"
- ✅ **Solución**: Ejecuta el SQL para crear la tabla

### Error: "new row violates row-level security policy"
- ✅ **Solución**: Configura las políticas RLS

### Error: "permission denied for table agent_status"
- ✅ **Solución**: Verifica que las políticas permitan acceso público

## 📝 Notas Importantes

- **NO** subas el archivo `.env.local` a Git
- **SÍ** reinicia el servidor después de cambiar variables de entorno
- **SÍ** verifica que la tabla existe y tiene el registro con `id = 1`

## 🚀 Una vez configurado

El botón funcionará correctamente y:
- ✅ Se sincronizará con Supabase
- ✅ Persistirá los cambios al recargar
- ✅ Funcionará en producción (Vercel)
