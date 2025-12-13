import { useState, useEffect, useCallback, useRef } from 'react';

export const useChats = (defaultAssigneeId = null) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [currentFilters, setCurrentFilters] = useState({
    label: 'all',
    assignee_id: defaultAssigneeId || 'all',
    status: 'all'
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total_pages: 1,
    total_count: 0,
    has_more: false
  });
  
  // Usar ref para evitar llamadas duplicadas
  const abortControllerRef = useRef(null);
  const prevAssigneeIdRef = useRef(defaultAssigneeId);

  const fetchChats = useCallback(async (customFilters = null, page = 1, append = false) => {
    // Cancelar petición anterior si existe (solo si no es append)
    if (!append && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Crear nuevo AbortController
    abortControllerRef.current = new AbortController();
    
    // Usar loading o loadingMore según si es append
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }
    
    try {
      // Usar filtros personalizados o los actuales
      const activeFilters = customFilters || currentFilters;
      
      // Actualizar filtros actuales si se proporcionaron nuevos (solo si no es append)
      if (customFilters && !append) {
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
      
      // Agregar parámetros de paginación
      params.append('page', page.toString());
      params.append('per_page', '20');
      
      const queryString = params.toString();
      const url = `/api/chats?${queryString}`;
      
      console.log('Fetching chats from API with filters:', activeFilters, 'page:', page, 'append:', append);
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
        if (append) {
          // Agregar nuevos chats a los existentes
          setChats(prevChats => [...prevChats, ...(data.data || [])]);
        } else {
          // Reemplazar chats existentes
          setChats(data.data || []);
        }
        
        // Actualizar información de paginación
        if (data.pagination) {
          setPagination(prevPagination => ({
            ...data.pagination,
            // Mantener has_more actualizado
            has_more: data.pagination.has_more !== undefined ? data.pagination.has_more : prevPagination.has_more
          }));
        } else {
          // Si no hay paginación en la respuesta, calcular basándose en la cantidad recibida
          const receivedCount = data.data?.length || 0;
          const hasMore = receivedCount >= 20; // Si recibimos 20 o más, probablemente hay más
          setPagination(prevPagination => ({
            ...prevPagination,
            current_page: page,
            has_more: hasMore
          }));
        }
        
        console.log(`Successfully loaded ${data.total} WhatsApp chats out of ${data.totalConversations || 0} total conversations`);
        console.log('Filters applied:', data.filters);
        console.log('Pagination:', data.pagination || 'No pagination info');
        console.log('Total chats in state:', append ? 'appended' : data.data?.length);
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
      if (!append) {
        setError(err.message);
        setChats([]);
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
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
    fetchChats(newFilters, 1, false);
  }, [fetchChats]);
  
  // Función para cargar más chats (siguiente página)
  const loadMoreChats = useCallback(() => {
    if (!loadingMore && pagination.has_more) {
      const nextPage = pagination.current_page + 1;
      fetchChats(null, nextPage, true);
    }
  }, [fetchChats, loadingMore, pagination]);

  return {
    chats,
    loading,
    loadingMore,
    error,
    refreshChats,
    loadMoreChats,
    fetchChats, // Exportar fetchChats para poder usarlo con filtros personalizados
    currentFilters, // Exportar filtros actuales
    pagination // Exportar información de paginación
  };
};
