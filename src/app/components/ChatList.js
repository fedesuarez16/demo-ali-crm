'use client';

import React, { useEffect } from 'react';
import { useChats } from '../../hooks/useChats';

const ChatList = ({ onSelectChat, selectedChat, targetPhoneNumber }) => {
  // Obtener chats sin filtrar por agente (mostrar todas las conversaciones)
  const { chats, loading, error, refreshChats } = useChats(null);

  // Función para obtener el nombre del contacto
  const getContactName = (chat) => {
    const sender = chat.last_non_activity_message?.sender;
    const contact = chat.contact;
    
    // Buscar nombre en sender (filtrar nombres genéricos o incorrectos)
    if (sender?.name && 
        sender.name.trim() !== '' && 
        !sender.name.toLowerCase().includes('federico') &&
        !sender.name.toLowerCase().includes('suarez') &&
        sender.name.trim().length > 2) {
      return sender.name.trim();
    }
    
    // Buscar nombre en contact
    if (contact?.name && 
        contact.name.trim() !== '' && 
        !contact.name.toLowerCase().includes('federico') &&
        !contact.name.toLowerCase().includes('suarez') &&
        contact.name.trim().length > 2) {
      return contact.name.trim();
    }
    
    // Buscar en meta.sender
    if (chat.meta?.sender?.name && 
        chat.meta.sender.name.trim() !== '' &&
        chat.meta.sender.name.trim().length > 2) {
      return chat.meta.sender.name.trim();
    }
    
    return null;
  };

  // Función para obtener el número de teléfono del contacto
  const getContactPhone = (chat) => {
    const sender = chat.last_non_activity_message?.sender;
    const contact = chat.contact;
    
    // Priorizar campos enriquecidos
    if (chat.enriched_phone_number) {
      return chat.enriched_phone_number;
    }
    
    if (chat.enriched_phone_raw) {
      return chat.enriched_phone_raw;
    }
    
    // Buscar en sender
    if (sender?.phone_number) {
      return sender.phone_number;
    }
    
    // Buscar en contact
    if (contact?.phone_number) {
      return contact.phone_number;
    }
    
    // Buscar en meta.sender
    if (chat.meta?.sender?.phone_number || chat.meta?.sender?.phone) {
      return chat.meta.sender.phone_number || chat.meta.sender.phone;
    }
    
    // Buscar en additional_attributes
    if (chat.additional_attributes?.phone_number || chat.additional_attributes?.phone) {
      return chat.additional_attributes.phone_number || chat.additional_attributes.phone;
    }
    
    return null;
  };

  // Función para obtener el nombre o número del contacto (para compatibilidad)
  const getContactInfo = (chat) => {
    const name = getContactName(chat);
    const phone = getContactPhone(chat);
    
    // Si hay nombre, mostrar nombre
    if (name) {
      return name;
    }
    
    // Si hay teléfono, mostrar teléfono
    if (phone) {
      return phone;
    }
    
    // Último recurso
    return `Chat ${chat.id}`;
  };

  // Función para extraer el número de teléfono del chat para comparación
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

  // Función para normalizar números de teléfono (más robusta)
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
  
  // Función para comparar números de teléfono (más flexible)
  const comparePhoneNumbers = (phone1, phone2) => {
    if (!phone1 || !phone2) return false;
    
    const normalized1 = normalizePhoneNumber(phone1);
    const normalized2 = normalizePhoneNumber(phone2);
    
    // Comparación exacta
    if (normalized1 === normalized2) return true;
    
    // Comparación por últimos dígitos (útil para números con/sin código de país)
    const minLength = Math.min(normalized1.length, normalized2.length);
    if (minLength >= 8) {
      // Comparar últimos 8-10 dígitos
      const lastDigits1 = normalized1.slice(-Math.min(10, normalized1.length));
      const lastDigits2 = normalized2.slice(-Math.min(10, normalized2.length));
      if (lastDigits1 === lastDigits2) return true;
    }
    
    // Comparación por inclusión (uno contiene al otro)
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return true;
    }
    
    return false;
  };

  // Efecto para buscar automáticamente el chat cuando se proporciona un número objetivo
  useEffect(() => {
    if (targetPhoneNumber && chats.length > 0 && !loading) {
      const normalizedTarget = normalizePhoneNumber(targetPhoneNumber);
      
      console.log('🔍 Buscando chat para número:', targetPhoneNumber);
      console.log('📱 Número normalizado:', normalizedTarget);
      
      if (normalizedTarget) {
        const foundChat = chats.find(chat => {
          const chatPhone = getChatPhoneNumber(chat);
          if (!chatPhone) return false;
          
          // Comparar números normalizados
          const normalizedChatPhone = normalizePhoneNumber(chatPhone);
          
          // Comparación exacta
          if (normalizedChatPhone === normalizedTarget) {
            console.log('✅ Chat encontrado (comparación exacta):', chat.id, 'Número:', chatPhone);
            return true;
          }
          
          // Comparación por últimos dígitos (útil para números con/sin código de país)
          const minLength = Math.min(normalizedChatPhone.length, normalizedTarget.length);
          if (minLength >= 8) {
            const lastDigits1 = normalizedChatPhone.slice(-Math.min(10, normalizedChatPhone.length));
            const lastDigits2 = normalizedTarget.slice(-Math.min(10, normalizedTarget.length));
            if (lastDigits1 === lastDigits2) {
              console.log('✅ Chat encontrado (últimos dígitos):', chat.id, 'Número:', chatPhone);
              return true;
            }
          }
          
          // Comparación por inclusión (uno contiene al otro)
          if (normalizedChatPhone.includes(normalizedTarget) || normalizedTarget.includes(normalizedChatPhone)) {
            console.log('✅ Chat encontrado (inclusión):', chat.id, 'Número:', chatPhone);
            return true;
          }
          
          return false;
        });
        
        if (foundChat && onSelectChat) {
          console.log('🎯 Chat seleccionado:', foundChat.id);
          onSelectChat(foundChat);
        } else {
          console.warn('⚠️ No se encontró chat para el número:', normalizedTarget);
          const availableChats = chats.map(chat => {
            const rawPhone = getChatPhoneNumber(chat);
            return {
              id: chat.id,
              phone: rawPhone,
              normalized: normalizePhoneNumber(rawPhone),
              enriched_phone: chat.enriched_phone_number,
              enriched_identifier: chat.enriched_identifier
            };
          });
          console.log('📋 Chats disponibles:', availableChats);
        }
      }
    }
  }, [targetPhoneNumber, chats, loading, onSelectChat]);

  // Función para obtener el color del estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-gray-100 text-gray-800';
      case 'snoozed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Función para formatear la fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    // Chatwoot puede enviar timestamps en segundos o milisegundos
    const date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando chats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error al cargar los chats</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button 
              onClick={refreshChats}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (chats.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-gray-500 text-lg font-medium">No hay conversaciones</p>
        <p className="text-gray-400 text-sm mt-1">No hay conversaciones de WhatsApp disponibles</p>
        <button 
          onClick={refreshChats}
          className="mt-4 text-sm px-2 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          Actualizar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-full">
      {/* Header con botón de refresh - fijo */}
      <div className="flex-shrink-0 p-3 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Chats de WhatsApp ({chats.length})
            </h2>
            
          </div>
          <button 
            onClick={refreshChats}
            disabled={loading}
            className="px-3 py-2 text-sm bg-white rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            
          </button>
        </div>
      </div>

      {/* Lista de chats - scrolleable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {chats.map((chat) => (
          <div 
            key={chat.id} 
            onClick={() => onSelectChat && onSelectChat(chat)}
            className={`bg-white border-b border-gray-200 rounded-lg py-3 px-3 hover:shadow-sm transition-all cursor-pointer ${
              selectedChat?.id === chat.id 
                ? 'border-gray-100 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Header del chat simplificado */}
            <div className="flex justify-between items-center">
              <div className="flex items-center flex-1 min-w-0">
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  {(() => {
                    const name = getContactName(chat);
                    const phone = getContactPhone(chat);
                    
                    if (name && phone) {
                      // Mostrar nombre y número
                      return (
                        <>
                          <h3 className="font-medium text-gray-900 text-sm truncate">
                            {name}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            {phone}
                          </p>
                        </>
                      );
                    } else if (name) {
                      // Solo nombre
                      return (
                        <h3 className="font-medium text-gray-900 text-sm truncate">
                          {name}
                        </h3>
                      );
                    } else if (phone) {
                      // Solo número
                      return (
                        <h3 className="font-medium text-gray-900 text-sm truncate">
                          {phone}
                        </h3>
                      );
                    } else {
                      // Fallback
                      return (
                        <h3 className="font-medium text-gray-900 text-sm truncate">
                    {getContactInfo(chat)}
                  </h3>
                      );
                    }
                  })()}
                </div>
              </div>
              
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${getStatusColor(chat.status)}`}>
                {chat.status}
              </span>
            </div>

            {/* Último mensaje y fecha simplificados */}
            <div className="mt-1 flex justify-between items-center">
              <div className="text-xs text-gray-500 truncate max-w-[200px]">
                {chat.last_non_activity_message?.content || "No hay mensajes"}
              </div>
              
              {chat.created_at && (
                <div className="text-xs text-gray-400">
                  {formatDate(chat.created_at.Date)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatList;
