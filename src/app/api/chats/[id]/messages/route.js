import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    // Validar variables de entorno
    const chatwootUrl = process.env.CHATWOOT_URL;
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    const apiToken = process.env.CHATWOOT_API_TOKEN;

    if (!chatwootUrl || !accountId || !apiToken) {
      return NextResponse.json(
        { 
          error: 'Variables de entorno de Chatwoot no configuradas',
          missing: {
            CHATWOOT_URL: !chatwootUrl,
            CHATWOOT_ACCOUNT_ID: !accountId,
            CHATWOOT_API_TOKEN: !apiToken
          }
        }, 
        { status: 500 }
      );
    }

    const { id: conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'ID de conversación requerido' }, 
        { status: 400 }
      );
    }

    // Construir URL de la API de Chatwoot para mensajes
    const baseUrl = chatwootUrl.endsWith('/') ? chatwootUrl.slice(0, -1) : chatwootUrl;
    const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;
    
    console.log('Fetching messages from:', apiUrl);

    // Hacer petición a Chatwoot
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': apiToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chatwoot Messages API Error:', response.status, errorText);
      
      // Detectar si el error es por token expirado
      if (errorText.includes('expired') || errorText.includes('Session has expired') || errorText.includes('Invalid OAuth access token')) {
        return NextResponse.json(
          { 
            error: 'Token de acceso expirado',
            message: 'El token de acceso de WhatsApp Business API ha expirado. Por favor, genera un nuevo token de larga duración siguiendo la guía FACEBOOK_TOKEN_SETUP.md',
            details: 'El token de acceso de Facebook/WhatsApp se vence cada 1-2 horas. Necesitas generar un token de larga duración (60 días) o un Page Access Token permanente.',
            solution: 'Consulta FACEBOOK_TOKEN_SETUP.md para instrucciones detalladas'
          }, 
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Error al obtener mensajes de Chatwoot',
          status: response.status,
          message: errorText
        }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('Messages API Response keys:', Object.keys(data));
    
    // Manejar diferentes estructuras de respuesta
    let messages = [];
    
    if (Array.isArray(data)) {
      messages = data;
    } else if (data.data && Array.isArray(data.data)) {
      messages = data.data;
    } else if (data.payload && Array.isArray(data.payload)) {
      messages = data.payload;
    } else {
      console.warn('Unexpected messages API response structure:', data);
      messages = [];
    }

    // Filtrar mensajes de actividad y mensajes borrados (solo mostrar mensajes reales)
    const realMessages = messages.filter(msg => {
      // No mostrar mensajes de actividad
      if (msg.message_type === 2) return false;
      
      // No mostrar mensajes sin contenido
      if (!msg.content || msg.content.trim() === '') return false;
      
      // Filtrar mensajes borrados - no mostrar mensajes que contengan "deleted" o estén marcados como borrados
      const content = (msg.content || '').toLowerCase();
      const isDeleted = 
        content.includes('this message was deleted') ||
        content.includes('mensaje eliminado') ||
        content.includes('message was deleted') ||
        msg.content_attributes?.deleted === true ||
        msg.private === true ||
        msg.deleted === true ||
        msg.status === 'deleted';
      
      return !isDeleted;
    });

    console.log(`Found ${messages.length} total messages, ${realMessages.length} real messages (${messages.length - realMessages.length} filtered)`);

    return NextResponse.json({
      success: true,
      data: realMessages,
      total: realMessages.length,
      conversationId: conversationId
    });

  } catch (error) {
    console.error('Error en API de mensajes:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error.message 
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    // Validar variables de entorno
    const chatwootUrl = process.env.CHATWOOT_URL;
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    const apiToken = process.env.CHATWOOT_API_TOKEN;

    // Log para depuración (sin mostrar el token completo por seguridad)
    console.log('🔑 Token info (POST):', {
      hasToken: !!apiToken,
      tokenLength: apiToken ? apiToken.length : 0,
      tokenPrefix: apiToken ? apiToken.substring(0, 10) + '...' : 'N/A',
      chatwootUrl: chatwootUrl,
      accountId: accountId
    });

    if (!chatwootUrl || !accountId || !apiToken) {
      return NextResponse.json(
        { 
          error: 'Variables de entorno de Chatwoot no configuradas',
          missing: {
            CHATWOOT_URL: !chatwootUrl,
            CHATWOOT_ACCOUNT_ID: !accountId,
            CHATWOOT_API_TOKEN: !apiToken
          }
        }, 
        { status: 500 }
      );
    }

    const { id: conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'ID de conversación requerido' }, 
        { status: 400 }
      );
    }

    // Obtener el cuerpo de la petición
    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'El contenido del mensaje es requerido' }, 
        { status: 400 }
      );
    }

    // Construir URL de la API de Chatwoot para enviar mensajes
    const baseUrl = chatwootUrl.endsWith('/') ? chatwootUrl.slice(0, -1) : chatwootUrl;
    
    // Primero, verificar el estado de la conversación
    const conversationUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}`;
    let conversationData = null;
    
    const conversationResponse = await fetch(conversationUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': apiToken,
      },
    });

    if (!conversationResponse.ok) {
      const errorText = await conversationResponse.text();
      console.error('Error al obtener conversación:', conversationResponse.status, errorText);
      
      // Detectar si el error es por token expirado
      if (errorText.includes('expired') || errorText.includes('Session has expired') || errorText.includes('Invalid OAuth access token')) {
        return NextResponse.json(
          { 
            error: 'Token de acceso expirado',
            message: 'El token de acceso de WhatsApp Business API ha expirado. Por favor, genera un nuevo token de larga duración siguiendo la guía FACEBOOK_TOKEN_SETUP.md',
            details: 'El token de acceso de Facebook/WhatsApp se vence cada 1-2 horas. Necesitas generar un token de larga duración (60 días) o un Page Access Token permanente.',
            solution: 'Consulta FACEBOOK_TOKEN_SETUP.md para instrucciones detalladas'
          }, 
          { status: 401 }
        );
      }
    } else {
      conversationData = await conversationResponse.json();
      console.log('Conversation status:', conversationData.status);
      console.log('Conversation inbox_id:', conversationData.inbox_id);
      
      // Si la conversación está resuelta, reabrila para poder enviar mensajes
      if (conversationData.status === 'resolved') {
        console.log('Conversación resuelta, reabriendo...');
        await fetch(conversationUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'api_access_token': apiToken,
          },
          body: JSON.stringify({
            status: 'open'
          }),
        });
        // Recargar datos de la conversación después de reabrir
        const updatedResponse = await fetch(conversationUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'api_access_token': apiToken,
          },
        });
        if (updatedResponse.ok) {
          conversationData = await updatedResponse.json();
        }
      }
    }

    // Obtener información del inbox para verificar el tipo de canal
    let inboxInfo = null;
    if (conversationData && conversationData.inbox_id) {
      try {
        const inboxUrl = `${baseUrl}/api/v1/accounts/${accountId}/inboxes/${conversationData.inbox_id}`;
        const inboxResponse = await fetch(inboxUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'api_access_token': apiToken,
          },
        });
        if (inboxResponse.ok) {
          inboxInfo = await inboxResponse.json();
          console.log('Inbox type:', inboxInfo.channel_type);
          console.log('Inbox name:', inboxInfo.name);
          console.log('Inbox status:', inboxInfo.status);
          console.log('Inbox channel details:', JSON.stringify(inboxInfo.channel || {}, null, 2));
          
          // Verificar si el inbox está conectado
          if (inboxInfo.status !== 'connected' && inboxInfo.status !== 'active') {
            console.warn('⚠️ El inbox de WhatsApp puede no estar conectado. Status:', inboxInfo.status);
          }
        } else {
          const inboxErrorText = await inboxResponse.text();
          console.warn('No se pudo obtener información del inbox:', inboxErrorText);
        }
      } catch (inboxError) {
        console.warn('No se pudo obtener información del inbox:', inboxError);
      }
    }

    const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;
    
    console.log('Sending message to:', apiUrl);
    console.log('Message content:', content);
    console.log('Conversation inbox_id:', conversationData?.inbox_id);

    // Obtener el agente asignado a la conversación para enviar como agente
    let agentId = null;
    if (conversationData && conversationData.assignee_id) {
      agentId = conversationData.assignee_id;
      console.log('Using assigned agent ID:', agentId);
    } else {
      // Si no hay agente asignado, obtener el primer agente disponible
      try {
        const agentsUrl = `${baseUrl}/api/v1/accounts/${accountId}/agents`;
        const agentsResponse = await fetch(agentsUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'api_access_token': apiToken,
          },
        });
        if (agentsResponse.ok) {
          const agents = await agentsResponse.json();
          if (agents && agents.length > 0) {
            agentId = agents[0].id;
            console.log('Using first available agent ID:', agentId);
          }
        }
      } catch (agentError) {
        console.warn('No se pudo obtener agentes:', agentError);
      }
    }

    // Preparar el body del mensaje
    // IMPORTANTE: Para mensajes salientes en Chatwoot, el mensaje debe venir de un User/Agent, no de un Contact
    // El problema es que cuando usamos la API, a veces Chatwoot lo interpreta como mensaje del contacto
    const messageBody = {
      content: content.trim(),
      message_type: 1, // 1 = outgoing, 0 = incoming
      private: false
    };

    // Intentar usar el endpoint de "send reply" si está disponible, o agregar parámetros adicionales
    // Según la documentación de Chatwoot, el mensaje debería enviarse automáticamente como agente
    // si la conversación tiene un agente asignado
    let finalApiUrl = apiUrl;
    
    // Si hay un agente asignado, asegurarnos de que el mensaje se envíe como agente
    if (agentId) {
      console.log('Agent assigned, message should be sent as agent');
      // El endpoint estándar debería funcionar, pero podemos intentar forzar el sender
      // Nota: Chatwoot puede requerir que el token tenga permisos de usuario/agente
    }

    console.log('Message body:', JSON.stringify(messageBody, null, 2));
    console.log('Using API URL:', finalApiUrl);

    // Hacer petición a Chatwoot para enviar el mensaje
    const response = await fetch(finalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': apiToken,
      },
      body: JSON.stringify(messageBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Chatwoot Send Message API Error:', response.status);
      console.error('Error details:', errorText);
      
      // Verificar si es un error de token expirado de WhatsApp Business API
      if (errorText.includes('Error validating access token') || 
          errorText.includes('Session has expired') || 
          errorText.includes('expired') ||
          errorText.includes('Invalid OAuth access token')) {
        console.error('🚨 ERROR: El token de WhatsApp Business API ha expirado');
        console.error('💡 SOLUCIÓN: El token de acceso de Facebook/WhatsApp se vence cada 1-2 horas');
        console.error('   Necesitas generar un token de larga duración (60 días) o un Page Access Token permanente');
        console.error('   Consulta el archivo FACEBOOK_TOKEN_SETUP.md para instrucciones detalladas');
        console.error('   Pasos rápidos:');
        console.error('   1. Ve a Facebook Developers → Graph API Explorer');
        console.error('   2. Genera un Page Access Token (no expira)');
        console.error('   3. Actualiza el token en Chatwoot → Settings → Inboxes → WhatsApp → Access Token');
        
        return NextResponse.json(
          { 
            error: 'Token de WhatsApp Business API expirado',
            status: response.status,
            message: 'El token de acceso de WhatsApp Business API ha expirado. Los tokens de corta duración se vencen cada 1-2 horas.',
            solution: 'Genera un token de larga duración (60 días) o un Page Access Token permanente siguiendo la guía en FACEBOOK_TOKEN_SETUP.md',
            details: errorText,
            quickFix: {
              step1: 'Ve a Facebook Developers → Graph API Explorer',
              step2: 'Selecciona tu Página de WhatsApp Business',
              step3: 'Genera un Page Access Token (no expira)',
              step4: 'Actualiza el token en Chatwoot → Settings → Inboxes → WhatsApp'
            }
          }, 
          { status: 401 }
        );
      }
      
      // Verificar si es un error del token de Chatwoot
      if (errorText.includes('Unauthorized') || errorText.includes('Invalid API token')) {
        console.error('🚨 ERROR: El token de Chatwoot API ha expirado o no es válido');
        console.error('💡 SOLUCIÓN: Verifica que:');
        console.error('   1. Has actualizado CHATWOOT_API_TOKEN en las variables de entorno');
        console.error('   2. Has reiniciado el servidor después de actualizar el token');
        console.error('   3. El token es válido y tiene los permisos correctos');
        
        return NextResponse.json(
          { 
            error: 'Token de Chatwoot API expirado o inválido',
            status: response.status,
            message: 'El token de Chatwoot ha expirado. Por favor, genera un nuevo token y actualiza la variable de entorno CHATWOOT_API_TOKEN, luego reinicia el servidor.',
            details: errorText
          }, 
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Error al enviar mensaje a Chatwoot',
          status: response.status,
          message: errorText
        }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('Message sent successfully:', JSON.stringify(data, null, 2));
    console.log('Message status:', data.status);
    console.log('Message id:', data.id);
    console.log('Message type:', data.message_type);
    console.log('Message source_id:', data.source_id);
    console.log('Message inbox_id:', data.inbox_id);
    
    // Verificar si el mensaje se envió correctamente
    if (data.status === 'sent' || data.status === 'delivered') {
      console.log('✅ Mensaje enviado correctamente a Chatwoot');
    } else {
      console.warn('⚠️ Mensaje creado pero estado inesperado:', data.status);
    }

    // IMPORTANTE: El mensaje puede estar en estado 'sent' en Chatwoot pero no haberse enviado realmente a WhatsApp
    // Esto puede deberse a:
    // 1. La ventana de 24 horas de WhatsApp (si el usuario no ha enviado un mensaje en 24h, solo se pueden enviar plantillas)
    // 2. El número no está registrado en WhatsApp
    // 3. Problemas de configuración del inbox de WhatsApp en Chatwoot
    // 4. El proveedor de WhatsApp (360Dialog, etc.) no está configurado correctamente
    
    console.log('📝 NOTA: Si el mensaje no llega a WhatsApp, verifica:');
    console.log('   1. Que el usuario haya enviado un mensaje en las últimas 24 horas');
    console.log('   2. Que el número esté registrado en WhatsApp');
    console.log('   3. Que el inbox de WhatsApp esté correctamente configurado en Chatwoot');
    console.log('   4. Que el proveedor de WhatsApp (360Dialog, etc.) esté activo y funcionando');

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Mensaje enviado correctamente',
      status: data.status
    });

  } catch (error) {
    console.error('Error en API de envío de mensajes:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error.message 
      }, 
      { status: 500 }
    );
  }
}
