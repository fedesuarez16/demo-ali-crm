import { NextRequest, NextResponse } from 'next/server';

// Configuración del webhook de n8n
const N8N_WEBHOOK_BASE_URL = 'https://mia-n8n.w9weud.easypanel.host';
const N8N_AGREGAR_JID_URL = 'https://mia-n8n.w9weud.easypanel.host/webhook/agregar-jid';
const N8N_ELIMINAR_JID_URL = 'https://mia-n8n.w9weud.easypanel.host/webhook/eliminar-jid';

// Simulación local para listar JIDs (ya que n8n no tiene endpoint de listado)
const getRedisSimulation = () => {
  if (!globalThis.redisSimulation) {
    globalThis.redisSimulation = new Map<string, { value: string; expiry: number; addedAt: number }>();
  }
  return globalThis.redisSimulation;
};

declare global {
  var redisSimulation: Map<string, { value: string; expiry: number; addedAt: number }> | undefined;
}

// Función para limpiar claves expiradas
const cleanExpiredKeys = () => {
  const redisSimulation = getRedisSimulation();
  const now = Date.now();
  for (const [key, data] of redisSimulation.entries()) {
    if (data.expiry && data.expiry < now) {
      redisSimulation.delete(key);
    }
  }
};

// GET: Obtener un JID específico o listar todos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jid = searchParams.get('jid');
    
    cleanExpiredKeys();
    const redisSimulation = getRedisSimulation();
    
    if (jid) {
      // Verificar un JID específico
      const key = `campaña_ocho:${jid}`;
      const data = redisSimulation.get(key);
      
      // Log para depuración
      console.log('=== VERIFICACIÓN JID ===');
      console.log('JID recibido:', jid);
      console.log('Clave buscada:', key);
      console.log('Datos encontrados:', data);
      console.log('Todas las claves en Redis:', Array.from(redisSimulation.keys()));
      console.log('========================');
      
      return NextResponse.json({
        jid,
        exists: !!data,
        value: data?.value || null,
        expiry: data?.expiry || null,
        debug: {
          key,
          allKeys: Array.from(redisSimulation.keys()),
          found: !!data
        }
      });
    } else {
      // Listar todos los JIDs activos
      const activeJids: Array<{jid: string, value: string, expiry: number}> = [];
      
      for (const [key, data] of redisSimulation.entries()) {
        if (key.startsWith('campaña_ocho:')) {
          const jid = key.replace('campaña_ocho:', '');
          activeJids.push({
            jid,
            value: data.value,
            expiry: data.expiry
          });
        }
      }
      
      return NextResponse.json({
        jids: activeJids,
        total: activeJids.length
      });
    }
  } catch (error) {
    console.error('Error in GET /api/redis-jids:', error);
    return NextResponse.json(
      { error: 'Error al obtener JIDs' },
      { status: 500 }
    );
  }
}

// POST: Agregar un JID enviándolo al webhook de n8n
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jid, ttl = 86400 } = body; // TTL por defecto: 24 horas
    
    if (!jid) {
      return NextResponse.json(
        { error: 'JID es requerido' },
        { status: 400 }
      );
    }
    
    // Validar formato de JID de WhatsApp
    if (!jid.includes('@s.whatsapp.net')) {
      return NextResponse.json(
        { error: 'Formato de JID inválido. Debe incluir @s.whatsapp.net' },
        { status: 400 }
      );
    }
    
    // Enviar al webhook de n8n para agregar
    try {
      console.log('=== ENVIANDO JID A N8N ===');
      console.log('JID:', jid);
      console.log('TTL:', ttl, 'segundos');
      console.log('Webhook URL:', N8N_AGREGAR_JID_URL);
      
      const n8nResponse = await fetch(N8N_AGREGAR_JID_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jid: jid,
          ttl: ttl
        }),
      });
      
      if (n8nResponse.ok) {
        // También guardamos localmente para el listado
        const redisSimulation = getRedisSimulation();
        const expiry = Date.now() + (ttl * 1000);
        redisSimulation.set(`campaña_ocho:${jid}`, {
          value: "1",
          expiry,
          addedAt: Date.now()
        });
        
        console.log('✅ JID enviado exitosamente a n8n');
        
        return NextResponse.json({
          success: true,
          message: `JID ${jid} enviado a n8n exitosamente`,
          jid,
          ttl,
          source: 'n8n-webhook',
          expiry: new Date(expiry).toISOString()
        });
      } else {
        const errorText = await n8nResponse.text();
        console.error('❌ Error del webhook n8n:', errorText);
        
        return NextResponse.json(
          { 
            error: `Error del webhook n8n: ${n8nResponse.status} - ${errorText}`,
            webhookUrl: N8N_AGREGAR_JID_URL
          },
          { status: 500 }
        );
      }
    } catch (webhookError) {
      console.error('❌ Error conectando con n8n:', webhookError);
      
        return NextResponse.json(
          { 
            error: `Error conectando con n8n: ${webhookError instanceof Error ? webhookError.message : 'Error desconocido'}`,
            webhookUrl: N8N_AGREGAR_JID_URL
          },
          { status: 500 }
        );
    }
  } catch (error) {
    console.error('Error in POST /api/redis-jids:', error);
    return NextResponse.json(
      { error: 'Error al procesar solicitud' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un JID enviándolo al webhook de n8n
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jid = searchParams.get('jid');
    
    if (!jid) {
      return NextResponse.json(
        { error: 'JID es requerido' },
        { status: 400 }
      );
    }
    
    // Enviar al webhook de n8n para eliminar
    try {
      console.log('=== ENVIANDO ELIMINACIÓN A N8N ===');
      console.log('JID a eliminar:', jid);
      console.log('Webhook URL:', N8N_ELIMINAR_JID_URL);
      
      const n8nResponse = await fetch(N8N_ELIMINAR_JID_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jid: jid
        }),
      });
      
      if (n8nResponse.ok) {
        // También eliminamos localmente
        const redisSimulation = getRedisSimulation();
        const key = `campaña_ocho:${jid}`;
        redisSimulation.delete(key);
        
        console.log('✅ JID eliminado exitosamente en n8n');
        
        return NextResponse.json({
          success: true,
          message: `JID ${jid} eliminado en n8n exitosamente`,
          jid,
          source: 'n8n-webhook'
        });
      } else {
        const errorText = await n8nResponse.text();
        console.error('❌ Error del webhook n8n:', errorText);
        
        return NextResponse.json(
          { 
            error: `Error del webhook n8n: ${n8nResponse.status} - ${errorText}`,
            webhookUrl: N8N_ELIMINAR_JID_URL
          },
          { status: 500 }
        );
      }
    } catch (webhookError) {
      console.error('❌ Error conectando con n8n:', webhookError);
      
        return NextResponse.json(
          { 
            error: `Error conectando con n8n: ${webhookError instanceof Error ? webhookError.message : 'Error desconocido'}`,
            webhookUrl: N8N_ELIMINAR_JID_URL
          },
          { status: 500 }
        );
    }
  } catch (error) {
    console.error('Error in DELETE /api/redis-jids:', error);
    return NextResponse.json(
      { error: 'Error al procesar eliminación' },
      { status: 500 }
    );
  }
}
