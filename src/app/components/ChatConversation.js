'use client';

import React, { useEffect, useRef } from 'react';
import { useChatMessages } from '../../hooks/useChatMessages';

const ChatConversation = ({ conversation, onBack }) => {
  const { messages, loading, error, refreshMessages } = useChatMessages(conversation?.id);
  const messagesEndRef = useRef(null);

  // Scroll al final cuando se cargan nuevos mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return new Intl.DateTimeFormat('es-AR', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      }).format(date);
    }
  };

  const getContactInfo = (conversation) => {
    const sender = conversation.last_non_activity_message?.sender;
    
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
    if (conversation.contact?.phone_number) {
      return conversation.contact.phone_number;
    }
    
    if (conversation.contact?.name && 
        conversation.contact.name.trim() !== '' && 
        !conversation.contact.name.toLowerCase().includes('federico') &&
        !conversation.contact.name.toLowerCase().includes('suarez')) {
      return conversation.contact.name;
    }
    
    // Último recurso
    return `+${conversation.id}`;
  };

  const isOutgoing = (message) => {
    return message.sender_type === 'User' || message.message_type === 1;
  };

  const groupMessagesByDate = (messages) => {
    const grouped = {};
    messages.forEach(message => {
      const date = formatMessageDate(message.created_at);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });
    return grouped;
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 h-full">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-gray-500 text-lg font-medium">Selecciona una conversación</p>
          <p className="text-gray-400 text-sm mt-1">Elige un chat de la lista para ver los mensajes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header del chat */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center">
        <button
          onClick={onBack}
          className="lg:hidden mr-3 p-1 hover:bg-gray-200 rounded-full"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
          </svg>
        </div>
        
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{getContactInfo(conversation)}</h3>
          <p className="text-sm text-gray-500">
            {conversation.last_non_activity_message?.sender?.phone_number || `Chat #${conversation.id}`}
          </p>
        </div>

        <button
          onClick={refreshMessages}
          disabled={loading}
          className="p-2 hover:bg-gray-200 rounded-full disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando mensajes...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 font-medium">Error al cargar mensajes</p>
              <p className="text-gray-500 text-sm mt-1">{error}</p>
              <button 
                onClick={refreshMessages}
                className="mt-2 text-sm text-green-600 hover:text-green-800 font-medium"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-500">No hay mensajes en esta conversación</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Separador de fecha */}
                <div className="flex justify-center my-4">
                  <span className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">
                    {date}
                  </span>
                </div>
                
                {/* Mensajes de ese día */}
                {dateMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${isOutgoing(message) ? 'justify-end' : 'justify-start'} mb-2`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isOutgoing(message)
                          ? 'bg-green-500 text-white'
                          : 'bg-white border border-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        isOutgoing(message) ? 'text-green-100' : 'text-gray-500'
                      }`}>
                        {formatMessageTime(message.created_at)}
                        {isOutgoing(message) && (
                          <svg className="inline ml-1 w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Área de entrada de mensaje */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Escribe un mensaje..."
            className="flex-1 border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            disabled
          />
          <button
            disabled
            className="bg-gray-300 text-gray-500 p-2 rounded-full cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Envío de mensajes en desarrollo
        </p>
      </div>
    </div>
  );
};

export default ChatConversation;
