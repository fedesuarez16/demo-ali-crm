'use client';

import React, { useState, useEffect } from 'react';

interface JidData {
  jid: string;
  value: string;
  expiry: number;
}

interface RedisJidManagerProps {
  className?: string;
}

const RedisJidManager: React.FC<RedisJidManagerProps> = ({ className = '' }) => {
  const [jids, setJids] = useState<JidData[]>([]);
  const [newJid, setNewJid] = useState('');
  const [ttl, setTtl] = useState(86400); // 24 horas por defecto
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Cargar lista de JIDs al montar el componente
  useEffect(() => {
    loadJids();
  }, []);

  const loadJids = async () => {
    try {
      setIsLoadingList(true);
      const response = await fetch('/api/redis-jids');
      const data = await response.json();
      
      if (response.ok) {
        setJids(data.jids || []);
      } else {
        showMessage('error', data.error || 'Error al cargar JIDs');
      }
    } catch (error) {
      console.error('Error loading JIDs:', error);
      showMessage('error', 'Error al cargar la lista de JIDs');
    } finally {
      setIsLoadingList(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const addJid = async () => {
    if (!newJid.trim()) {
      showMessage('error', 'Por favor ingresa un JID válido');
      return;
    }

    // Auto-completar el formato si no lo tiene
    let formattedJid = newJid.trim();
    if (!formattedJid.includes('@s.whatsapp.net')) {
      formattedJid = `${formattedJid}@s.whatsapp.net`;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/redis-jids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jid: formattedJid,
          ttl: ttl
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', data.message);
        setNewJid('');
        await loadJids(); // Recargar la lista
      } else {
        showMessage('error', data.error || 'Error al agregar JID');
      }
    } catch (error) {
      console.error('Error adding JID:', error);
      showMessage('error', 'Error al agregar JID');
    } finally {
      setIsLoading(false);
    }
  };

  const removeJid = async (jid: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el JID ${jid}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/redis-jids?jid=${encodeURIComponent(jid)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', data.message);
        await loadJids(); // Recargar la lista
      } else {
        showMessage('error', data.message || 'Error al eliminar JID');
      }
    } catch (error) {
      console.error('Error removing JID:', error);
      showMessage('error', 'Error al eliminar JID');
    }
  };

  const verifyJid = async (jid: string) => {
    try {
      const response = await fetch(`/api/redis-jids?jid=${encodeURIComponent(jid)}`);
      const data = await response.json();

      if (response.ok) {
        const status = data.exists ? 'EXISTE' : 'NO EXISTE';
        console.log('=== RESULTADO VERIFICACIÓN ===');
        console.log('JID verificado:', jid);
        console.log('Respuesta completa:', data);
        console.log('==============================');
        
        let message = `JID ${jid}: ${status}`;
        if (data.debug) {
          message += `\n\nDebug Info:\n- Clave buscada: ${data.debug.key}\n- Claves en Redis: ${data.debug.allKeys.length}\n- Encontrado: ${data.debug.found}`;
        }
        
        showMessage(data.exists ? 'success' : 'error', message);
      } else {
        showMessage('error', 'Error al verificar JID');
      }
    } catch (error) {
      console.error('Error verifying JID:', error);
      showMessage('error', 'Error al verificar JID');
    }
  };

  const formatTimeRemaining = (expiry: number) => {
    const now = Date.now();
    const remaining = expiry - now;
    
    if (remaining <= 0) {
      return 'Expirado';
    }
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatTtlOptions = [
    { value: 3600, label: '1 hora' },
    { value: 21600, label: '6 horas' },
    { value: 43200, label: '12 horas' },
    { value: 86400, label: '24 horas' },
    { value: 172800, label: '48 horas' },
    { value: 604800, label: '7 días' }
  ];

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 1.79 4 4 4h8c0-2.21-1.79-4-4-4H4V7z" />
                </svg>
                Gestión de JIDs Redis via n8n
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Envía JIDs directamente a tus webhooks de n8n para procesamiento
              </p>
            </div>
            
            {/* Indicador de conexión n8n */}
            <div className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              Conectado a n8n
            </div>
          </div>
        </div>

      {/* Mensaje de estado */}
      {message && (
        <div className={`mx-6 mt-4 p-3 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Formulario para agregar JID */}
      <div className="px-6 py-4 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Agregar JID</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              JID de WhatsApp
            </label>
            <input
              type="text"
              value={newJid}
              onChange={(e) => setNewJid(e.target.value)}
              placeholder="5491165442102 o 5491165442102@s.whatsapp.net"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tiempo de vida (TTL)
            </label>
            <select
              value={ttl}
              onChange={(e) => setTtl(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            >
              {formatTtlOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={addJid}
              disabled={isLoading || !newJid.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {isLoading ? 'Agregando...' : 'Agregar JID'}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de JIDs activos */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">
            JIDs Activos ({jids.length})
          </h3>
          <div className="flex space-x-3">
            <button
              onClick={async () => {
                const response = await fetch('/api/redis-jids');
                const data = await response.json();
                console.log('=== ESTADO COMPLETO REDIS ===');
                console.log('Respuesta completa:', data);
                console.log('============================');
                alert(`Redis tiene ${data.total} JIDs activos. Ver consola para detalles.`);
              }}
              className="text-xs text-gray-600 hover:text-gray-800 font-medium"
            >
              Debug
            </button>
            <button
              onClick={loadJids}
              disabled={isLoadingList}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {isLoadingList ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {isLoadingList ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Cargando JIDs...</p>
          </div>
        ) : jids.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-4.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
            </svg>
            <p className="text-sm">No hay JIDs activos</p>
            <p className="text-xs text-gray-400 mt-1">Agrega un JID para comenzar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jids.map((jidData, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {jidData.jid}
                  </p>
                  <p className="text-xs text-gray-500">
                    Expira en: {formatTimeRemaining(jidData.expiry)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => verifyJid(jidData.jid)}
                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                  >
                    Verificar
                  </button>
                  <button
                    onClick={() => removeJid(jidData.jid)}
                    className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RedisJidManager;
