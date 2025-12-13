import { NextResponse } from 'next/server';

const extractNumericPhone = (value) => {
  if (!value || typeof value !== 'string') return null;

  let normalized = value.trim();

  // Remover dominios o sufijos de JID
  if (normalized.includes('@')) {
    normalized = normalized.split('@')[0];
  }

  // Remover prefijos comunes
  normalized = normalized.replace(/^WAID:/i, '');
  normalized = normalized.replace(/^whatsapp:/i, '');

  // Mantener solo números y el signo +
  normalized = normalized.replace(/[^\d+]/g, '');

  // Remover + inicial para comparación consistente
  normalized = normalized.replace(/^\+/, '');

  return normalized.length >= 6 ? normalized : null;
};

export async function GET(request) {
  try {
    // Obtener parámetros de búsqueda de la URL
    const { searchParams } = new URL(request.url);
    const labelFilter = searchParams.get('label');
    const assigneeId = searchParams.get('assignee_id');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '20', 10);
    
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
    let apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations?include_contact=true`;
    
    // Agregar parámetros de paginación
    apiUrl += `&page=${page}&per_page=${perPage}`;
    
    // Agregar filtros opcionales
    if (labelFilter && labelFilter !== 'all') {
      apiUrl += `&labels[]=${encodeURIComponent(labelFilter)}`;
    }
    
    if (assigneeId) {
      if (assigneeId === 'unassigned') {
        apiUrl += `&assignee_type=unassigned`;
      } else if (assigneeId !== 'all') {
        apiUrl += `&assignee_type=assigned&assignee_id=${assigneeId}`;
      }
    }
    
    if (status && status !== 'all') {
      apiUrl += `&status=${status}`;
    }
    
    console.log('Fetching conversations from:', apiUrl);
    console.log('Filters applied:', { labelFilter, assigneeId, status });

    // Hacer petición a Chatwoot
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': apiToken,
        },
      });
    } catch (fetchError) {
      console.error('Error fetching from Chatwoot:', fetchError);
      
      // Manejar errores de red específicos
      if (fetchError.code === 'ENOTFOUND' || fetchError.message?.includes('getaddrinfo')) {
        return NextResponse.json(
          { 
            error: 'Error de conexión con Chatwoot',
            message: `No se pudo conectar con el servidor de Chatwoot. El hostname "${chatwootUrl}" no se puede resolver.`,
            details: 'Verifica que la URL de Chatwoot en las variables de entorno sea correcta y que el servidor esté accesible.',
            code: fetchError.code || 'NETWORK_ERROR'
          }, 
          { status: 503 }
        );
      }
      
      if (fetchError.message?.includes('timeout') || fetchError.message?.includes('ETIMEDOUT')) {
        return NextResponse.json(
          { 
            error: 'Timeout al conectar con Chatwoot',
            message: 'El servidor de Chatwoot no respondió a tiempo.',
            details: 'Verifica que el servidor esté funcionando y accesible.',
            code: 'TIMEOUT'
          }, 
          { status: 504 }
        );
      }
      
      // Error genérico de red
      return NextResponse.json(
        { 
          error: 'Error de red',
          message: `Error al conectar con Chatwoot: ${fetchError.message}`,
          details: 'Verifica tu conexión a internet y que el servidor de Chatwoot esté accesible.',
          code: fetchError.code || 'NETWORK_ERROR'
        }, 
        { status: 503 }
      );
    }

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

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      return NextResponse.json(
        { 
          error: 'Error al parsear respuesta de Chatwoot',
          message: jsonError.message 
        }, 
        { status: 500 }
      );
    }
    
    // Validar que data sea un objeto
    if (!data || typeof data !== 'object') {
      console.error('Invalid data structure:', typeof data, data);
      return NextResponse.json(
        { 
          error: 'Respuesta inválida de Chatwoot',
          message: 'La respuesta no es un objeto válido'
        }, 
        { status: 500 }
      );
    }
    
    // Extraer información de paginación de la respuesta de Chatwoot
    let pagination = {
      current_page: page,
      per_page: perPage,
      total_pages: 1,
      total_count: 0,
      has_more: false
    };
    
    // Chatwoot puede devolver paginación en diferentes lugares
    try {
      if (data.meta && typeof data.meta === 'object') {
        pagination = {
          current_page: data.meta.current_page || page,
          per_page: data.meta.per_page || perPage,
          total_pages: data.meta.total_pages || 1,
          total_count: data.meta.count || 0,
          has_more: (data.meta.current_page || page) < (data.meta.total_pages || 1)
        };
      } else if (data.pagination && typeof data.pagination === 'object') {
        pagination = {
          current_page: data.pagination.current_page || page,
          per_page: data.pagination.per_page || perPage,
          total_pages: data.pagination.total_pages || 1,
          total_count: data.pagination.total_count || 0,
          has_more: (data.pagination.current_page || page) < (data.pagination.total_pages || 1)
        };
      } else if (data.data?.meta && typeof data.data.meta === 'object') {
        // A veces la paginación está en data.meta
        pagination = {
          current_page: data.data.meta.current_page || page,
          per_page: data.data.meta.per_page || perPage,
          total_pages: data.data.meta.total_pages || 1,
          total_count: data.data.meta.count || 0,
          has_more: (data.data.meta.current_page || page) < (data.data.meta.total_pages || 1)
        };
      }
    } catch (paginationError) {
      console.error('Error extracting pagination:', paginationError);
      // Continuar con paginación por defecto
    }
    
    console.log('📊 Paginación detectada:', pagination);
    console.log('📊 Estructura de data:', {
      hasMeta: !!data.meta,
      hasPagination: !!data.pagination,
      hasDataMeta: !!data.data?.meta,
      dataKeys: Object.keys(data)
    });
    
    try {
      console.log('Chatwoot API Response structure keys:', Object.keys(data));
      if (data.data) {
        console.log('data.data type:', typeof data.data, 'isArray:', Array.isArray(data.data));
        if (data.data.payload && Array.isArray(data.data.payload)) {
          console.log(`Found ${data.data.payload.length} conversations in payload`);
          // Log de la primera conversación para ver estructura (solo si existe)
          if (data.data.payload.length > 0) {
            const firstChat = data.data.payload[0];
            if (firstChat && typeof firstChat === 'object') {
              console.log('📋 Primera conversación ID:', firstChat.id);
              console.log('📋 Campos disponibles:', Object.keys(firstChat));
              
              // Log seguro de las propiedades más importantes
              if (firstChat.meta) {
                console.log('  - meta:', Object.keys(firstChat.meta));
              }
              if (firstChat.additional_attributes) {
                console.log('  - additional_attributes:', firstChat.additional_attributes);
              }
              if (firstChat.last_non_activity_message) {
                console.log('  - last_non_activity_message keys:', Object.keys(firstChat.last_non_activity_message));
              }
            }
          }
        }
      }
    } catch (logError) {
      console.error('Error logging data structure:', logError);
    }
    
    // Manejar diferentes estructuras de respuesta de Chatwoot
    let conversations = [];
    
    try {
      if (Array.isArray(data)) {
        // Si la respuesta directa es un array
        conversations = data;
        console.log('Conversations found in root array');
      } else if (data && typeof data === 'object') {
        if (data.data && typeof data.data === 'object') {
          if (data.data.payload && Array.isArray(data.data.payload)) {
            // Si los datos están en data.data.payload (estructura real de Chatwoot)
            conversations = data.data.payload;
            console.log('Conversations found in data.data.payload');
          } else if (Array.isArray(data.data)) {
            // Si los datos están en data.data
            conversations = data.data;
            console.log('Conversations found in data.data');
          }
        } else if (data.payload && Array.isArray(data.payload)) {
          // Si los datos están en data.payload
          conversations = data.payload;
          console.log('Conversations found in data.payload');
        } else {
          console.warn('Unexpected API response structure:', Object.keys(data));
          conversations = [];
        }
      } else {
        console.warn('Data is not an object or array:', typeof data);
        conversations = [];
      }
    } catch (parseError) {
      console.error('Error parsing conversations structure:', parseError);
      console.error('Parse error details:', parseError.message, parseError.stack);
      conversations = [];
    }
    
    // Verificar que conversations sea un array válido
    if (!Array.isArray(conversations)) {
      console.error('Conversations is not an array:', typeof conversations, conversations);
      conversations = [];
    }
    
    console.log(`Total conversations extracted: ${conversations.length}`);
    
    // Enriquecer conversaciones con información de contacto adicional
    const enrichedConversations = conversations.map(chat => {
      try {
        // Validar que chat sea un objeto válido
        if (!chat || typeof chat !== 'object') {
          console.warn('Chat inválido encontrado:', chat);
          return null;
        }
        
        // Intentar extraer número de teléfono de múltiples fuentes
        let phoneNumber = null;
        let identifier = null;
        const phoneCandidates = [];

        // 1. Desde meta.sender (puede contener info del contacto)
        if (chat.meta?.sender) {
          phoneNumber = chat.meta.sender.phone_number || chat.meta.sender.phone || phoneNumber;
          identifier = chat.meta.sender.identifier || chat.meta.sender.id || identifier;
          if (chat.meta.sender.phone_number) phoneCandidates.push(chat.meta.sender.phone_number);
          if (chat.meta.sender.phone) phoneCandidates.push(chat.meta.sender.phone);
        }

        // 2. Desde additional_attributes (Chatwoot suele guardar info aquí)
        if (chat.additional_attributes) {
          phoneNumber = chat.additional_attributes.phone_number || 
                       chat.additional_attributes.phone || 
                       chat.additional_attributes.wa_id || 
                       phoneNumber;
          if (chat.additional_attributes.phone_number) phoneCandidates.push(chat.additional_attributes.phone_number);
          if (chat.additional_attributes.phone) phoneCandidates.push(chat.additional_attributes.phone);
          if (chat.additional_attributes.wa_id) phoneCandidates.push(chat.additional_attributes.wa_id);
        }

        // 3. Desde last_non_activity_message.sender
        if (chat.last_non_activity_message?.sender) {
          phoneNumber = chat.last_non_activity_message.sender.phone_number || phoneNumber;
          identifier = chat.last_non_activity_message.sender.identifier || identifier;
          if (chat.last_non_activity_message.sender.phone_number) phoneCandidates.push(chat.last_non_activity_message.sender.phone_number);
          if (chat.last_non_activity_message.sender.identifier) phoneCandidates.push(chat.last_non_activity_message.sender.identifier);
        }

        // 4. Desde source_id (formato WAID:numero)
        if (chat.last_non_activity_message?.source_id) {
          const sourceId = chat.last_non_activity_message.source_id;
          if (typeof sourceId === 'string' && sourceId.startsWith('WAID:')) {
            phoneNumber = sourceId.replace('WAID:', '').replace('+', '') || phoneNumber;
          }
          phoneCandidates.push(sourceId);
        }

        // 5. Desde contact_inbox (puede tener identifier del canal)
        if (chat.contact_inbox?.source_id) {
          identifier = chat.contact_inbox.source_id || identifier;
          phoneCandidates.push(chat.contact_inbox.source_id);
        }

        // 6. Desde contact (si include_contact=true)
        if (chat.contact) {
          if (chat.contact.phone_number) {
            phoneNumber = chat.contact.phone_number || phoneNumber;
            phoneCandidates.push(chat.contact.phone_number);
          }
          if (chat.contact.identifier) {
            identifier = chat.contact.identifier || identifier;
            phoneCandidates.push(chat.contact.identifier);
          }
        }

        const normalizedPhone = extractNumericPhone(phoneNumber) || extractNumericPhone(identifier) || phoneCandidates.map(extractNumericPhone).find(Boolean) || null;

        return {
          ...chat,
          // Agregar campos normalizados para facilitar búsqueda
          enriched_phone_number: normalizedPhone,
          enriched_identifier: identifier,
          enriched_phone_raw: phoneNumber,
          enriched_phone_candidates: phoneCandidates.filter(Boolean)
        };
      } catch (error) {
        console.error('Error enriching chat:', chat?.id || 'unknown', error);
        // Devolver el chat sin enriquecer si hay error, o null si no es válido
        if (!chat || typeof chat !== 'object') {
          return null;
        }
        return {
          ...chat,
          enriched_phone_number: null,
          enriched_identifier: null,
          enriched_phone_raw: null,
          enriched_phone_candidates: []
        };
      }
    }).filter(chat => chat !== null); // Filtrar chats nulos
    
    // Filtrar solo conversaciones de WhatsApp
    const whatsappChats = enrichedConversations.filter(chat => {
      try {
      // Verificar si es WhatsApp por diferentes criterios
      const hasWhatsAppSender = chat.last_non_activity_message?.sender?.identifier?.includes('@s.whatsapp.net');
      const hasWhatsAppPhone = chat.last_non_activity_message?.sender?.phone_number;
        const hasWhatsAppSourceId = typeof chat.last_non_activity_message?.source_id === 'string' && 
                                    chat.last_non_activity_message.source_id.includes('WAID:');
        const hasEnrichedPhone = !!chat.enriched_phone_number;
        const hasEnrichedIdentifier = typeof chat.enriched_identifier === 'string' && 
                                     chat.enriched_identifier.includes('@s.whatsapp.net');
        
        return hasWhatsAppSender || hasWhatsAppPhone || hasWhatsAppSourceId || hasEnrichedPhone || hasEnrichedIdentifier;
      } catch (error) {
        console.error('Error filtering chat:', chat.id, error);
        return false;
      }
    });

    console.log(`Found ${conversations.length} total conversations, ${whatsappChats.length} WhatsApp conversations`);
    
    // Si no hay información de paginación de Chatwoot, calcular si hay más basándose en la cantidad recibida
    // Si recibimos exactamente perPage conversaciones, probablemente hay más
    if (!pagination.has_more && conversations.length >= perPage) {
      // Si recibimos el número completo de conversaciones solicitadas, asumimos que puede haber más
      pagination.has_more = true;
      console.log('📊 Calculando has_more basado en cantidad recibida:', {
        received: conversations.length,
        perPage: perPage,
        has_more: pagination.has_more
      });
    }
    
    // Si recibimos menos de perPage, definitivamente no hay más
    if (conversations.length < perPage) {
      pagination.has_more = false;
      console.log('📊 No hay más conversaciones (recibidas < per_page):', {
        received: conversations.length,
        perPage: perPage
      });
    }
    
    // Log de ejemplo de chat enriquecido
    try {
      if (whatsappChats.length > 0) {
        console.log('📱 Ejemplo de chat enriquecido:', {
          id: whatsappChats[0].id,
          enriched_phone: whatsappChats[0].enriched_phone_number,
          enriched_identifier: whatsappChats[0].enriched_identifier,
          enriched_phone_raw: whatsappChats[0].enriched_phone_raw,
          enriched_candidates: whatsappChats[0].enriched_phone_candidates
        });
      }
    } catch (logError) {
      console.error('Error logging enriched chat example:', logError);
    }

    return NextResponse.json({
      success: true,
      data: whatsappChats,
      total: whatsappChats.length,
      totalConversations: conversations.length,
      pagination: pagination,
      filters: {
        label: labelFilter,
        assignee_id: assigneeId,
        status: status
      },
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
