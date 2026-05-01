'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

interface MenuCategory {
  name: string;
  items: MenuItem[];
}

interface SidebarProps {
  onCollapse?: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onCollapse }) => {
  // En mobile, la sidebar debe estar cerrada por defecto
  // En desktop, abierta por defecto
  // Usar true por defecto para evitar problemas de hidratación (mobile-first)
  const [collapsed, setCollapsed] = useState(true);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  
  // Ajustar según el tamaño de la ventana solo al montar (una sola vez)
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const isDesktop = window.innerWidth >= 1024;
      if (isDesktop) {
        setCollapsed(false);
        if (onCollapse) onCollapse(false);
      } else {
        setCollapsed(true);
        if (onCollapse) onCollapse(true);
      }
    }
    // Intencionalmente solo al montar: incluir onCollapse causa un loop porque
    // AppLayout redefine la función en cada render y resetea el estado en mobile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const menuCategories: MenuCategory[] = [
    {
      name: 'General',
      items: [
        {
          name: 'Dashboard',
          path: '/dashboard',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },

        {
          name: 'Leads',
          path: '/leads',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },

      ],
    },

    {
      name: 'Mensajería',
      items: [

        {
          name: 'Chats',
          path: '/chat',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          ),
        },
        
       
        {
          name: 'Mensajes Programados',
          path: '/mensajes-programados',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        
       
      ],
    },


   
    {
      name: 'Cartera',
      items: [
       
       
        {
          name: 'Propiedades',
          path: '/propiedades',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8a4 4 0 014-4h10a4 4 0 014 4v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 12h.01M11 12h.01M15 12h.01" />
            </svg>
          ),
        },
        {
          name: 'Búsquedas',
          path: '/propiedades/busquedas',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          ),
        },
        {
          name: 'Campanas Activas',
          path: '/campanas-activas',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3v18M6 8l5-5 5 5M5 13h4m6 0h4m-9 4h6m-3-4v7" />
            </svg>
          ),
        },
      ],
    },

    {
      name: 'Asistentes',
      items: [
        {
          name: 'Cotizaciones',
          path: '/asistente?assistantId=tasador',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2 2 4-4m5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          name: 'Documentación',
          path: '/asistente?assistantId=ventas',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
      ],
    },
    
  ];

  // Estado para expandir/colapsar categorías (Inbound / Outbound / General)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuCategories.forEach((category) => {
      initial[category.name] = true;
    });
    return initial;
  });

  const toggleCategory = (name: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const toggleSidebar = () => {
    const newCollapsedState = !collapsed;
    console.log('🔄 Toggle sidebar:', { from: collapsed, to: newCollapsedState });
    setCollapsed(newCollapsedState);
    if (onCollapse) {
      onCollapse(newCollapsedState);
    }
  };

  return (
    <>
      {/* Botón flotante para abrir sidebar - Solo en mobile y solo cuando la sidebar está cerrada */}
      {collapsed && (
        <button
          onClick={toggleSidebar}
          className="lg:hidden fixed top-3 left-3 z-[100] bg-black text-white rounded-lg p-2.5 shadow-2xl transition-transform duration-150 active:scale-95"
          aria-label="Abrir menú"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Overlay para cerrar sidebar en mobile */}
      {mounted && !collapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-[90]"
          onClick={() => {
            setCollapsed(true);
            if (onCollapse) onCollapse(true);
          }}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "flex h-screen flex-col bg-card border-r border-border transition-all duration-300 z-[95]",
        // Ancho según estado
        collapsed ? "w-16" : "w-[13.6rem]",
        // En desktop: siempre visible, fixed
        "lg:fixed lg:left-0 lg:top-0",
        // En mobile: overlay que se desliza desde la izquierda, NO ocupa espacio cuando está cerrada
        "fixed left-0 top-0",
        // Transform: en mobile, oculta cuando collapsed=true, visible cuando collapsed=false
        // IMPORTANTE: El orden importa - primero el transform mobile, luego el override de desktop
        collapsed 
          ? "-translate-x-full lg:translate-x-0" 
          : "translate-x-0"
      )}>
      {/* Header */}
      <div className="flex h-12  bg-slate-100 items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center  gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              A
            </div>
            <div className="font-semibold text-smtext-foreground">Team Ali</div>
          </div>
        )}
        <Button 
          onClick={toggleSidebar}
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          {collapsed ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1  px-3 py-4">
        <nav className="space-y-4 ">
          {menuCategories.map((category) => {
            const isOpen = openCategories[category.name];
            return (
              <div key={category.name} className="space-y-2 ">
                {/* Category Label (con desplegable) */}
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.name)}
                    className="flex w-full items-center justify-between px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    <span>{category.name}</span>
                    <svg
                      className={cn(
                        "h-3 w-3 transition-transform",
                        isOpen ? "rotate-90" : "rotate-0"
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                )}
                
                {/* Category Items */}
                <div className="space-y-1 ">
                  {category.items.map((item) => {
                    const isActive = pathname === item.path;
                    const shouldShow = collapsed || isOpen;
                    if (!shouldShow) return null;
                    
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={cn(
                          "flex  items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors",
                          "hover:bg-slate-100 hover:text-accent-foreground",
                          isActive 
                            ? "bg-slate-100 text-accent-foreground font-medium" 
                            : "text-muted-foreground"
                        )}
                      >
                        <div className="flex h-4 w-4 items-center justify-center">
                          {item.icon}
                        </div>
                        {!collapsed && (
                          <span className="truncate">{item.name}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-border p-4 bg-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Usuario admin</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default Sidebar;