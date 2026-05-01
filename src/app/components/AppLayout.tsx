'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarCollapse = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  }, []);

  return (
    <div className="bg-white h-full min-h-screen">
      <Sidebar onCollapse={handleSidebarCollapse} />
      {/* En mobile: sin padding porque la sidebar no ocupa espacio (está desacoplada) */}
      {/* En desktop: padding según el estado de la sidebar */}
      <div
        className={`min-w-0 max-w-full lg:transition-all lg:duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-[13.6rem]'}`}
      >
        <main className="min-w-0 max-w-full">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout; 