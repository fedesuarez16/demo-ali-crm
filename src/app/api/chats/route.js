import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars missing. Define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};

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
    
    const supabase = getSupabase();
    
    // Obtener todos los mensajes agrupados por session_id
    // Primero obtenemos los últimos mensajes de cada sesión
    const { data: allMessages, error: messagesError } = await supabase
      .from('chat_histories')
      .select('*')
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Error al obtener mensajes:', messagesError);
      return NextResponse.json(
        { 
          error: 'Error al obtener chats de la base de datos',
          message: messagesError.message
        }, 
        { status: 500 }
      );
    }

    // Agrupar mensajes por session_id y obtener el último mensaje de cada sesión
    const sessionsMap = new Map();
    
    (allMessages || []).forEach(msg => {
      const sessionId = msg.session_id;
      if (!sessionsMap.has(sessionId)) {
        sessionsMap.set(sessionId, {
          id: sessionId,
          session_id: sessionId,
          last_message: msg,
          messages: []
        });
      }
      sessionsMap.get(sessionId).messages.push(msg);
    });

    // Convertir a array y ordenar por fecha del último mensaje
    let conversations = Array.from(sessionsMap.values())
      .map(session => {
        const lastMsg = session.messages[0]; // Ya están ordenados por created_at desc
        const messageData = lastMsg.message || {};
        const sid = session.session_id;
        
        // Extraer información del mensaje JSONB
        const phoneNumber = messageData.phone_number || 
                           messageData.from || 
                           messageData.sender?.phone_number ||
                           messageData.contact?.phone_number ||
                           null;
        
        const normalizedPhone = extractNumericPhone(phoneNumber) || extractNumericPhone(sid);
        
        // DETECTAR SI ES MENSAJE DEL SISTEMA/AGENTE O DEL CLIENTE
        const kind = messageData.type; // 'ai' | 'human' (formato n8n)
        const role = messageData.role || messageData.role_type;
        const direction = messageData.direction;
        const messageType = messageData.message_type;
        
        let isOutgoing = false;
        if (kind === 'ai') {
          isOutgoing = true;
        } else if (kind === 'human') {
          isOutgoing = false;
        } else if (messageType !== undefined && messageType !== null) {
          isOutgoing = messageType === 1;
        } else if (direction) {
          isOutgoing = direction === 'outbound' || direction === 'out';
        } else if (role) {
          isOutgoing = role === 'assistant' || role === 'ai' || role === 'system';
        } else {
          isOutgoing = false; // Por defecto, asumir que es del cliente
        }
        
        const finalMessageType = isOutgoing ? 1 : 0;
        
        // Construir objeto compatible con el frontend
        return {
          id: sid,
          session_id: sid,
          status: messageData.status || 'open',
          last_non_activity_message: {
            id: lastMsg.id,
            content: messageData.content || messageData.text || '',
            created_at: lastMsg.created_at,
            message_type: finalMessageType,
            sender: {
              phone_number: phoneNumber,
              identifier: messageData.from || phoneNumber
            },
            source_id: messageData.source_id || messageData.from
          },
          enriched_phone_number: normalizedPhone,
          enriched_identifier: phoneNumber,
          enriched_phone_raw: phoneNumber,
          enriched_phone_candidates: phoneNumber ? [phoneNumber] : [],
          created_at: session.messages[session.messages.length - 1]?.created_at,
          updated_at: lastMsg.created_at,
          meta: {
            sender: {
              phone_number: phoneNumber,
              identifier: messageData.from || phoneNumber
            }
          },
          additional_attributes: {
            phone_number: phoneNumber,
            phone: phoneNumber
          },
          contact: {
            phone_number: phoneNumber,
            identifier: messageData.from || phoneNumber
          }
        };
      })
      .sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0);
        const dateB = new Date(b.updated_at || b.created_at || 0);
        return dateB - dateA;
      });

    // Aplicar filtros si existen
    if (status && status !== 'all') {
      conversations = conversations.filter(chat => chat.status === status);
    }

    // Aplicar paginación
    const totalCount = conversations.length;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedConversations = conversations.slice(startIndex, endIndex);

    const pagination = {
      current_page: page,
      per_page: perPage,
      total_pages: Math.ceil(totalCount / perPage),
      total_count: totalCount,
      has_more: endIndex < totalCount
    };

    console.log(`Found ${totalCount} total conversations, showing ${paginatedConversations.length} in page ${page}`);

    return NextResponse.json({
      success: true,
      data: paginatedConversations,
      total: paginatedConversations.length,
      totalConversations: totalCount,
      pagination: pagination,
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
