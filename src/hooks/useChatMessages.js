import { useState, useEffect, useCallback } from 'react';

export const useChatMessages = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching messages for conversation:', conversationId);
      
      const response = await fetch(`/api/chats/${conversationId}/messages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        // Filtrar mensajes borrados - no mostrar mensajes que contengan "deleted" o estén marcados como borrados
        const allMessages = data.data || [];
        const filteredMessages = allMessages.filter(msg => {
          // Filtrar mensajes que:
          // 1. Tengan contenido que indique que fue borrado
          // 2. Tengan content_attributes que indiquen que fue borrado
          // 3. Tengan un flag deleted
          const content = (msg.content || '').toLowerCase();
          const isDeleted = 
            content.includes('this message was deleted') ||
            content.includes('mensaje eliminado') ||
            content.includes('message was deleted') ||
            msg.content_attributes?.deleted === true ||
            msg.private === true ||
            msg.deleted === true ||
            msg.status === 'deleted';
          
          return !isDeleted;
        });
        
        setMessages(filteredMessages);
        console.log(`Successfully loaded ${filteredMessages.length} messages (${allMessages.length - filteredMessages.length} deleted messages filtered)`);
      } else {
        throw new Error(data.error || 'Failed to fetch messages');
      }

    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err.message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Fetch messages when conversationId changes
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Función para refrescar manualmente
  const refreshMessages = useCallback(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Función para enviar un mensaje
  const sendMessage = useCallback(async (content) => {
    if (!conversationId || !content || !content.trim()) {
      throw new Error('ID de conversación y contenido del mensaje son requeridos');
    }

    try {
      console.log('Sending message to conversation:', conversationId);
      
      const response = await fetch(`/api/chats/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        // Refrescar mensajes después de enviar
        await fetchMessages();
        return data;
      } else {
        throw new Error(data.error || 'Failed to send message');
      }

    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [conversationId, fetchMessages]);

  return {
    messages,
    loading,
    error,
    refreshMessages,
    sendMessage
  };
};
