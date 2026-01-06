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
          error: 'Variables de entorno de Chatwoot no configuradas'
        }, 
        { status: 500 }
      );
    }

    const { id: conversationId, messageId, attachmentId } = await params;

    if (!conversationId || !messageId || !attachmentId) {
      return NextResponse.json(
        { error: 'IDs requeridos: conversationId, messageId, attachmentId' }, 
        { status: 400 }
      );
    }

    // Construir URL de la API de Chatwoot para obtener el attachment
    const baseUrl = chatwootUrl.endsWith('/') ? chatwootUrl.slice(0, -1) : chatwootUrl;
    const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}`;
    
    console.log('Fetching attachment from:', apiUrl);

    // Hacer petición a Chatwoot para obtener el attachment
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'api_access_token': apiToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chatwoot Attachment API Error:', response.status, errorText);
      
      return NextResponse.json(
        { 
          error: 'Error al obtener attachment de Chatwoot',
          status: response.status,
          message: errorText
        }, 
        { status: response.status }
      );
    }

    // Obtener el contenido del audio como blob
    const blob = await response.blob();
    
    // Obtener el content-type del response o usar uno por defecto
    const contentType = response.headers.get('content-type') || 'audio/ogg; codecs=opus';
    
    // Retornar el audio con los headers correctos
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="audio.${contentType.includes('ogg') ? 'ogg' : contentType.includes('mpeg') ? 'mp3' : 'audio'}")`,
        'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
      },
    });
  } catch (error) {
    console.error('Error fetching attachment:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener el attachment',
        message: error.message 
      }, 
      { status: 500 }
    );
  }
}

