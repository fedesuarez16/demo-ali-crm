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

// Función para obtener número de teléfono de un chat
const getChatPhoneNumber = (chat) => {
  // 1. PRIMERO: Usar campos enriquecidos de la API si existen
  if (chat.enriched_phone_number) {
    return chat.enriched_phone_number;
  }

  if (chat.enriched_identifier) {
    return chat.enriched_identifier;
  }

  if (chat.enriched_phone_raw) {
    return chat.enriched_phone_raw;
  }

  if (Array.isArray(chat.enriched_phone_candidates)) {
    const candidate = chat.enriched_phone_candidates.find(Boolean);
    if (candidate) return candidate;
  }

  // 2. Intentar múltiples fuentes de datos (fallback)
  const sender = chat.last_non_activity_message?.sender;
  const contact = chat.contact;
  
  // 3. Buscar en sender phone_number
  if (sender?.phone_number) {
    return sender.phone_number;
  }
  
  // 4. Buscar en sender identifier (puede ser JID)
  if (sender?.identifier) {
    return sender.identifier;
  }
  
  // 5. Buscar en contact phone_number
  if (contact?.phone_number) {
    return contact.phone_number;
  }
  
  // 6. Buscar en contact identifier
  if (contact?.identifier) {
    return contact.identifier;
  }
  
  // 7. Buscar en meta.sender (Chatwoot puede guardar info aquí)
  if (chat.meta?.sender?.phone_number || chat.meta?.sender?.phone) {
    return chat.meta.sender.phone_number || chat.meta.sender.phone;
  }

  if (chat.meta?.sender?.identifier) {
    return chat.meta.sender.identifier;
  }

  // 8. Buscar en additional_attributes
  if (chat.additional_attributes?.phone_number || chat.additional_attributes?.phone) {
    return chat.additional_attributes.phone_number || chat.additional_attributes.phone;
  }

  if (chat.additional_attributes?.wa_id) {
    return chat.additional_attributes.wa_id;
  }

  // 9. Buscar en source_id (formato WAID:numero)
  if (chat.last_non_activity_message?.source_id) {
    return chat.last_non_activity_message.source_id;
  }

  // 10. Buscar en contact_inbox
  if (chat.contact_inbox?.source_id) {
    return chat.contact_inbox.source_id;
  }
  
  return null;
};

// Función para normalizar números de teléfono
const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remover @s.whatsapp.net si existe
  let normalized = phone.replace('@s.whatsapp.net', '');
  
  // Remover prefijos comunes
  normalized = normalized.replace(/^WAID:/, '');
  normalized = normalized.replace(/^whatsapp:/, '');
  
  // Remover todo lo que no sean números y el símbolo +
  normalized = normalized.replace(/[^\d+]/g, '');
  
  // Remover + al inicio para comparación consistente
  normalized = normalized.replace(/^\+/, '');
  
  return normalized;
};

