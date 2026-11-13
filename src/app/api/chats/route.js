import { NextResponse } from 'next/server';

// Chatwoot ignora per_page y devuelve como máximo 25 conversaciones por página.
const CHATWOOT_PAGE_SIZE = 25;
// Cuántas páginas de Chatwoot se piden en paralelo por cada "página" de esta API.
const DEFAULT_PAGES_PER_BATCH = 4;
const MAX_PAGES_PER_BATCH = 8;

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

const extractConversations = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data?.payload)) return data.data.payload;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.payload)) return data.payload;
  return [];
};

// Agrega campos normalizados (teléfono, avatar) para facilitar búsqueda y render
const enrichChat = (chat) => {
  try {
    let phoneNumber = null;
    let identifier = null;
    const phoneCandidates = [];

    // 1. Desde meta.sender
    if (chat.meta?.sender) {
      phoneNumber = chat.meta.sender.phone_number || chat.meta.sender.phone || phoneNumber;
      identifier = chat.meta.sender.identifier || chat.meta.sender.id || identifier;
      if (chat.meta.sender.phone_number) phoneCandidates.push(chat.meta.sender.phone_number);
      if (chat.meta.sender.phone) phoneCandidates.push(chat.meta.sender.phone);
    }

    // 2. Desde additional_attributes
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

    // 5. Desde contact_inbox
    if (chat.contact_inbox?.source_id) {
      identifier = chat.contact_inbox.source_id || identifier;
      phoneCandidates.push(chat.contact_inbox.source_id);
    }

    // 6. Desde contact (include_contact=true)
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

    const normalizedPhone = extractNumericPhone(phoneNumber) ||
      extractNumericPhone(identifier) ||
      phoneCandidates.map(extractNumericPhone).find(Boolean) ||
      null;

    return {
      ...chat,
      enriched_phone_number: normalizedPhone,
      enriched_identifier: identifier,
      enriched_phone_raw: phoneNumber,
      enriched_phone_candidates: phoneCandidates.filter(Boolean),
      // Foto de perfil del contacto en Chatwoot (suele venir vacía en WhatsApp Cloud API)
      avatar_url: chat.meta?.sender?.thumbnail || chat.contact?.thumbnail || null,
    };
  } catch (error) {
    console.error('Error enriching chat:', chat?.id, error);
    return {
      ...chat,
      enriched_phone_number: null,
      enriched_identifier: null,
      enriched_phone_raw: null,
      enriched_phone_candidates: [],
      avatar_url: null,
    };
  }
};

const isWhatsAppChat = (chat) => {
  try {
    const lastSender = chat.last_non_activity_message?.sender;
    const sourceId = chat.last_non_activity_message?.source_id;
    return Boolean(
      lastSender?.identifier?.includes('@s.whatsapp.net') ||
      lastSender?.phone_number ||
      (typeof sourceId === 'string' && sourceId.includes('WAID:')) ||
      chat.enriched_phone_number ||
      (typeof chat.enriched_identifier === 'string' && chat.enriched_identifier.includes('@s.whatsapp.net'))
    );
  } catch {
    return false;
  }
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const labelFilter = searchParams.get('label');
    const assigneeId = searchParams.get('assignee_id');
    const status = searchParams.get('status');
    // `page` es el número de tanda: cada tanda agrupa `pages` páginas de Chatwoot
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pagesPerBatch = Math.min(
      MAX_PAGES_PER_BATCH,
      Math.max(1, parseInt(searchParams.get('pages') || String(DEFAULT_PAGES_PER_BATCH), 10) || DEFAULT_PAGES_PER_BATCH)
    );

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

    const baseUrl = chatwootUrl.endsWith('/') ? chatwootUrl.slice(0, -1) : chatwootUrl;
    const filterParams = new URLSearchParams({ include_contact: 'true' });

    if (labelFilter && labelFilter !== 'all') {
      filterParams.append('labels[]', labelFilter);
    }

    if (assigneeId) {
      if (assigneeId === 'unassigned') {
        filterParams.append('assignee_type', 'unassigned');
      } else if (assigneeId !== 'all') {
        filterParams.append('assignee_type', 'assigned');
        filterParams.append('assignee_id', assigneeId);
      }
    }

    if (status && status !== 'all') {
      filterParams.append('status', status);
    }

    const firstChatwootPage = (page - 1) * pagesPerBatch + 1;
    const chatwootPages = Array.from({ length: pagesPerBatch }, (_, i) => firstChatwootPage + i);

    // Pedir todas las páginas de la tanda en paralelo
    const results = await Promise.all(chatwootPages.map(async (chatwootPage) => {
      const url = `${baseUrl}/api/v1/accounts/${accountId}/conversations?${filterParams.toString()}&page=${chatwootPage}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': apiToken,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, errorText, conversations: [] };
      }

      const data = await response.json();
      return { ok: true, conversations: extractConversations(data) };
    }));

    // Si falla la primera página no hay nada útil para mostrar
    if (!results[0].ok) {
      console.error('Chatwoot API Error:', results[0].status, results[0].errorText);
      return NextResponse.json(
        {
          error: 'Error al obtener conversaciones de Chatwoot',
          status: results[0].status,
          message: results[0].errorText
        },
        { status: results[0].status }
      );
    }

    // Quedarse con las páginas consecutivas OK; cortar en la primera que falle o venga incompleta
    const conversations = [];
    const seenIds = new Set();
    let hasMore = false;

    for (const result of results) {
      if (!result.ok) {
        console.error('Chatwoot API Error (página parcial):', result.status, result.errorText);
        hasMore = true; // reintentable con la próxima tanda
        break;
      }

      for (const conversation of result.conversations) {
        if (!seenIds.has(conversation.id)) {
          seenIds.add(conversation.id);
          conversations.push(conversation);
        }
      }

      const pageIsFull = result.conversations.length >= CHATWOOT_PAGE_SIZE;
      hasMore = pageIsFull;
      if (!pageIsFull) break;
    }

    const whatsappChats = conversations.map(enrichChat).filter(isWhatsAppChat);

    return NextResponse.json({
      success: true,
      data: whatsappChats,
      total: whatsappChats.length,
      totalConversations: conversations.length,
      pagination: {
        current_page: page,
        per_page: pagesPerBatch * CHATWOOT_PAGE_SIZE,
        total_pages: null,
        total_count: null,
        has_more: hasMore
      },
      filters: {
        label: labelFilter,
        assignee_id: assigneeId,
        status: status
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
