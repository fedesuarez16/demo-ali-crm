import { NextResponse } from 'next/server';

// Función para normalizar números de teléfono
const normalizePhoneNumber = (phone) => {
  if (!phone) return '';

  // Remover @s.whatsapp.net si existe
  let normalized = phone.replace('@s.whatsapp.net', '');

  // Remover prefijos comunes
  normalized = normalized.replace(/^WAID:/i, '');
  normalized = normalized.replace(/^whatsapp:/i, '');

  // Remover todo lo que no sean números y el símbolo +
  normalized = normalized.replace(/[^\d+]/g, '');

  // Remover + al inicio para comparación consistente
  normalized = normalized.replace(/^\+/, '');

  return normalized;
};

// Convención del proyecto: comparar por los últimos 10 dígitos
const last10 = (digits) => digits.slice(-10);

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

    const baseUrl = chatwootUrl.endsWith('/') ? chatwootUrl.slice(0, -1) : chatwootUrl;
    const headers = {
      'Content-Type': 'application/json',
      'api_access_token': apiToken,
    };

    const foundChats = [];
    const seenConversationIds = new Set();
    const notFound = [];

    for (const rawPhone of phoneNumbers) {
      const normalized = normalizePhoneNumber(rawPhone);
      if (!normalized) continue;

      const target = last10(normalized);
      console.log('🔍 Buscando contacto en Chatwoot para número:', normalized);

      // 1. Buscar el contacto por número. contacts/search matchea phone_number
      //    e identifier, así que cubre formatos JID/WAID. Se reintenta con los
      //    últimos 10 dígitos por si el contacto está guardado sin código de país.
      let matchingContacts = [];
      for (const query of [normalized, target]) {
        const searchRes = await fetch(
          `${baseUrl}/api/v1/accounts/${accountId}/contacts/search?q=${encodeURIComponent(query)}`,
          { headers }
        );

        if (!searchRes.ok) {
          console.warn('⚠️ Error buscando contacto:', searchRes.status);
          continue;
        }

        const searchData = await searchRes.json();
        matchingContacts = (searchData.payload || []).filter(contact => {
          const candidates = [contact.phone_number, contact.identifier]
            .filter(Boolean)
            .map(normalizePhoneNumber);
          return candidates.some(candidate => candidate && last10(candidate) === target);
        });

        if (matchingContacts.length > 0) break;
      }

      if (matchingContacts.length === 0) {
        console.warn('⚠️ Ningún contacto en Chatwoot coincide con:', normalized);
        notFound.push(normalized);
        continue;
      }

      // 2. Traer las conversaciones de cada contacto que coincide (puede haber
      //    contactos duplicados para el mismo número)
      let foundAnyConversation = false;
      for (const contact of matchingContacts) {
        const convRes = await fetch(
          `${baseUrl}/api/v1/accounts/${accountId}/contacts/${contact.id}/conversations`,
          { headers }
        );

        if (!convRes.ok) {
          console.warn(`⚠️ Error obteniendo conversaciones del contacto ${contact.id}:`, convRes.status);
          continue;
        }

        const convData = await convRes.json();
        const conversations = convData.payload || [];

        for (const conversation of conversations) {
          if (seenConversationIds.has(conversation.id)) continue;
          seenConversationIds.add(conversation.id);
          foundAnyConversation = true;

          console.log(`✅ Conversación ${conversation.id} encontrada para ${normalized} (contacto ${contact.id})`);
          foundChats.push({
            ...conversation,
            enriched_phone_number: normalizePhoneNumber(contact.phone_number || contact.identifier || '') || null,
            enriched_identifier: contact.identifier || null,
            enriched_phone_raw: contact.phone_number || null,
            enriched_phone_candidates: [contact.phone_number, contact.identifier].filter(Boolean),
          });
        }
      }

      if (!foundAnyConversation) {
        console.warn('⚠️ Contacto existe pero sin conversaciones para:', normalized);
        notFound.push(normalized);
      }
    }

    // Más reciente primero — el cliente selecciona data[0]
    foundChats.sort((a, b) =>
      (b.last_activity_at || b.timestamp || 0) - (a.last_activity_at || a.timestamp || 0)
    );

    console.log(`🎯 Total de chats encontrados: ${foundChats.length}`);
    if (notFound.length > 0) {
      console.log('⚠️ Números sin conversación en Chatwoot:', notFound);
    }

    return NextResponse.json({
      success: true,
      data: foundChats,
      total: foundChats.length,
    });

  } catch (error) {
    console.error('❌ Error en búsqueda de chats:', error);
    return NextResponse.json(
      { error: 'Error al buscar chats', message: error.message },
      { status: 500 }
    );
  }
}
