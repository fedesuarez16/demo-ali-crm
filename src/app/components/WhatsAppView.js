'use client';

import React, { useState } from 'react';
import ChatList from './ChatList';
import ChatConversation from './ChatConversation';

const WhatsAppView = ({ targetPhoneNumber }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [showConversation, setShowConversation] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setShowConversation(true);
    // En mobile, cerrar la sidebar después de seleccionar un chat
    setIsSidebarOpen(false);
  };

  const handleBackToList = () => {
    setShowConversation(false);
    setSelectedChat(null);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* Botón flotante para abrir sidebar - Solo en mobile, absolute, solo cuando NO hay conversación */}
      {!showConversation && (
        <button
          onClick={toggleSidebar}
          className="lg:hidden fixed bottom-6 right-6 z-[60] bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label="Abrir lista de chats"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* Overlay para cerrar sidebar en mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Panel izquierdo - Lista de chats */}
      {/* En desktop: siempre visible, split view */}
      {/* En mobile: overlay/drawer que NO ocupa espacio cuando está cerrado - completamente desacoplado */}
      <div className={`
        flex-col
        w-full lg:w-1/3 xl:w-1/4
        border-r border-gray-200 bg-white
        ${showConversation ? 'hidden lg:flex' : 'flex'}
        lg:relative lg:static
        fixed
        top-0 left-0 bottom-0
        z-50 lg:z-auto
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Header de la sidebar en mobile con botón de cerrar */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">Conversaciones</h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
            aria-label="Cerrar lista de chats"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden min-h-0">
          <ChatList 
            onSelectChat={handleSelectChat} 
            selectedChat={selectedChat}
            targetPhoneNumber={targetPhoneNumber}
          />
        </div>
      </div>

      {/* Panel derecho - Conversación */}
      {/* En mobile: ocupa todo el espacio cuando hay conversación */}
      {/* En desktop: split view normal */}
      <div className={`
        ${showConversation ? 'flex' : 'hidden lg:flex'}
        flex-1
        w-full lg:w-auto
        min-w-0
        h-full
      `}>
        <ChatConversation 
          conversation={selectedChat} 
          onBack={handleBackToList}
        />
      </div>
    </div>
  );
};

export default WhatsAppView;
