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

    // Normalizar números buscados
    const normalizedSearchPhones = phoneNumbers
      .map(p => normalizePhoneNumber(p))
      .filter(Boolean);
    
    if (normalizedSearchPhones.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    console.log('🔍 Búsqueda de chats para números:', normalizedSearchPhones);

    const supabase = getSupabase();
    
    // Obtener todos los mensajes de la base de datos
    const { data: allMessages, error: messagesError } = await supabase
      .from('chat_histories')
      .select('*')
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Error al obtener mensajes:', messagesError);
      return NextResponse.json(
        { 
          error: 'Error al buscar chats en la base de datos',
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

    const phonesToFind = new Set(normalizedSearchPhones);
    const foundChats = [];

    // Buscar chats que coincidan con los números buscados
    sessionsMap.forEach((session, sessionId) => {
      const lastMsg = session.messages[0];
      const messageData = lastMsg.message || {};
      
      // Extraer número de teléfono del mensaje
      const phoneNumber = messageData.phone_number || 
                         messageData.from || 
                         messageData.sender?.phone_number ||
                         messageData.contact?.phone_number ||
                         null;
      
      const normalizedPhone = extractNumericPhone(phoneNumber) || extractNumericPhone(sessionId);
      
      if (normalizedPhone) {
        // Verificar coincidencia exacta
        if (phonesToFind.has(normalizedPhone)) {
          if (!foundChats.find(c => c.id === sessionId)) {
            console.log(`✅ Chat encontrado (exacto): ${sessionId} para número ${normalizedPhone}`);
            foundChats.push(createChatObject(session, lastMsg, messageData, normalizedPhone, phoneNumber));
            phonesToFind.delete(normalizedPhone);
          }
        } else {
          // Verificar coincidencia parcial
          const phonesArray = Array.from(phonesToFind);
          for (const searchPhone of phonesArray) {
            // Comparación por últimos dígitos
            const minLength = Math.min(normalizedPhone.length, searchPhone.length);
            if (minLength >= 8) {
              const lastDigits1 = normalizedPhone.slice(-Math.min(10, normalizedPhone.length));
              const lastDigits2 = searchPhone.slice(-Math.min(10, searchPhone.length));
              if (lastDigits1 === lastDigits2) {
                if (!foundChats.find(c => c.id === sessionId)) {
                  console.log(`✅ Chat encontrado (últimos dígitos): ${sessionId} - Chat: ${normalizedPhone} vs Buscado: ${searchPhone}`);
                  foundChats.push(createChatObject(session, lastMsg, messageData, normalizedPhone, phoneNumber));
                  phonesToFind.delete(searchPhone);
                  break;
                }
              }
            }
            
            // Comparación por inclusión
            if (normalizedPhone.includes(searchPhone) || searchPhone.includes(normalizedPhone)) {
              if (!foundChats.find(c => c.id === sessionId)) {
                console.log(`✅ Chat encontrado (inclusión): ${sessionId} - Chat: ${normalizedPhone} vs Buscado: ${searchPhone}`);
                foundChats.push(createChatObject(session, lastMsg, messageData, normalizedPhone, phoneNumber));
                phonesToFind.delete(searchPhone);
                break;
              }
            }
          }
        }
      }
    });

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

// Función auxiliar para crear objeto de chat compatible con el frontend
function createChatObject(session, lastMsg, messageData, normalizedPhone, phoneNumber) {
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
  
  return {
    id: session.session_id,
    session_id: session.session_id,
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
}
