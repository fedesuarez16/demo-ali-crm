'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarCollapse = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  };

  return (
    <div className="bg-white h-full min-h-screen">
      <Sidebar onCollapse={handleSidebarCollapse} />
      <div className={`${sidebarCollapsed ? 'pl-16' : 'pl-[13.6rem]'} transition-all duration-300`}>
        <main className="">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout; 