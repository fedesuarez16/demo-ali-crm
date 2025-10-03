'use client';

import React, { useState, useEffect } from 'react';

interface AgentStatusToggleProps {
  className?: string;
}

const AgentStatusToggle: React.FC<AgentStatusToggleProps> = ({ className = '' }) => {
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(true);

  // Cargar el estado inicial del agente
  useEffect(() => {
    fetchAgentStatus();
  }, []);

  const fetchAgentStatus = async () => {
    try {
      setIsFetching(true);
      const response = await fetch('/api/agent-status');
      const data = await response.json();
      
      if (response.ok) {
        setIsActive(data.is_active);
      } else {
        console.error('Error fetching agent status:', data.error);
      }
    } catch (error) {
      console.error('Error fetching agent status:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const toggleAgentStatus = async () => {
    setIsLoading(true);
    
    try {
      const newStatus = !isActive;
      const response = await fetch('/api/agent-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: newStatus }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsActive(newStatus);
        // Puedes agregar una notificación aquí si lo deseas
        console.log(data.message);
      } else {
        console.error('Error toggling agent status:', data.error);
        alert('Error al cambiar el estado del agente');
      }
    } catch (error) {
      console.error('Error toggling agent status:', error);
      alert('Error al cambiar el estado del agente');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <button
        disabled
        className={`bg-gray-300 text-gray-600 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center shadow-sm cursor-not-allowed ${className}`}
      >
        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Cargando...
      </button>
    );
  }

  return (
    <button
      onClick={toggleAgentStatus}
      disabled={isLoading}
      className={`
        ${isActive 
          ? 'bg-gray-900 hover:bg-gray-800 text-white' 
          : 'bg-gray-500 hover:bg-grays-600 text-white'
        }
        ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}
        py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center shadow-sm transition-all duration-200
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Actualizando...
        </>
      ) : (
        <>
          {isActive ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Agente Activo
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Agente Desactivado
            </>
          )}
        </>
      )}
    </button>
  );
};

export default AgentStatusToggle;

