'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Users,
  MessageSquare,
  Clock,
  Building2,
  SearchCheck,
  Megaphone,
  Calculator,
  BookOpen,
  LayoutTemplate,
  Search,
  MessageSquarePlus,
  Home,
  Database,
  Map as MapIcon,
  Globe,
  TreePine,
  FileText,
  FolderOpen,
  Sparkles,
  BarChart3,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpRight,
  Menu,
  type LucideIcon,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import LogoutButton from '@/app/components/LogoutButton';

interface MenuItem {
  name: string;
  path: string;
  icon: LucideIcon;
  external?: boolean;
}

interface MenuCategory {
  name: string;
  items: MenuItem[];
  // Icono y link que se muestran cuando la sidebar está colapsada (grupos externos largos)
  collapsedIcon?: LucideIcon;
  collapsedPath?: string;
  external?: boolean;
}

interface SidebarProps {
  onCollapse?: (collapsed: boolean) => void;
}

const PROPSEARCH_URL = 'https://remax-team-ali-scrapper.vercel.app';

const menuCategories: MenuCategory[] = [
  {
    name: 'General',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Gastos', path: '/gastos', icon: Wallet },
      { name: 'Leads', path: '/leads', icon: Users },
    ],
  },
  {
    name: 'Mensajería',
    items: [
      { name: 'Chats', path: '/chat', icon: MessageSquare },
      { name: 'Mensajes Programados', path: '/mensajes-programados', icon: Clock },
    ],
  },
  {
    name: 'Cartera',
    items: [
      { name: 'Propiedades', path: '/propiedades', icon: Building2 },
      { name: 'Búsquedas', path: '/propiedades/busquedas', icon: SearchCheck },
      { name: 'Campañas Activas', path: '/campanas-activas', icon: Megaphone },
    ],
  },
  {
    name: 'Asistentes',
    items: [
      { name: 'Cotizaciones', path: '/asistente?assistantId=tasador', icon: Calculator },
      { name: 'Documentación', path: '/asistente?assistantId=ventas', icon: BookOpen },
      { name: 'Modelos', path: '/asistente?assistantId=modelos', icon: LayoutTemplate },
    ],
  },
  {
    name: 'PropSearch',
    external: true,
    collapsedIcon: Search,
    collapsedPath: `${PROPSEARCH_URL}/chat`,
    items: [
      { name: 'Nueva búsqueda', path: `${PROPSEARCH_URL}/chat`, icon: MessageSquarePlus },
      { name: 'Todas las propiedades', path: `${PROPSEARCH_URL}/properties`, icon: Home },
      { name: 'Buscar en DB', path: `${PROPSEARCH_URL}/search`, icon: Database },
      { name: 'Mapa', path: `${PROPSEARCH_URL}/map`, icon: MapIcon },
      { name: 'Fuentes', path: `${PROPSEARCH_URL}/sources`, icon: Globe },
      { name: 'Barrios cerrados', path: `${PROPSEARCH_URL}/barrios`, icon: TreePine },
      { name: 'Ficha propio', path: `${PROPSEARCH_URL}/ficha-propio`, icon: FileText },
      { name: 'Carpetas', path: `${PROPSEARCH_URL}/historial`, icon: FolderOpen },
      { name: 'Limpieza', path: `${PROPSEARCH_URL}/limpieza`, icon: Sparkles },
      { name: 'Métricas', path: `${PROPSEARCH_URL}/metrics`, icon: BarChart3 },
    ].map((item) => ({ ...item, external: true })),
  },
];

