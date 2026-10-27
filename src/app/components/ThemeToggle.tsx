'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THEME_STORAGE_KEY } from '@/lib/theme';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, showLabel = false }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // Sin storage (modo privado): el cambio vale solo para esta pestaña
    }
    setIsDark(next);
  };

  const label = isDark ? 'Modo claro' : 'Modo oscuro';
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={cn(
        'flex items-center gap-2 rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700',
        showLabel ? 'h-8 px-2.5 text-[13px]' : 'h-7 w-7 justify-center',
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      {showLabel && <span>{label}</span>}
    </button>
  );
};

export default ThemeToggle;
