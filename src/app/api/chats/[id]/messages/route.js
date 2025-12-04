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

    // Filtrar mensajes de actividad (solo mostrar mensajes reales)
    const realMessages = messages.filter(msg => 
      msg.message_type !== 2 && // No mostrar mensajes de actividad
      msg.content && 
      msg.content.trim() !== ''
    );

    console.log(`Found ${messages.length} total messages, ${realMessages.length} real messages`);

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
        }
      } catch (inboxError) {
        console.warn('No se pudo obtener información del inbox:', inboxError);
      }
    }

    const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;
    
    console.log('Sending message to:', apiUrl);
    console.log('Message content:', content);
    console.log('Conversation inbox_id:', conversationData?.inbox_id);

    // Preparar el body del mensaje
    const messageBody = {
      content: content.trim(),
      message_type: 1, // 1 = outgoing, 0 = incoming
      private: false
    };

    // Para WhatsApp, algunos proveedores requieren parámetros adicionales
    // Intentar con el formato estándar primero
    console.log('Message body:', JSON.stringify(messageBody, null, 2));

    // Hacer petición a Chatwoot para enviar el mensaje
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': apiToken,
      },
      body: JSON.stringify(messageBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chatwoot Send Message API Error:', response.status, errorText);
      
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
