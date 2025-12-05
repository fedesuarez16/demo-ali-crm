'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '../components/AppLayout';
import WhatsAppView from '../components/WhatsAppView';
import AgentStatusToggle from '../components/AgentStatusToggle';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const leadId = searchParams?.get('leadId');
  const phoneNumber = searchParams?.get('phoneNumber');
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: leadId 
        ? `Hola, estás conversando con el lead ID: ${leadId}. ¿En qué puedo ayudarte?`
        : phoneNumber
        ? `Buscando conversación para el número: ${phoneNumber}...`
        : 'Hola, soy tu asistente inmobiliario. ¿En qué puedo ayudarte hoy?',
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<'assistant' | 'whatsapp'>('whatsapp');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ejemplo de sugerencias para el chat
  const suggestions = [
    "Buscar propiedades en Palermo",
    "¿Cómo puedo contactar a un lead?",
    "Mostrar propiedades disponibles",
    "Programar una visita"
  ];

  // Scroll al final de los mensajes cuando se añade uno nuevo
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Añadir mensaje del usuario
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    // Simular respuesta del asistente después de un breve retraso
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Estoy procesando tu consulta sobre "${inputValue}". En un sistema real, aquí se mostraría la respuesta del asistente basada en datos inmobiliarios.`,
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-10px)]">
        {/* Encabezado con tabs */}
        <div className="border-b  bg-slate-100 border-gray-200 py-[6px] px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-medium text-gray-800">Centro de Comunicación</h1>
              {(leadId || phoneNumber) && (
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {leadId ? `Lead ID: ${leadId}` : `Teléfono: ${phoneNumber}`}
                </div>
              )}
            </div>
            <AgentStatusToggle variant="dark" className="py-1 px-3 text-sm" />
          </div>
        </div>
        
        {/* Contenido condicional basado en el tab activo */}
        {activeView === 'whatsapp' ? (
          <div className="flex-1 overflow-hidden h-full">
            <WhatsAppView targetPhoneNumber={phoneNumber} />
          </div>
        ) : (
          <>
            {/* Área de mensajes del asistente */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.sender === 'user' 
                          ? 'bg-gray-700 text-white' 
                          : 'bg-white border border-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs text-right mt-1 opacity-70">
                        {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 max-w-[80%]">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>
          </>
        )}
        
        {/* Sugerencias y área de entrada - solo para el asistente */}
        {activeView === 'assistant' && (
          <>
            {/* Sugerencias */}
            {messages.length <= 2 && (
              <div className="bg-white border-t border-gray-200 py-3 px-6">
                <p className="text-xs text-gray-500 mb-2">Sugerencias:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 px-3 rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Área de entrada */}
            <div className="border-t border-gray-200 bg-white p-4">
              <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="w-full border border-gray-300 rounded-lg py-3 pl-4 pr-12 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 rounded-md p-1.5 ${
                      !inputValue.trim() || isLoading 
                        ? 'text-gray-400' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  El asistente inmobiliario está en fase de desarrollo. Las respuestas son simuladas.
                </p>
              </form>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-slate-800">Cargando chat...</h2>
          </div>
        </div>
      </AppLayout>
    }>
      <ChatPageContent />
    </Suspense>
  );
} 