export async function POST(request) {
  try {
    const { phoneNumbers } = await request.json();
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de números de teléfono' },
        { status: 400 }
      );
    }

    // Validar variables de entorno
    const chatwootUrl = process.env.CHATWOOT_URL;
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    const apiToken = process.env.CHATWOOT_API_TOKEN;

    if (!chatwootUrl || !accountId || !apiToken) {
      return NextResponse.json(
        { 
          error: 'Variables de entorno de Chatwoot no configuradas',
        }, 
        { status: 500 }
      );
    }

    // Normalizar números buscados
    const normalizedSearchPhones = phoneNumbers
      .map(p => normalizePhoneNumber(p))
      .filter(Boolean);
    
    if (normalizedSearchPhones.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    console.log('🔍 Búsqueda exhaustiva de chats para números:', normalizedSearchPhones);

    const baseUrl = chatwootUrl.endsWith('/') ? chatwootUrl.slice(0, -1) : chatwootUrl;
    const foundChats = [];
    const maxPages = 100; // Buscar hasta 100 páginas (5000 chats)
    const phonesToFind = new Set(normalizedSearchPhones);

    // Buscar en todas las páginas hasta encontrar todos los números o alcanzar el límite
    for (let page = 1; page <= maxPages && phonesToFind.size > 0; page++) {
      const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations?include_contact=true&page=${page}&per_page=50`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': apiToken,
        },
      });

      if (!response.ok) {
        console.warn(`⚠️ Error en página ${page}:`, response.status);
        break;
      }

      const data = await response.json();
      const conversations = data.payload || data.data || [];
      
      if (conversations.length === 0) {
        console.log(`📄 No hay más datos en página ${page}`);
        break;
      }

      console.log(`📄 Página ${page}: ${conversations.length} conversaciones`);

      // Filtrar solo conversaciones de WhatsApp
      const whatsappChats = conversations.filter(chat => {
        const inbox = chat.inbox || chat.meta?.inbox;
        return inbox?.channel_type === 'api' || inbox?.channel_type === 'whatsapp';
      });

      // Enriquecer conversaciones con información de contacto
      const enrichedChats = whatsappChats.map(chat => {
        try {
          let phoneNumber = null;
          let identifier = null;
          const phoneCandidates = [];

          // 1. Desde meta.sender
          if (chat.meta?.sender?.phone_number || chat.meta?.sender?.phone) {
            phoneNumber = chat.meta.sender.phone_number || chat.meta.sender.phone;
            phoneCandidates.push(phoneNumber);
          }

          if (chat.meta?.sender?.identifier) {
            identifier = chat.meta.sender.identifier;
            phoneCandidates.push(identifier);
          }

          // 2. Desde additional_attributes
          if (chat.additional_attributes?.phone_number || chat.additional_attributes?.phone) {
            phoneNumber = chat.additional_attributes.phone_number || chat.additional_attributes.phone || phoneNumber;
            phoneCandidates.push(phoneNumber);
          }

          if (chat.additional_attributes?.wa_id) {
            phoneCandidates.push(chat.additional_attributes.wa_id);
          }

          // 3. Desde last_non_activity_message.sender
          if (chat.last_non_activity_message?.sender) {
            if (chat.last_non_activity_message.sender.phone_number) {
              phoneNumber = chat.last_non_activity_message.sender.phone_number || phoneNumber;
              phoneCandidates.push(phoneNumber);
            }
            if (chat.last_non_activity_message.sender.identifier) {
              identifier = chat.last_non_activity_message.sender.identifier || identifier;
              phoneCandidates.push(identifier);
            }
          }

          // 4. Desde source_id
          if (chat.last_non_activity_message?.source_id) {
            const sourceId = chat.last_non_activity_message.source_id;
            if (typeof sourceId === 'string' && sourceId.startsWith('WAID:')) {
              phoneNumber = sourceId.replace('WAID:', '').replace('+', '') || phoneNumber;
            }
            phoneCandidates.push(sourceId);
          }

          // 5. Desde contact_inbox
          if (chat.contact_inbox?.source_id) {
            identifier = chat.contact_inbox.source_id || identifier;
            phoneCandidates.push(identifier);
          }

          // 6. Desde contact
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
            enriched_phone_number: normalizedPhone,
            enriched_identifier: identifier,
            enriched_phone_raw: phoneNumber,
            enriched_phone_candidates: phoneCandidates.filter(Boolean)
          };
        } catch (error) {
          console.error('Error enriching chat:', chat.id, error);
          return {
            ...chat,
            enriched_phone_number: null,
            enriched_identifier: null,
            enriched_phone_raw: null,
            enriched_phone_candidates: []
          };
        }
      });

      // Buscar chats que coincidan con los números buscados
      enrichedChats.forEach(chat => {
        const chatPhone = getChatPhoneNumber(chat);
        if (chatPhone) {
          const normalizedChatPhone = normalizePhoneNumber(chatPhone);
          
          // Verificar coincidencia exacta
          if (phonesToFind.has(normalizedChatPhone)) {
            if (!foundChats.find(c => c.id === chat.id)) {
              console.log(`✅ Chat encontrado (exacto): ${chat.id} para número ${normalizedChatPhone}`);
              foundChats.push(chat);
              phonesToFind.delete(normalizedChatPhone);
            }
          } else {
            // Verificar coincidencia parcial
            const phonesArray = Array.from(phonesToFind);
            for (const searchPhone of phonesArray) {
              // Comparación por últimos dígitos
              const minLength = Math.min(normalizedChatPhone.length, searchPhone.length);
              if (minLength >= 8) {
                const lastDigits1 = normalizedChatPhone.slice(-Math.min(10, normalizedChatPhone.length));
                const lastDigits2 = searchPhone.slice(-Math.min(10, searchPhone.length));
                if (lastDigits1 === lastDigits2) {
                  if (!foundChats.find(c => c.id === chat.id)) {
                    console.log(`✅ Chat encontrado (últimos dígitos): ${chat.id} - Chat: ${normalizedChatPhone} vs Buscado: ${searchPhone}`);
                    foundChats.push(chat);
                    phonesToFind.delete(searchPhone);
                    break;
                  }
                }
              }
              
              // Comparación por inclusión
              if (normalizedChatPhone.includes(searchPhone) || searchPhone.includes(normalizedChatPhone)) {
                if (!foundChats.find(c => c.id === chat.id)) {
                  console.log(`✅ Chat encontrado (inclusión): ${chat.id} - Chat: ${normalizedChatPhone} vs Buscado: ${searchPhone}`);
                  foundChats.push(chat);
                  phonesToFind.delete(searchPhone);
                  break;
                }
              }
            }
          }
        }
      });

      // Si encontramos todos los números, salir
      if (phonesToFind.size === 0) {
        console.log('✅ Todos los números fueron encontrados');
        break;
      }

      // Si recibimos menos de 50 conversaciones, no hay más páginas
      if (conversations.length < 50) {
        console.log(`📄 No hay más páginas (recibidos ${conversations.length} < 50)`);
        break;
      }
    }

    console.log(`🎯 Total de chats encontrados: ${foundChats.length}`);
    if (phonesToFind.size > 0) {
      console.log(`⚠️ Números no encontrados:`, Array.from(phonesToFind));
    }

    return NextResponse.json({
      success: true,
      data: foundChats,
      total: foundChats.length
    });

  } catch (error) {
    console.error('❌ Error en búsqueda de chats:', error);
    return NextResponse.json(
      { error: 'Error al buscar chats', message: error.message },
      { status: 500 }
    );
  }
}
