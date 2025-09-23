import { useState, useEffect, useCallback } from 'react';

export const useChats = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching chats from API...');
      
      const response = await fetch('/api/chats', {
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
        setChats(data.data || []);
        console.log(`Successfully loaded ${data.total} WhatsApp chats out of ${data.totalConversations || 0} total conversations`);
        console.log('Debug info:', data.debug);
      } else {
        console.error('API Error Details:', data);
        throw new Error(data.message || data.error || 'Failed to fetch chats');
      }

    } catch (err) {
      console.error('Error fetching chats:', err);
      setError(err.message);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch chats on mount
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Función para refrescar manualmente
  const refreshChats = useCallback(() => {
    fetchChats();
  }, [fetchChats]);

  return {
    chats,
    loading,
    error,
    refreshChats
  };
};
