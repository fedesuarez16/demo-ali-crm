# Configuración del Control de Agente

## Descripción

Este sistema permite activar/desactivar el agente de n8n desde la interfaz web. El agente verifica el estado en la base de datos de Supabase antes de continuar con su flujo.

## Tabla en Supabase

La tabla `agent_status` ya está creada con la siguiente estructura:

```sql
create table public.agent_status (
  id integer not null,
  is_active boolean null default true,
  constraint agent_status_pkey primary key (id)
) TABLESPACE pg_default;
```

## Configuración de Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

### Dónde obtener estas credenciales:

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. En el panel izquierdo, selecciona **Settings** > **API**
3. Copia las siguientes credenciales:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Insertar el Registro Inicial

Si aún no existe el registro con `id = 1`, ejecuta este query en Supabase:

```sql
INSERT INTO agent_status (id, is_active) VALUES (1, true);
```

## Funcionalidad

### En la Aplicación Web

El botón aparece en la barra superior de todas las páginas que usan `AppLayout`. 

- **Verde "Agente Activo"**: El agente está funcionando
- **Rojo "Agente Desactivado"**: El agente no procesará nuevos mensajes

Al hacer clic, se actualiza el estado en Supabase y cambia el color/texto del botón.

### En n8n

Tu flujo de n8n debe incluir un nodo que ejecute este query al inicio:

```sql
SELECT is_active FROM agent_status WHERE id = 1;
```

Luego usa un nodo **IF** que:
- Si `is_active = true` → Continúa el flujo
- Si `is_active = false` → Detiene el flujo

## Archivos Creados

1. **`src/lib/supabase.ts`**: Cliente de Supabase configurado
2. **`src/app/api/agent-status/route.ts`**: API para GET/POST del estado del agente
3. **`src/app/components/AgentStatusToggle.tsx`**: Componente del botón toggle
4. **`src/app/components/AppLayout.tsx`**: Layout actualizado con el botón en la barra superior

## Pruebas

1. Asegúrate de tener las variables de entorno configuradas
2. Reinicia el servidor de desarrollo: `npm run dev`
3. Navega a cualquier página del CRM
4. Verás el botón en la parte superior derecha
5. Haz clic para alternar entre activo/desactivado
6. Verifica en Supabase que el valor de `is_active` cambia

## Solución de Problemas

### El botón muestra "Cargando..." indefinidamente
- Verifica que las variables de entorno estén configuradas correctamente
- Revisa la consola del navegador para ver errores específicos
- Asegúrate de que el registro con `id = 1` existe en la tabla

### Error 500 al hacer clic en el botón
- Verifica los permisos de la tabla en Supabase
- Asegúrate de que la API key tiene permisos de lectura y escritura en `agent_status`

### El agente en n8n sigue ejecutándose aunque esté desactivado
- Verifica que el flujo de n8n esté usando el query correcto
- Asegúrate de que el nodo IF está configurado para detener el flujo cuando `is_active = false`

