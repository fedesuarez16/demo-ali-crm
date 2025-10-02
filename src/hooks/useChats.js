import { useState, useEffect, useCallback, useRef } from 'react';

export const useChats = (defaultAssigneeId = null) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentFilters, setCurrentFilters] = useState({
    label: 'all',
    assignee_id: defaultAssigneeId || 'all',
    status: 'all'
  });
  
  // Usar ref para evitar llamadas duplicadas
  const abortControllerRef = useRef(null);
  const prevAssigneeIdRef = useRef(defaultAssigneeId);

  const fetchChats = useCallback(async (customFilters = null) => {
    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Crear nuevo AbortController
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      // Usar filtros personalizados o los actuales
      const activeFilters = customFilters || currentFilters;
      
      // Actualizar filtros actuales si se proporcionaron nuevos
      if (customFilters) {
        setCurrentFilters(customFilters);
      }
      
      // Construir query string con los filtros
      const params = new URLSearchParams();
      
      if (activeFilters.label && activeFilters.label !== 'all') {
        params.append('label', activeFilters.label);
      }
      
      if (activeFilters.assignee_id && activeFilters.assignee_id !== 'all') {
        params.append('assignee_id', activeFilters.assignee_id);
      }
      
      if (activeFilters.status && activeFilters.status !== 'all') {
        params.append('status', activeFilters.status);
      }
      
      const queryString = params.toString();
      const url = queryString ? `/api/chats?${queryString}` : '/api/chats';
      
      console.log('Fetching chats from API with filters:', activeFilters);
      console.log('Request URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        setChats(data.data || []);
        console.log(`Successfully loaded ${data.total} WhatsApp chats out of ${data.totalConversations || 0} total conversations`);
        console.log('Filters applied:', data.filters);
      } else {
        console.error('API Error Details:', data);
        throw new Error(data.message || data.error || 'Failed to fetch chats');
      }

    } catch (err) {
      // No mostrar error si fue cancelación de petición
      if (err.name === 'AbortError') {
        console.log('Request was cancelled');
        return;
      }
      console.error('Error fetching chats:', err);
      setError(err.message);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, [currentFilters]);

  // Fetch chats solo al montar el componente
  useEffect(() => {
    fetchChats();
    
    // Cleanup: cancelar peticiones pendientes al desmontar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // Array vacío = solo al montar
  
  // Actualizar filtros cuando cambia el defaultAssigneeId (cuando se cargan los agentes)
  useEffect(() => {
    if (defaultAssigneeId && defaultAssigneeId !== prevAssigneeIdRef.current) {
      prevAssigneeIdRef.current = defaultAssigneeId;
      const newFilters = {
        ...currentFilters,
        assignee_id: defaultAssigneeId
      };
      setCurrentFilters(newFilters);
      fetchChats(newFilters);
    }
  }, [defaultAssigneeId]);

  // Función para refrescar manualmente con filtros opcionales
  const refreshChats = useCallback((newFilters = null) => {
    fetchChats(newFilters);
  }, [fetchChats]);

  return {
    chats,
    loading,
    error,
    refreshChats,
    fetchChats, // Exportar fetchChats para poder usarlo con filtros personalizados
    currentFilters // Exportar filtros actuales
  };
};
