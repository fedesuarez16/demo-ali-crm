'use client';

import React, { useState } from 'react';
import ChatList from './ChatList';
import ChatConversation from './ChatConversation';

const WhatsAppView = ({ targetPhoneNumber }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [showConversation, setShowConversation] = useState(false);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setShowConversation(true);
  };

  const handleBackToList = () => {
    setShowConversation(false);
    setSelectedChat(null);
  };

  return (
    <div className="flex h-full -m-2"> {/* Compensar el padding del main */}
      {/* Panel izquierdo - Lista de chats */}
      <div className={`${
        showConversation ? 'hidden lg:flex' : 'flex'
      } flex-col w-full lg:w-1/3 xl:w-1/4 border-r border-gray-200 bg-white`}>
        <div className="flex-1 overflow-hidden">
          <ChatList 
            onSelectChat={handleSelectChat} 
            selectedChat={selectedChat}
            targetPhoneNumber={targetPhoneNumber}
          />
        </div>
      </div>

      {/* Panel derecho - Conversación */}
      <div className={`${
        showConversation ? 'flex' : 'hidden lg:flex'
      } flex-1`}>
        <ChatConversation 
          conversation={selectedChat} 
          onBack={handleBackToList}
        />
      </div>
    </div>
  );
};

export default WhatsAppView;
