'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChatMessages } from '../../hooks/useChatMessages';
import { updateLead, getAllLeads } from '../services/leadService';
import { programarSeguimiento, getSeguimientosPendientes, eliminarMensajeProgramado } from '../services/mensajeService';

const ChatConversation = ({ conversation, onBack }) => {
  const { messages, loading, error, refreshMessages, sendMessage } = useChatMessages(conversation?.id);
  const messagesEndRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [lead, setLead] = useState(null);
  const [isLoadingLead, setIsLoadingLead] = useState(false);
  const [isTogglingChat, setIsTogglingChat] = useState(false);
  const [isProgramandoSeguimiento, setIsProgramandoSeguimiento] = useState(false);
  const [seguimientosCount, setSeguimientosCount] = useState(0);
  const [seguimientoActivo, setSeguimientoActivo] = useState(null); // { id, tabla_origen }

  // Cargar el lead cuando hay una conversación
  useEffect(() => {
    const loadLead = async () => {
      if (!conversation) {
        setLead(null);
        return;
      }

      setIsLoadingLead(true);
      try {
        // Obtener el número de teléfono de la conversación
        const phoneNumber = conversation.enriched_phone_number || 
                           conversation.last_non_activity_message?.sender?.phone_number ||
                           conversation.contact?.phone_number ||
                           conversation.enriched_identifier?.replace('@s.whatsapp.net', '') ||
                           null;

        if (!phoneNumber) {
          setLead(null);
          return;
        }

        const allLeads = await getAllLeads();
        // Normalizar el número de teléfono para comparación
        const normalizedPhone = phoneNumber.replace(/[^\d+]/g, '').replace(/^\+/, '');
        
        const foundLead = allLeads.find(l => {
          const leadPhone = (l.telefono || l.whatsapp_id || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
          return leadPhone === normalizedPhone || leadPhone.includes(normalizedPhone) || normalizedPhone.includes(leadPhone);
        }) || null;

        setLead(foundLead);
        if (foundLead) {
          setSeguimientosCount(foundLead.seguimientos_count || 0);
          // Cargar seguimientos pendientes para este lead
          const remoteJid = foundLead.whatsapp_id || foundLead.telefono || '';
          if (remoteJid) {
            const seguimientos = await getSeguimientosPendientes(remoteJid);
            if (seguimientos.length > 0) {
              // Tomar el primer seguimiento pendiente (más próximo)
              setSeguimientoActivo({
                id: seguimientos[0].id,
                tabla_origen: seguimientos[0].tabla_origen || 'cola_seguimientos'
              });
            } else {
              setSeguimientoActivo(null);
            }
          }
        } else {
          setSeguimientoActivo(null);
        }
      } catch (error) {
        console.error('Error loading lead:', error);
        setLead(null);
      } finally {
        setIsLoadingLead(false);
      }
    };

    loadLead();
  }, [conversation]);

  // Función para activar/desactivar el chat
  const handleToggleChat = async () => {
    if (!lead) return;
    
    setIsTogglingChat(true);
    try {
      const newEstadoChat = lead.estado_chat === 1 ? 0 : 1;
      const updatedLead = await updateLead(lead.id, { estado_chat: newEstadoChat });
      
      if (updatedLead) {
        setLead(updatedLead);
        console.log(`✅ Chat ${newEstadoChat === 1 ? 'activado' : 'desactivado'} exitosamente`);
      } else {
        alert('Error al actualizar el estado del chat');
      }
    } catch (error) {
      console.error('Error toggling chat:', error);
      alert('Error al actualizar el estado del chat');
    } finally {
      setIsTogglingChat(false);
    }
  };

  // Función para programar o desactivar un seguimiento
  const handleProgramarSeguimiento = async () => {
    if (!lead) return;
    
    // Si hay un seguimiento activo, desactivarlo
    if (seguimientoActivo) {
      setIsProgramandoSeguimiento(true);
      try {
        const success = await eliminarMensajeProgramado(seguimientoActivo.id, seguimientoActivo.tabla_origen);
        
        if (success) {
          alert('✅ Seguimiento desactivado exitosamente');
          setSeguimientoActivo(null);
        } else {
          alert('❌ Error al desactivar el seguimiento. Intenta nuevamente.');
        }
      } catch (error) {
        console.error('Error desactivando seguimiento:', error);
        alert('❌ Error al desactivar el seguimiento. Intenta nuevamente.');
      } finally {
        setIsProgramandoSeguimiento(false);
      }
      return;
    }
    
    // Si no hay seguimiento activo, programar uno nuevo
    const remoteJid = lead.whatsapp_id || lead.telefono || '';
    
    if (!remoteJid) {
      alert('❌ No se encontró un número de teléfono válido para este lead');
      return;
    }
    
    setIsProgramandoSeguimiento(true);
    try {
      // Preparar datos del seguimiento
      const seguimientoData = {
        remote_jid: remoteJid,
        tipo_lead: lead.estado || null,
        seguimientos_count: (seguimientosCount || 0) + 1
      };
      
      // Agregar fecha_ultima_interaccion si existe
      if (lead.ultima_interaccion) {
        seguimientoData.fecha_ultima_interaccion = lead.ultima_interaccion;
      } else if (lead.fechaContacto) {
        seguimientoData.fecha_ultima_interaccion = lead.fechaContacto;
      }
      
      // Agregar chatwoot_conversation_id si existe
      if (conversation?.id) {
        seguimientoData.chatwoot_conversation_id = conversation.id;
      }
      
      const success = await programarSeguimiento(seguimientoData);

      if (success) {
        alert('✅ Seguimiento programado exitosamente para dentro de 23 horas');
        // Incrementar el contador de seguimientos
        const newCount = (seguimientosCount || 0) + 1;
        setSeguimientosCount(newCount);
        // Actualizar en la base de datos
        const updatedLead = await updateLead(lead.id, { seguimientos_count: newCount });
        if (updatedLead) {
          setLead(updatedLead);
        }
        // Recargar seguimientos pendientes para actualizar el estado
        const seguimientos = await getSeguimientosPendientes(remoteJid);
        if (seguimientos.length > 0) {
          setSeguimientoActivo({
            id: seguimientos[0].id,
            tabla_origen: seguimientos[0].tabla_origen || 'cola_seguimientos'
          });
        }
      } else {
        alert('❌ Error al programar el seguimiento. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error programando seguimiento:', error);
      alert('❌ Error al programar el seguimiento. Intenta nuevamente.');
    } finally {
      setIsProgramandoSeguimiento(false);
    }
  };

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

  // Función para obtener el nombre del contacto
  const getContactName = (conversation) => {
    const sender = conversation.last_non_activity_message?.sender;
    const contact = conversation.contact;
    
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
    if (conversation.meta?.sender?.name && 
        conversation.meta.sender.name.trim() !== '' &&
        conversation.meta.sender.name.trim().length > 2) {
      return conversation.meta.sender.name.trim();
    }
    
    return null;
  };

  // Función para obtener el número de teléfono del contacto
  const getContactPhone = (conversation) => {
    const sender = conversation.last_non_activity_message?.sender;
    const contact = conversation.contact;
    
    // Priorizar campos enriquecidos
    if (conversation.enriched_phone_number) {
      return conversation.enriched_phone_number;
    }
    
    if (conversation.enriched_phone_raw) {
      return conversation.enriched_phone_raw;
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
    if (conversation.meta?.sender?.phone_number || conversation.meta?.sender?.phone) {
      return conversation.meta.sender.phone_number || conversation.meta.sender.phone;
    }
    
    // Buscar en additional_attributes
    if (conversation.additional_attributes?.phone_number || conversation.additional_attributes?.phone) {
      return conversation.additional_attributes.phone_number || conversation.additional_attributes.phone;
    }
    
    return null;
  };

  // Función para obtener el nombre o número del contacto (para compatibilidad)
  const getContactInfo = (conversation) => {
    const name = getContactName(conversation);
    const phone = getContactPhone(conversation);
    
    // Si hay nombre, mostrar nombre
    if (name) {
      return name;
    }
    
    // Si hay teléfono, mostrar teléfono
    if (phone) {
      return phone;
    }
    
    // Último recurso
    return `Chat ${conversation.id}`;
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
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
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
          {(() => {
            const name = getContactName(conversation);
            const phone = getContactPhone(conversation);
            
            if (name && phone) {
              // Mostrar nombre y número
              return (
                <>
                  <h3 className="font-medium text-gray-900">{name}</h3>
                  <p className="text-sm text-gray-500">{phone}</p>
                </>
              );
            } else if (name) {
              // Solo nombre
              return (
                <h3 className="font-medium text-gray-900">{name}</h3>
              );
            } else if (phone) {
              // Solo número
              return (
                <h3 className="font-medium text-gray-900">{phone}</h3>
              );
            } else {
              // Fallback
              return (
                <>
                  <h3 className="font-medium text-gray-900">{getContactInfo(conversation)}</h3>
                  <p className="text-sm text-gray-500">Chat #{conversation.id}</p>
                </>
              );
            }
          })()}
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
                {dateMessages.map((message) => {
                  // Verificar si el mensaje tiene un attachment de audio
                  // Chatwoot puede marcar audio de diferentes formas:
                  // - message_type: 3 (audio)
                  // - content_type: 'audio', 'audio/ogg', 'audio/mpeg', etc.
                  // - attachments con file_type: 'audio', 'voice'
                  // - attachments con content_type que empiece con 'audio/'
                  const hasAudio = 
                    message.message_type === 3 || // Tipo 3 = audio en Chatwoot
                    message.content_type === 'audio' ||
                    (message.content_type && message.content_type.startsWith('audio/')) ||
                    (message.attachments && message.attachments.some(att => 
                      att.file_type === 'audio' || 
                      att.file_type === 'voice' ||
                      (att.content_type && att.content_type.startsWith('audio/'))
                    ));
                  
                  const audioAttachment = hasAudio && message.attachments 
                    ? message.attachments.find(att => 
                        att.file_type === 'audio' || 
                        att.file_type === 'voice' ||
                        (att.content_type && att.content_type.startsWith('audio/'))
                      ) || message.attachments[0]
                    : null;
                  
                  // Obtener URL del audio (puede estar en diferentes lugares según Chatwoot)
                  // Chatwoot puede usar: data_url, url, file_url, download_url
                  let audioUrl = null;
                  if (audioAttachment) {
                    audioUrl = audioAttachment.data_url || 
                              audioAttachment.url || 
                              audioAttachment.file_url ||
                              audioAttachment.download_url ||
                              audioAttachment.public_url;
                  }
                  
                  // Si no hay URL en el attachment, verificar si hay una URL directa en el mensaje
                  if (!audioUrl && message.data_url) {
                    audioUrl = message.data_url;
                  }
                  
                  // Si no hay URL en el attachment, intentar construirla desde el ID
                  // Formato típico: /api/v1/accounts/{account_id}/conversations/{conversation_id}/messages/{message_id}/attachments/{attachment_id}
                  if (!audioUrl && audioAttachment?.id && conversation?.id && message.id) {
                    // Intentar construir URL relativa (se resolverá con el proxy de Next.js)
                    audioUrl = `/api/chats/${conversation.id}/messages/${message.id}/attachments/${audioAttachment.id}`;
                  }
                  
                  // Si aún no hay URL pero hay attachments, usar el primero
                  if (!audioUrl && message.attachments && message.attachments.length > 0) {
                    const firstAtt = message.attachments[0];
                    audioUrl = firstAtt.data_url || 
                              firstAtt.url || 
                              firstAtt.file_url ||
                              firstAtt.download_url ||
                              firstAtt.public_url;
                  }
                  
                  // Obtener el tipo de contenido del audio
                  const audioContentType = audioAttachment?.content_type || 
                                         message.content_type || 
                                         'audio/ogg; codecs=opus'; // WhatsApp usa OGG Opus por defecto
                  
                  return (
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
                        {/* Mostrar reproductor de audio si hay audio */}
                        {hasAudio && audioUrl ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <audio 
                                controls 
                                className="flex-1 min-w-[200px] h-8"
                                style={{
                                  maxWidth: '100%',
                                  outline: 'none'
                                }}
                                preload="metadata"
                              >
                                <source src={audioUrl} type={audioContentType} />
                                <source src={audioUrl} type="audio/mpeg" />
                                <source src={audioUrl} type="audio/ogg" />
                                <source src={audioUrl} type="audio/wav" />
                                <source src={audioUrl} type="audio/mp4" />
                                Tu navegador no soporta el elemento de audio.
                              </audio>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              {audioAttachment?.file_size && (
                                <span className={`text-xs ${
                                  isOutgoing(message) ? 'text-green-100' : 'text-gray-500'
                                }`}>
                                  {(audioAttachment.file_size / 1024).toFixed(1)} KB
                                </span>
                              )}
                              {audioAttachment?.duration && (
                                <span className={`text-xs ${
                                  isOutgoing(message) ? 'text-green-100' : 'text-gray-500'
                                }`}>
                                  {Math.floor(audioAttachment.duration / 1000)}s
                                </span>
                              )}
                            </div>
                            {/* Mostrar contenido de texto si existe (puede ser una descripción) */}
                            {message.content && message.content.trim() && (
                              <p className="text-xs italic mt-1 opacity-75">{message.content}</p>
                            )}
                          </div>
                        ) : (
                          /* Mostrar contenido de texto normal */
                          message.content && message.content.trim() && (
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          )
                        )}
                        
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
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Área de entrada de mensaje - Estilo similar a Chatwoot */}
      <div className="bg-white border-t border-gray-200">
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            if (!inputValue.trim() || sending || !conversation) return;
            
            const messageContent = inputValue.trim();
            setInputValue('');
            setSending(true);
            
            try {
              await sendMessage(messageContent);
            } catch (err) {
              console.error('Error al enviar mensaje:', err);
              // Restaurar el mensaje si falla
              setInputValue(messageContent);
              alert('Error al enviar el mensaje. Por favor, intenta de nuevo.');
            } finally {
              setSending(false);
            }
          }}
          className="flex flex-col"
        >
          {/* Área de texto grande */}
          <div className="px-4 pt-3 pb-3">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (inputValue.trim() && !sending && conversation) {
                    const messageContent = inputValue.trim();
                    setInputValue('');
                    setSending(true);
                    sendMessage(messageContent).catch((err) => {
                      console.error('Error al enviar mensaje:', err);
                      setInputValue(messageContent);
                      alert('Error al enviar el mensaje. Por favor, intenta de nuevo.');
                    }).finally(() => {
                      setSending(false);
                    });
                  }
                }
              }}
              placeholder="Shift + enter for new line. Start with '/' to select a Canned Response."
              className="w-full min-h-[120px] max-h-[300px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={sending || !conversation}
            />
          </div>

          {/* Barra de acciones inferior */}
          <div className="px-4 pb-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
            {/* Botones de acciones del lead */}
            {lead && (
              <>
                {/* Botón de activar/desactivar chat del lead */}
                <button
                  type="button"
                  onClick={handleToggleChat}
                  disabled={isTogglingChat || isLoadingLead}
                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors shadow-sm ${
                    lead.estado_chat === 1
                      ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                  } ${isTogglingChat || isLoadingLead ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={lead.estado_chat === 1 ? 'Desactivar chat del lead' : 'Activar chat del lead'}
                >
                  {isTogglingChat ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current"></div>
                  ) : (
                    <>
                      {lead.estado_chat === 1 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </>
                  )}
                </button>

                {/* Botón para activar/desactivar seguimiento */}
                <button
                  type="button"
                  onClick={handleProgramarSeguimiento}
                  disabled={isProgramandoSeguimiento || isLoadingLead || !lead}
                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors shadow-sm ${
                    seguimientoActivo
                      ? 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300'
                  } ${isProgramandoSeguimiento || isLoadingLead ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={seguimientoActivo ? 'Desactivar seguimiento programado' : 'Activar seguimiento (programa para dentro de 23 horas)'}
                >
                  {isProgramandoSeguimiento ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current"></div>
                  ) : seguimientoActivo ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <span className="hidden sm:inline">Desactivar</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span className="hidden sm:inline">Activar</span>
                    </>
                  )}
                </button>
              </>
            )}

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputValue.trim() || sending || !conversation}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                !inputValue.trim() || sending || !conversation
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>Send</span>
                  <span className="text-xs opacity-75">⌘ + ←</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatConversation;
