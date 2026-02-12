import { useState, useEffect, useCallback } from 'react';

export const useChatMessages = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true); // Indica si hay más mensajes antiguos disponibles

  const filterDeletedMessages = useCallback((allMessages) => {
    return allMessages.filter(msg => {
      // Filtrar mensajes que:
      // 1. Tengan contenido que indique que fue borrado
      // 2. Tengan content_attributes que indiquen que fue borrado
      // 3. Tengan un flag deleted
      // NOTA: No filtramos mensajes privados (msg.private === true) porque pueden ser mensajes
      // enviados por workflows de n8n que queremos mostrar
      const content = (msg.content || '').toLowerCase();
      const isDeleted = 
        content.includes('this message was deleted') ||
        content.includes('mensaje eliminado') ||
        content.includes('message was deleted') ||
        msg.content_attributes?.deleted === true ||
        msg.deleted === true ||
        msg.status === 'deleted';
      
      return !isDeleted;
    });
  }, []);

  const fetchMessages = useCallback(async (before = null) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    // Si es la carga inicial, usar loading; si es cargar más, usar loadingMore
    if (before) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      console.log('Fetching messages for conversation:', conversationId, before ? `(before: ${before})` : '');
      
      let url = `/api/chats/${conversationId}/messages`;
      if (before) {
        url += `?before=${before}`;
      }
      
      const response = await fetch(url, {
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
        // Filtrar mensajes borrados
        const allMessages = data.data || [];
        const filteredMessages = filterDeletedMessages(allMessages);
        
        if (before) {
          // Si estamos cargando mensajes más antiguos, agregarlos al principio
          setMessages(prevMessages => {
            // Combinar mensajes antiguos con los existentes, evitando duplicados
            const existingIds = new Set(prevMessages.map(m => m.id));
            const newMessages = filteredMessages.filter(m => !existingIds.has(m.id));
            return [...newMessages, ...prevMessages];
          });
          console.log(`Successfully loaded ${filteredMessages.length} older messages`);
        } else {
          // Si es la carga inicial, reemplazar todos los mensajes
          setMessages(filteredMessages);
          console.log(`Successfully loaded ${filteredMessages.length} messages (${allMessages.length - filteredMessages.length} deleted messages filtered)`);
        }
        
        // Actualizar hasMore basado en si recibimos mensajes
        // Si recibimos menos mensajes de los esperados, probablemente no hay más
        setHasMore(filteredMessages.length > 0);
      } else {
        throw new Error(data.error || 'Failed to fetch messages');
      }

    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err.message);
      if (!before) {
        setMessages([]);
      }
    } finally {
      if (before) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [conversationId, filterDeletedMessages]);

  // Fetch messages when conversationId changes
  useEffect(() => {
    fetchMessages();
    setHasMore(true); // Reset hasMore cuando cambia la conversación
  }, [conversationId]);

  // Función para refrescar manualmente
  const refreshMessages = useCallback(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Función para cargar más mensajes antiguos
  const loadMoreMessages = useCallback(() => {
    if (!conversationId || loadingMore || !hasMore || messages.length === 0) {
      return;
    }
    
    // Obtener el ID del mensaje más antiguo que tenemos
    const oldestMessage = messages[0];
    if (oldestMessage && oldestMessage.id) {
      fetchMessages(oldestMessage.id);
    }
  }, [conversationId, messages, loadingMore, hasMore, fetchMessages]);

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
    loadingMore,
    error,
    hasMore,
    refreshMessages,
    loadMoreMessages,
    sendMessage
  };
};
