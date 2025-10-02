import { useState, useEffect, useCallback } from 'react';

export const useAgents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching agents from API...');
      
      const response = await fetch('/api/agents', {
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
        setAgents(data.data || []);
        console.log(`Successfully loaded ${data.total} agents`);
      } else {
        console.error('API Error Details:', data);
        throw new Error(data.message || data.error || 'Failed to fetch agents');
      }

    } catch (err) {
      console.error('Error fetching agents:', err);
      setError(err.message);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Función para refrescar manualmente
  const refreshAgents = useCallback(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    loading,
    error,
    refreshAgents
  };
};

