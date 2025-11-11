'use client';

import React, { useState, useEffect } from 'react';

interface AgentStatusToggleProps {
  className?: string;
  variant?: 'default' | 'dark';
}

const AgentStatusToggle: React.FC<AgentStatusToggleProps> = ({ className = '', variant = 'default' }) => {
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [fallbackMode, setFallbackMode] = useState<boolean>(false);

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
        setFallbackMode(data.fallback_mode || false);
        if (data.fallback_mode) {
          console.info('AgentStatusToggle funcionando en modo local:', data.message);
        }
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
        setFallbackMode(data.fallback_mode || false);
        // Mostrar mensaje de éxito
        console.log(data.message);
        if (data.fallback_mode) {
          console.info('Estado actualizado en modo local');
        }
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

  // Estilos según la variante
  const getButtonStyles = () => {
    if (variant === 'dark') {
      return isActive 
        ? 'bg-black hover:bg-gray-900 text-white' 
        : 'bg-gray-600 hover:bg-gray-700 text-white';
    }
    // Variante default (colorida)
    return isActive 
      ? 'bg-black hover:bg-black text-white' 
      : 'bg-gray-500 hover:bg-gray-600 text-white';
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
    <div className="relative">
      <button
        onClick={toggleAgentStatus}
        disabled={isLoading}
        className={`
          ${getButtonStyles()}
          ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}
          py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center shadow-sm transition-all duration-200
          ${className}
        `}
        title={fallbackMode ? 'Funcionando en modo local (Supabase no configurado)' : 'Estado del agente'}
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
                ON
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                 Off
              </>
            )}
          </>
        )}
      </button>
      
      {/* Indicador de modo local */}
      {fallbackMode && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" 
             title="Modo local - Supabase no configurado">
        </div>
      )}
    </div>
  );
};

export default AgentStatusToggle;

