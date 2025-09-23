import { NextResponse } from 'next/server';

export async function GET() {
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

    // Construir URL de la API de Chatwoot (asegurar que no haya doble barra)
    const baseUrl = chatwootUrl.endsWith('/') ? chatwootUrl.slice(0, -1) : chatwootUrl;
    // Agregar el parámetro para incluir información de contacto
    const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations?include_contact=true`;
    
    console.log('Fetching conversations from:', apiUrl);

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
      console.error('Chatwoot API Error:', response.status, errorText);
      
      return NextResponse.json(
        { 
          error: 'Error al obtener conversaciones de Chatwoot',
          status: response.status,
          message: errorText
        }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('Chatwoot API Response structure keys:', Object.keys(data));
    if (data.data) {
      console.log('data.data keys:', Object.keys(data.data));
      if (data.data.payload) {
        console.log(`Found ${data.data.payload.length} conversations in payload`);
      }
    }
    
    // Manejar diferentes estructuras de respuesta de Chatwoot
    let conversations = [];
    
    if (Array.isArray(data)) {
      // Si la respuesta directa es un array
      conversations = data;
    } else if (data.data && data.data.payload && Array.isArray(data.data.payload)) {
      // Si los datos están en data.data.payload (estructura real de Chatwoot)
      conversations = data.data.payload;
      console.log('Found conversations in data.data.payload');
    } else if (data.data && Array.isArray(data.data)) {
      // Si los datos están en data.data
      conversations = data.data;
    } else if (data.payload && Array.isArray(data.payload)) {
      // Si los datos están en data.payload
      conversations = data.payload;
    } else {
      console.warn('Unexpected API response structure:', data);
      conversations = [];
    }
    
    // Filtrar solo conversaciones de WhatsApp si es necesario
    // Por ahora, mostrar todas las conversaciones ya que no vemos el campo channel en la respuesta
    const whatsappChats = conversations.filter(chat => {
      // Verificar si es WhatsApp por diferentes criterios
      const hasWhatsAppSender = chat.last_non_activity_message?.sender?.identifier?.includes('@s.whatsapp.net');
      const hasWhatsAppPhone = chat.last_non_activity_message?.sender?.phone_number;
      const hasWhatsAppSourceId = chat.last_non_activity_message?.source_id?.includes('WAID:');
      
      return hasWhatsAppSender || hasWhatsAppPhone || hasWhatsAppSourceId;
    });

    console.log(`Found ${conversations.length} total conversations, ${whatsappChats.length} WhatsApp conversations`);

    return NextResponse.json({
      success: true,
      data: whatsappChats,
      total: whatsappChats.length,
      totalConversations: conversations.length,
      debug: {
        responseStructure: Object.keys(data),
        hasData: !!data.data,
        hasPayload: !!data.payload,
        isArray: Array.isArray(data)
      }
    });

  } catch (error) {
    console.error('Error en API de chats:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error.message 
      }, 
      { status: 500 }
    );
  }
}
