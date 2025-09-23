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
        setMessages(data.data || []);
        console.log(`Successfully loaded ${data.total} messages`);
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

  return {
    messages,
    loading,
    error,
    refreshMessages
  };
};
