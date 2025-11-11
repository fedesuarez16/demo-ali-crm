'use client';

import React, { useEffect } from 'react';
import { useChats } from '../../hooks/useChats';
import { useAgents } from '../../hooks/useAgents';

const ChatList = ({ onSelectChat, selectedChat, targetPhoneNumber }) => {
  // Obtener lista de agentes primero
  const { agents, loading: loadingAgents } = useAgents();
  
  // Buscar el ID de Federico Suarez
  const federicoAgent = agents.find(agent => 
    agent.name?.toLowerCase().includes('federico') && 
    agent.name?.toLowerCase().includes('suarez')
  );
  
  // Obtener chats con filtro por defecto para Federico Suarez
  const { chats, loading, error, refreshChats } = useChats(federicoAgent?.id);

  // Función para obtener el nombre o número del contacto
  const getContactInfo = (chat) => {
    // Intentar obtener el número de teléfono directamente
    const sender = chat.last_non_activity_message?.sender;
    
    // Priorizar el número de teléfono sobre el nombre para evitar nombres incorrectos
    if (sender?.phone_number) {
      return sender.phone_number;
    }
    
    // Solo usar el nombre si parece ser real (no contiene "federico" o nombres genéricos)
    if (sender?.name && 
        sender.name.trim() !== '' && 
        !sender.name.toLowerCase().includes('federico') &&
        !sender.name.toLowerCase().includes('suarez')) {
      return sender.name;
    }
    
    // Buscar en contact
    if (chat.contact?.phone_number) {
      return chat.contact.phone_number;
    }
    
    if (chat.contact?.name && 
        chat.contact.name.trim() !== '' && 
        !chat.contact.name.toLowerCase().includes('federico') &&
        !chat.contact.name.toLowerCase().includes('suarez')) {
      return chat.contact.name;
    }
    
    // Último recurso
    return `+${chat.id}`;
  };

  // Función para extraer el número de teléfono del chat para comparación
  const getChatPhoneNumber = (chat) => {
    const sender = chat.last_non_activity_message?.sender;
    
    if (sender?.phone_number) {
      return sender.phone_number.replace(/[^\d+]/g, '');
    }
    
    if (chat.contact?.phone_number) {
      return chat.contact.phone_number.replace(/[^\d+]/g, '');
    }
    
    return null;
  };

  // Función para normalizar números de teléfono
  const normalizePhoneNumber = (phone) => {
    if (!phone) return '';
    return phone.replace(/[^\d+]/g, '');
  };

  // Efecto para buscar automáticamente el chat cuando se proporciona un número objetivo
  useEffect(() => {
    if (targetPhoneNumber && chats.length > 0 && !loading) {
      const normalizedTarget = normalizePhoneNumber(targetPhoneNumber);
      
      if (normalizedTarget) {
        const foundChat = chats.find(chat => {
          const chatPhone = getChatPhoneNumber(chat);
          if (!chatPhone) return false;
          
          // Comparar números normalizados
          const normalizedChatPhone = normalizePhoneNumber(chatPhone);
          
          // Intentar diferentes formatos de comparación
          return normalizedChatPhone === normalizedTarget ||
                 normalizedChatPhone === normalizedTarget.replace('+', '') ||
                 normalizedTarget === normalizedChatPhone.replace('+', '') ||
                 normalizedChatPhone.endsWith(normalizedTarget.replace('+', '')) ||
                 normalizedTarget.replace('+', '').endsWith(normalizedChatPhone.replace('+', ''));
        });
        
        if (foundChat && onSelectChat) {
          onSelectChat(foundChat);
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

  if (loadingAgents) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando agentes...</p>
        </div>
      </div>
    );
  }

  if (!federicoAgent) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-yellow-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Agente no encontrado</h3>
            <p className="text-sm text-yellow-700 mt-1">No se encontró el agente "Federico Suarez" en Chatwoot.</p>
          </div>
        </div>
      </div>
    );
  }

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
        <p className="text-gray-500 text-lg font-medium">No hay chats asignados</p>
        <p className="text-gray-400 text-sm mt-1">No hay chats de WhatsApp asignados a {federicoAgent.name}</p>
        <button 
          onClick={refreshChats}
          className="mt-4 px-2 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          Actualizar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-full">
      {/* Header con botón de refresh - fijo */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Chats de WhatsApp ({chats.length})
            </h2>
            
          </div>
          <button 
            onClick={refreshChats}
            disabled={loading}
            className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {/* Lista de chats - scrolleable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {chats.map((chat) => (
          <div 
            key={chat.id} 
            onClick={() => onSelectChat && onSelectChat(chat)}
            className={`bg-white border rounded-lg py-2 px-3 hover:shadow-sm transition-all cursor-pointer ${
              selectedChat?.id === chat.id 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Header del chat simplificado */}
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center mr-2">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm truncate max-w-[180px]">
                    {getContactInfo(chat)}
                  </h3>
                </div>
              </div>
              
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(chat.status)}`}>
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
