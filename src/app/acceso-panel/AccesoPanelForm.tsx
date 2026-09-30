'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PANEL_SECTIONS, type PanelSection } from '@/lib/panelAuth';

export default function AccesoPanelForm({ next, section }: { next: string; section: PanelSection }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const destino = PANEL_SECTIONS[section].label;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch('/api/panel-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'No se pudo validar la contraseña');
        setPassword('');
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError('Error de conexión. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Acceso a {destino}</h1>
            <p className="text-sm text-muted-foreground">
              Dashboard y Gastos comparten una contraseña propia, distinta a la de tu usuario.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="panel-password">Contraseña del panel</Label>
              <Input
                id="panel-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="off"
                autoFocus
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={enviando || !password}>
              {enviando ? 'Verificando…' : 'Ingresar'}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            El acceso dura 12 horas en este navegador.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
