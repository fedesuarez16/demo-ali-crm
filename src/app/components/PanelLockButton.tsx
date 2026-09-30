'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** Cierra la sesión del panel (Dashboard y Gastos) sin cerrar la sesión general */
export function PanelLockButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [cerrando, setCerrando] = useState(false);

  const handleClick = async () => {
    setCerrando(true);
    try {
      await fetch('/api/panel-auth', { method: 'DELETE' });
    } finally {
      router.replace(`/acceso-panel?next=${encodeURIComponent(pathname)}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={cerrando}
      title="Bloquear Dashboard y Gastos"
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input px-2.5 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-slate-50 hover:text-foreground disabled:opacity-50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      Bloquear
    </button>
  );
}
