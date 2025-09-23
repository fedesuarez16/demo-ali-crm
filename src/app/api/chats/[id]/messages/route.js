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

    const conversationId = params.id;

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
