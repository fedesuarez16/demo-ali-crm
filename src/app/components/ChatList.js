'use client';

import React, { useEffect, useState } from 'react';
import { useChats } from '../../hooks/useChats';
import { getAllLeads, updateLead } from '../services/leadService';

const ChatList = ({ onSelectChat, selectedChat, targetPhoneNumber }) => {
  // Obtener chats sin filtrar por agente (mostrar todas las conversaciones)
  const { chats, loading, loadingMore, error, refreshChats, loadMoreChats, pagination } = useChats(null);
  
  // Estado para almacenar los leads y su relación con los chats
  const [leadsMap, setLeadsMap] = useState({});
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  
  // Estado para la búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estado para rastrear qué chats han sido leídos (usando localStorage para persistencia)
  // Guardamos el timestamp del último mensaje visto para detectar nuevos mensajes
  const [readChats, setReadChats] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('readChats');
      return stored ? JSON.parse(stored) : {};
    }
    return {};
  });
  
  // Guardar en localStorage cuando cambie readChats
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('readChats', JSON.stringify(readChats));
    }
  }, [readChats]);
  
  // Obtener el timestamp del último mensaje de un chat
  const getLastMessageTimestamp = (chat) => {
    if (chat.last_non_activity_message?.created_at) {
      const timestamp = chat.last_non_activity_message.created_at;
      // Chatwoot puede enviar timestamps en segundos o milisegundos
      return timestamp > 1000000000000 ? timestamp : timestamp * 1000;
    }
    if (chat.updated_at) {
      const timestamp = chat.updated_at;
      return timestamp > 1000000000000 ? timestamp : timestamp * 1000;
    }
    if (chat.created_at?.Date) {
      const timestamp = chat.created_at.Date;
      return timestamp > 1000000000000 ? timestamp : timestamp * 1000;
    }
    return 0;
  };
  
  // Marcar un chat como leído (guardamos el timestamp del último mensaje visto)
  const markAsRead = (chatId, lastMessageTimestamp = null) => {
    setReadChats(prev => {
      const chat = chats.find(c => c.id === chatId);
      const timestamp = lastMessageTimestamp || getLastMessageTimestamp(chat);
      return {
        ...prev,
        [chatId]: {
          read: true,
          lastSeenTimestamp: timestamp
        }
      };
    });
  };
  
  // Marcar un chat como no leído
  const markAsUnread = (chatId) => {
    setReadChats(prev => {
      const newRead = { ...prev };
      delete newRead[chatId];
      return newRead;
    });
  };
  
  // Verificar si un chat está leído y si tiene nuevos mensajes
  const isChatRead = (chat) => {
    const chatReadData = readChats[chat.id];
    
    // Si no hay datos de lectura, el chat no está leído
    if (!chatReadData) {
      return false;
    }
    
    // Si es un objeto con timestamp, comparar con el último mensaje
    if (chatReadData.lastSeenTimestamp) {
      const lastMessageTimestamp = getLastMessageTimestamp(chat);
      // Si el último mensaje es más reciente que el último visto, hay nuevos mensajes
      if (lastMessageTimestamp > chatReadData.lastSeenTimestamp) {
        return false; // Hay nuevos mensajes, no está leído
      }
      return true; // No hay nuevos mensajes, está leído
    }
    
    // Compatibilidad con formato antiguo (solo boolean)
    return chatReadData === true || chatReadData.read === true;
  };
  
  // Manejar selección de chat y marcarlo como leído
  const handleChatSelect = (chat) => {
    if (onSelectChat) {
      onSelectChat(chat);
    }
    // Marcar como leído cuando se selecciona, guardando el timestamp del último mensaje
    const lastMessageTimestamp = getLastMessageTimestamp(chat);
    markAsRead(chat.id, lastMessageTimestamp);
  };
  
  // Efecto para marcar el chat seleccionado como leído cuando se abre
  useEffect(() => {
    if (selectedChat?.id) {
      const lastMessageTimestamp = getLastMessageTimestamp(selectedChat);
      markAsRead(selectedChat.id, lastMessageTimestamp);
    }
  }, [selectedChat?.id]);
  
  // Efecto para detectar nuevos mensajes automáticamente
  useEffect(() => {
    chats.forEach(chat => {
      const chatReadData = readChats[chat.id];
      
      // Si el chat ya está marcado como leído con timestamp
      if (chatReadData && chatReadData.lastSeenTimestamp) {
        const lastMessageTimestamp = getLastMessageTimestamp(chat);
        // Si hay un mensaje más reciente, marcar como no leído automáticamente
        if (lastMessageTimestamp > chatReadData.lastSeenTimestamp) {
          // No marcar automáticamente, solo detectar (el usuario debe abrir el chat)
          // Esto permite que el indicador de "no leído" aparezca
        }
      }
    });
  }, [chats, readChats]);

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

  // Cargar leads y crear un mapa de teléfono -> lead
  useEffect(() => {
    const loadLeads = async () => {
      if (chats.length === 0) return;
      
      setIsLoadingLeads(true);
      try {
        const allLeads = await getAllLeads();
        
        // Crear un mapa de número de teléfono normalizado -> lead
        const leadsByPhone = {};
        
        allLeads.forEach(lead => {
          const phone = lead.telefono || lead.whatsapp_id || '';
          if (phone) {
            const normalizedPhone = normalizePhoneNumber(phone);
            if (normalizedPhone) {
              // Si ya existe un lead para este teléfono, mantener el primero
              if (!leadsByPhone[normalizedPhone]) {
                leadsByPhone[normalizedPhone] = lead;
              }
            }
          }
        });
        
        setLeadsMap(leadsByPhone);
      } catch (error) {
        console.error('Error loading leads:', error);
      } finally {
        setIsLoadingLeads(false);
      }
    };
    
    loadLeads();
  }, [chats]);
  
  // Función para obtener el lead asociado a un chat
  const getLeadForChat = (chat) => {
    const chatPhone = getChatPhoneNumber(chat);
    if (!chatPhone) return null;
    
    const normalizedChatPhone = normalizePhoneNumber(chatPhone);
    return leadsMap[normalizedChatPhone] || null;
  };
  
  // Función para filtrar chats basado en la búsqueda
  const filterChats = (chatsList) => {
    if (!searchQuery.trim()) {
      return chatsList;
    }
    
    const query = searchQuery.toLowerCase().trim();
    
    return chatsList.filter(chat => {
      // Buscar en nombre del contacto
      const name = getContactName(chat);
      if (name && name.toLowerCase().includes(query)) {
        return true;
      }
      
      // Buscar en número de teléfono
      const phone = getContactPhone(chat);
      if (phone && phone.toLowerCase().includes(query)) {
        return true;
      }
      
      // Buscar en propiedad_interes del lead asociado
      const lead = getLeadForChat(chat);
      if (lead?.propiedad_interes && lead.propiedad_interes.toLowerCase().includes(query)) {
        return true;
      }
      
      // Buscar en contenido del último mensaje
      const lastMessage = chat.last_non_activity_message?.content;
      if (lastMessage && lastMessage.toLowerCase().includes(query)) {
        return true;
      }
      
      return false;
    });
  };
  
  // Componente de menú desplegable con acciones del chat
  const ChatActionsMenu = ({ chat, lead, isRead, markAsRead, markAsUnread, leadsMap, setLeadsMap }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditingPropiedad, setIsEditingPropiedad] = useState(false);
    const [editValue, setEditValue] = useState(lead?.propiedad_interes || '');
    const [isSaving, setIsSaving] = useState(false);
    
    // Cerrar menú al hacer clic fuera
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (isMenuOpen && !event.target.closest('.chat-actions-menu')) {
          setIsMenuOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);
    
    const handleSavePropiedad = async () => {
      if (!lead) return;
      
      setIsSaving(true);
      try {
        const updatedLead = await updateLead(lead.id, { propiedad_interes: editValue || null });
        if (updatedLead) {
          const phone = lead.telefono || lead.whatsapp_id || '';
          if (phone) {
            const normalizedPhone = normalizePhoneNumber(phone);
            if (normalizedPhone) {
              setLeadsMap(prev => ({
                ...prev,
                [normalizedPhone]: updatedLead
              }));
            }
          }
          setIsEditingPropiedad(false);
          setIsMenuOpen(false);
        }
      } catch (error) {
        console.error('Error updating propiedad_interes:', error);
        alert('Error al actualizar la propiedad de interés');
      } finally {
        setIsSaving(false);
      }
    };
    
    const handleToggleRead = () => {
      if (isRead) {
        markAsUnread();
      } else {
        markAsRead();
      }
      setIsMenuOpen(false);
    };
    
    if (isEditingPropiedad) {
      return (
        <div className="flex items-center gap-1 chat-actions-menu">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSavePropiedad();
              } else if (e.key === 'Escape') {
                setEditValue(lead?.propiedad_interes || '');
                setIsEditingPropiedad(false);
              }
            }}
            className="px-1.5 py-0.5 text-[10px] border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 w-24"
            autoFocus
            disabled={isSaving}
          />
          <button
            onClick={handleSavePropiedad}
            disabled={isSaving}
            className="p-0.5 text-green-900 hover:text-green-700 disabled:opacity-50"
            title="Guardar"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={() => {
              setEditValue(lead?.propiedad_interes || '');
              setIsEditingPropiedad(false);
            }}
            disabled={isSaving}
            className="p-0.5 text-red-600 hover:text-red-700 disabled:opacity-50"
            title="Cancelar"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      );
    }
    
    return (
      <div className="relative chat-actions-menu">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
          title="Opciones del chat"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
        
        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-30 py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleRead();
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              {isRead ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Marcar como no leído
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Marcar como leído
                </>
              )}
            </button>
            
            {lead && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingPropiedad(true);
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {lead.propiedad_interes ? 'Editar propiedad' : 'Agregar propiedad'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };
  
  // Componente para etiqueta editable de propiedad_interes (mantenido para compatibilidad pero ahora se usa en el menú)
  const EditablePropiedadInteres = ({ lead, chat, leadsMap, setLeadsMap }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(lead?.propiedad_interes || '');
    const [isSaving, setIsSaving] = useState(false);
    
    const handleSave = async () => {
      if (!lead) return;
      
      setIsSaving(true);
      try {
        const updatedLead = await updateLead(lead.id, { propiedad_interes: editValue || null });
        if (updatedLead) {
          // Actualizar el mapa de leads
          const phone = lead.telefono || lead.whatsapp_id || '';
          if (phone) {
            const normalizedPhone = normalizePhoneNumber(phone);
            if (normalizedPhone) {
              setLeadsMap(prev => ({
                ...prev,
                [normalizedPhone]: updatedLead
              }));
            }
          }
          setIsEditing(false);
        }
      } catch (error) {
        console.error('Error updating propiedad_interes:', error);
        alert('Error al actualizar la propiedad de interés');
      } finally {
        setIsSaving(false);
      }
    };
    
    const handleCancel = () => {
      setEditValue(lead?.propiedad_interes || '');
      setIsEditing(false);
    };
    
    if (!lead) return null;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              } else if (e.key === 'Escape') {
                handleCancel();
              }
            }}
            className="px-1.5 py-0.5 text-[10px] border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 w-24"
            autoFocus
            disabled={isSaving}
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-0.5 text-green-900 hover:text-green-700 disabled:opacity-50"
            title="Guardar"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="p-0.5 text-red-600 hover:text-red-700 disabled:opacity-50"
            title="Cancelar"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1">
        {lead.propiedad_interes ? (
          <span 
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 border border-purple-200 cursor-pointer hover:bg-purple-200 transition-colors max-w-[80px] truncate"
            onClick={() => setIsEditing(true)}
            title={lead.propiedad_interes}
          >
            <svg className="w-2.5 h-2.5 mr-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="truncate">{lead.propiedad_interes}</span>
          </span>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="p-0.5 text-gray-400 hover:text-purple-600 rounded hover:bg-purple-50 transition-colors"
            title="Agregar propiedad de interés"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>
    );
  };
  
  // Componente para mostrar seguimientos_count
  const SeguimientosCount = ({ lead }) => {
    if (!lead) return null;
    
    const count = lead.seguimientos_count || 0;
    
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 border border-blue-200">
        <svg className="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {count}
      </span>
    );
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
  
  // Chats filtrados (definir antes de los early returns)
  const filteredChats = filterChats(chats);

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
      {/* Header con búsqueda y botón de refresh - fijo */}
      <div className="flex-shrink-0 p-3 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Chats de WhatsApp ({searchQuery ? filteredChats.length : chats.length})
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
        
        {/* Barra de búsqueda */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono, propiedad..."
            className="w-full px-3 py-2 pl-9 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <svg 
            className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
              title="Limpiar búsqueda"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Lista de chats - scrolleable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredChats.length === 0 && searchQuery ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-500 text-sm">No se encontraron chats</p>
            <p className="text-gray-400 text-xs mt-1">Intenta con otros términos de búsqueda</p>
          </div>
        ) : (
          filteredChats.map((chat) => {
          const isRead = isChatRead(chat);
          const isSelected = selectedChat?.id === chat.id;
          
          return (
          <div 
            key={chat.id} 
              onClick={() => handleChatSelect(chat)}
              onContextMenu={(e) => {
                e.preventDefault();
                // Toggle read/unread con clic derecho
                if (isRead) {
                  markAsUnread(chat.id);
                } else {
                  markAsRead(chat.id);
                }
              }}
              className={`bg-white border-b border-gray-200 rounded-lg py-3 px-3 hover:shadow-sm transition-all cursor-pointer relative group ${
                isSelected 
                  ? 'border-gray-100 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
              } ${!isRead ? 'bg-blue-50/30' : ''}`}
          >
              {/* Indicador de no leído - Punto azul en la esquina superior derecha */}
              {!isRead && (
                <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-500 rounded-full z-10"></div>
              )}
              
            {/* Header del chat simplificado */}
            <div className="flex justify-between items-center">
                <div className="flex items-center flex-1 min-w-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 ${
                    !isRead ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
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
              
              {/* Etiquetas y menú desplegable en la esquina derecha */}
              <div className="flex items-center gap-1">
                {(() => {
                  const lead = getLeadForChat(chat);
                  return (
                    <>
                      <SeguimientosCount lead={lead} />
                      <EditablePropiedadInteres lead={lead} />
                      <ChatActionsMenu 
                        chat={chat} 
                        lead={lead} 
                        isRead={isRead}
                        markAsRead={() => markAsRead(chat.id, getLastMessageTimestamp(chat))}
                        markAsUnread={() => markAsUnread(chat.id)}
                        leadsMap={leadsMap}
                        setLeadsMap={setLeadsMap}
                      />
                    </>
                  );
                })()}
              </div>
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
          );
        })
        )}
        
        {/* Botón "Cargar más" - Solo mostrar si no hay búsqueda activa */}
        {!searchQuery && pagination && pagination.has_more && (
          <div className="flex justify-center py-4">
            <button
              onClick={loadMoreChats}
              disabled={loadingMore}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingMore ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Cargando...</span>
                </>
              ) : (
                <>
                  <span>Cargar más</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Debug info - remover en producción */}
        {process.env.NODE_ENV === 'development' && pagination && (
          <div className="text-xs text-gray-400 px-4 pb-2">
            Página {pagination.current_page} de {pagination.total_pages || '?'} | 
            {pagination.has_more ? ' Hay más' : ' No hay más'} | 
            Total: {chats.length} chats
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
