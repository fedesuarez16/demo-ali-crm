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

    // Construir URL de la API de Chatwoot para agentes
    const baseUrl = chatwootUrl.endsWith('/') ? chatwootUrl.slice(0, -1) : chatwootUrl;
    const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/agents`;
    
    console.log('Fetching agents from:', apiUrl);

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
      console.error('Chatwoot Agents API Error:', response.status, errorText);
      
      return NextResponse.json(
        { 
          error: 'Error al obtener agentes de Chatwoot',
          status: response.status,
          message: errorText
        }, 
        { status: response.status }
      );
    }

    const agents = await response.json();
    
    console.log(`Found ${agents.length || 0} agents`);

    return NextResponse.json({
      success: true,
      data: agents,
      total: agents.length || 0
    });

  } catch (error) {
    console.error('Error en API de agentes:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error.message 
      }, 
      { status: 500 }
    );
  }
}

