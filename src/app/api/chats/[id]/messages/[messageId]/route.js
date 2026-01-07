import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
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

    const { id: conversationId, messageId } = await params;

    if (!conversationId || !messageId) {
      return NextResponse.json(
        { error: 'IDs requeridos: conversationId, messageId' }, 
        { status: 400 }
      );
    }

    // Construir URL de la API de Chatwoot para borrar el mensaje
    const baseUrl = chatwootUrl.endsWith('/') ? chatwootUrl.slice(0, -1) : chatwootUrl;
    const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}`;
    
    console.log('Deleting message from:', apiUrl);

    // Hacer petición DELETE a Chatwoot para borrar el mensaje
    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'api_access_token': apiToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chatwoot Delete Message API Error:', response.status, errorText);
      
      return NextResponse.json(
        { 
          error: 'Error al borrar mensaje de Chatwoot',
          status: response.status,
          message: errorText
        }, 
        { status: response.status }
      );
    }

    // Chatwoot puede devolver un objeto vacío o un objeto con success
    const data = response.status === 204 ? {} : await response.json();
    
    console.log('Message deleted successfully:', messageId);
    
    return NextResponse.json({
      success: true,
      message: 'Mensaje borrado exitosamente',
      messageId: messageId
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { 
        error: 'Error al borrar el mensaje',
        message: error.message 
      }, 
      { status: 500 }
    );
  }
}