const Sidebar: React.FC<SidebarProps> = ({ onCollapse }) => {
  // Mobile-first: cerrada por defecto para evitar problemas de hidratación;
  // en desktop se abre al montar.
  const [collapsed, setCollapsed] = useState(true);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const isDesktop = window.innerWidth >= 1024;
      setCollapsed(!isDesktop);
      if (onCollapse) onCollapse(!isDesktop);
    }
    // Intencionalmente solo al montar: incluir onCollapse causa un loop porque
    // AppLayout redefine la función en cada render y resetea el estado en mobile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() =>
    // Grupos externos (PropSearch) arrancan plegados
    Object.fromEntries(menuCategories.map((c) => [c.name, !c.external]))
  );

  const toggleCategory = (name: string) => {
    setOpenCategories((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const setCollapsedState = (value: boolean) => {
    setCollapsed(value);
    if (onCollapse) onCollapse(value);
  };

  const renderLink = (item: MenuItem) => {
    const Icon = item.icon;
    const isActive = !item.external && pathname === item.path;
    const className = cn(
      'group relative flex items-center rounded-md text-[13px] transition-colors',
      collapsed ? 'h-9 w-9 justify-center mx-auto' : 'h-8 gap-2.5 px-2.5',
      isActive
        ? 'bg-neutral-100 text-neutral-900 font-medium'
        : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
    );
    const content = (
      <>
        {isActive && !collapsed && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-neutral-900" />
        )}
        <Icon
          className={cn('h-4 w-4 shrink-0', isActive ? 'text-neutral-900' : 'text-neutral-400 group-hover:text-neutral-700')}
          strokeWidth={1.75}
        />
        {!collapsed && <span className="flex-1 truncate">{item.name}</span>}
        {!collapsed && item.external && (
          <ArrowUpRight className="h-3 w-3 shrink-0 text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </>
    );

    if (item.external) {
      return (
        <a
          key={item.path}
          href={item.path}
          target="_blank"
          rel="noopener noreferrer"
          title={collapsed ? item.name : undefined}
          className={className}
        >
          {content}
        </a>
      );
    }
    return (
      <Link key={item.path} href={item.path} title={collapsed ? item.name : undefined} className={className}>
        {content}
      </Link>
    );
  };

  return (
    <>
      {/* Botón flotante para abrir sidebar - solo mobile y con la sidebar cerrada */}
      {collapsed && (
        <button
          onClick={() => setCollapsedState(false)}
          className="lg:hidden fixed top-3 left-3 z-[100] rounded-lg border border-neutral-200 bg-white p-2 text-neutral-700 shadow-sm transition-transform active:scale-95"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Overlay para cerrar sidebar en mobile */}
      {mounted && !collapsed && (
        <div className="lg:hidden fixed inset-0 z-[90] bg-black/40 backdrop-blur-[1px]" onClick={() => setCollapsedState(true)} />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-[95] flex h-screen flex-col border-r border-neutral-200 bg-white transition-all duration-300',
          collapsed ? 'w-16 -translate-x-full lg:translate-x-0' : 'w-[13.6rem] translate-x-0'
        )}
      >
        {/* Header */}
        <div className={cn('flex h-14 items-center border-b border-neutral-100', collapsed ? 'justify-center px-2' : 'justify-between px-4')}>
          {!collapsed && (
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-xs font-semibold text-white">
                TA
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold text-neutral-900">Team Ali</p>
                <p className="truncate text-[11px] text-neutral-400">CRM inmobiliario</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsedState(!collapsed)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation */}
        {/* Radix envuelve el contenido en display:table, lo que rompe el truncate y desborda el ancho */}
        <ScrollArea className="min-h-0 flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
          <nav className={cn('py-3', collapsed ? 'px-2' : 'px-3')}>
            {menuCategories.map((category, index) => {
              const isOpen = openCategories[category.name];

              if (collapsed) {
                // Grupos largos (PropSearch) se resumen en un único botón negro
                const CollapsedIcon = category.collapsedIcon;
                return (
                  <div key={category.name} className={cn('space-y-1', index > 0 && 'mt-3 border-t border-neutral-100 pt-3')}>
                    {CollapsedIcon ? (
                      <a
                        href={category.collapsedPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={category.name}
                        className="mx-auto flex h-9 w-9 items-center justify-center rounded-md bg-black text-white transition-colors hover:bg-neutral-800"
                      >
                        <CollapsedIcon className="h-4 w-4" strokeWidth={1.75} />
                      </a>
                    ) : (
                      category.items.map(renderLink)
                    )}
                  </div>
                );
              }

              return (
                <div key={category.name} className={cn(index > 0 && 'mt-5')}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.name)}
                    className={cn(
                      'group mb-1 flex w-full items-center justify-between transition-colors',
                      category.external
                        ? 'h-9 rounded-md bg-black px-2.5 text-[13px] font-medium text-white hover:bg-neutral-800'
                        : 'px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400 hover:text-neutral-700'
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      {category.collapsedIcon && <category.collapsedIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} />}
                      {category.name}
                    </span>
                    <ChevronDown className={cn('h-3 w-3 transition-transform', !isOpen && '-rotate-90')} />
                  </button>
                  {isOpen && <div className="space-y-0.5">{category.items.map(renderLink)}</div>}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        {!collapsed && (
          <div className="border-t border-neutral-100 p-3">
            <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
                UA
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13px] font-medium text-neutral-900">Usuario admin</p>
                <p className="truncate text-[11px] text-neutral-400">Admin</p>
              </div>
              <LogoutButton />
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
