# 📋 Configuración de Columnas Kanban en Supabase

## 🎯 Objetivo

Las columnas personalizadas del Kanban ahora se guardan en **PostgreSQL (Supabase)** en lugar de `localStorage`, lo que permite que persistan en todos los dispositivos y navegadores.

## 📝 Paso 1: Crear la Tabla en Supabase

### Opción A: Usando el SQL Editor de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor** en el menú lateral
3. Crea una nueva query
4. Copia y pega el contenido del archivo `SUPABASE_KANBAN_COLUMNS_TABLE.sql`
5. Ejecuta la query (botón "Run" o `Ctrl/Cmd + Enter`)

### Opción B: Usando la CLI de Supabase

```bash
supabase db push
# O ejecuta directamente:
psql -h [tu-host] -U postgres -d postgres -f SUPABASE_KANBAN_COLUMNS_TABLE.sql
```

## 🗄️ Estructura de la Tabla

La tabla `kanban_columns` tiene la siguiente estructura:

```sql
kanban_columns
├── id (SERIAL PRIMARY KEY)
├── custom_columns (TEXT[]) - Array de columnas personalizadas creadas
├── visible_columns (TEXT[]) - Array de columnas visibles
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP) - Se actualiza automáticamente
```

## 🔐 Configuración de Permisos (RLS)

Por defecto, el script SQL crea la tabla pero **no habilita RLS**. Si necesitas seguridad adicional:

1. **Habilitar RLS:**
```sql
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
```

2. **Crear políticas de acceso:**
```sql
-- Permitir lectura a todos
CREATE POLICY "Allow read access to kanban_columns" 
  ON kanban_columns FOR SELECT 
  USING (true);

-- Permitir escritura a todos
CREATE POLICY "Allow write access to kanban_columns" 
  ON kanban_columns FOR ALL 
  USING (true);
```

**Nota:** Si tu aplicación tiene autenticación, ajusta las políticas según tus necesidades.

## ✅ Verificación

Después de crear la tabla, verifica que se creó correctamente:

```sql
SELECT * FROM kanban_columns;
```

Deberías ver un registro con:
- `custom_columns`: `{}` (array vacío)
- `visible_columns`: `['frío', 'tibio', 'caliente', 'llamada', 'visita']`

## 🚀 Funcionalidad

Una vez creada la tabla:

1. **Migración automática:** Al cargar la página, si hay columnas en `localStorage`, se migran automáticamente a Supabase
2. **Sincronización:** Las columnas se guardan automáticamente en Supabase cada vez que:
   - Se crea una nueva columna personalizada
   - Se elimina una columna personalizada
   - Se cambia la visibilidad de una columna
   - Se seleccionan/deseleccionan todas las columnas

3. **Persistencia:** Las columnas ahora persisten en:
   - ✅ Todos los dispositivos
   - ✅ Todos los navegadores
   - ✅ Después de limpiar el cache
   - ✅ Después de cerrar/abrir el navegador

## 🔄 Migración desde localStorage

El código incluye una función de migración automática que:
1. Verifica si ya hay datos en Supabase
2. Si no hay datos, intenta migrar desde `localStorage`
3. Si hay datos en Supabase, los usa directamente

**Nota:** Los datos de `localStorage` NO se eliminan automáticamente después de migrar (comentado en el código). Puedes eliminarlos manualmente si lo deseas.

## 🐛 Troubleshooting

### Error: "relation kanban_columns does not exist"
- **Solución:** Ejecuta el script SQL para crear la tabla

### Error: "permission denied for table kanban_columns"
- **Solución:** Verifica las políticas RLS o deshabilita RLS temporalmente:
```sql
ALTER TABLE kanban_columns DISABLE ROW LEVEL SECURITY;
```

### Las columnas no se guardan
- **Solución:** 
  1. Verifica la consola del navegador para ver errores
  2. Verifica que las variables de entorno de Supabase estén configuradas
  3. Verifica que la tabla tenga permisos de escritura

### Las columnas no aparecen en otro dispositivo
- **Solución:** 
  1. Verifica que la tabla se creó correctamente
  2. Verifica que los datos se guardaron en Supabase:
```sql
SELECT * FROM kanban_columns;
```
  3. Verifica la consola del navegador en el otro dispositivo

## 📊 Monitoreo

Para ver el estado actual de las columnas:

```sql
SELECT 
  id,
  custom_columns,
  visible_columns,
  updated_at
FROM kanban_columns
ORDER BY id DESC
LIMIT 1;
```

