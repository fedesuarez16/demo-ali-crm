# 🔒 Solución: Configurar Políticas RLS en Supabase

## ❌ Error Actual
```
new row violates row-level security policy for table "agent_status"
```

## ✅ Solución: Configurar Políticas RLS

### 1. **Ve a Supabase Dashboard**
- Abre tu proyecto en [supabase.com](https://supabase.com)
- Ve a **Authentication** → **Policies**

### 2. **Crear Políticas para la tabla `agent_status`**

Ejecuta este SQL en el **SQL Editor** de Supabase:

```sql
-- Habilitar RLS en la tabla
ALTER TABLE public.agent_status ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura pública
CREATE POLICY "Enable read access for all users" ON public.agent_status
FOR SELECT USING (true);

-- Política para permitir inserción pública
CREATE POLICY "Enable insert for all users" ON public.agent_status
FOR INSERT WITH CHECK (true);

-- Política para permitir actualización pública
CREATE POLICY "Enable update for all users" ON public.agent_status
FOR UPDATE USING (true);
```

### 3. **Alternativa: Deshabilitar RLS (Solo para desarrollo)**

Si prefieres deshabilitar RLS temporalmente:

```sql
-- DESHABILITAR RLS (solo para desarrollo)
ALTER TABLE public.agent_status DISABLE ROW LEVEL SECURITY;
```

### 4. **Verificar que funciona**

Después de ejecutar el SQL:
1. **Recarga la página** de tu aplicación
2. **Haz clic en el botón** del agente
3. **Verifica en Supabase** que se creó el registro:
   ```sql
   SELECT * FROM agent_status;
   ```

## 🎯 Resultado Esperado

Después de configurar las políticas, deberías ver en los logs:
```
Registro no encontrado, creando registro inicial...
Registro inicial creado: { id: 1, is_active: true }
```

Y el botón funcionará correctamente.

## 🔍 Verificar Políticas

Para ver las políticas actuales:
```sql
SELECT * FROM pg_policies WHERE tablename = 'agent_status';
```

Para eliminar políticas existentes (si es necesario):
```sql
DROP POLICY IF EXISTS "Enable read access for all users" ON public.agent_status;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.agent_status;
DROP POLICY IF EXISTS "Enable update for all users" ON public.agent_status;
```
