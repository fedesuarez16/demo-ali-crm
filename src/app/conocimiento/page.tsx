'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Button } from '@/components/ui/button';

export default function ConocimientoPage() {
  const [text, setText] = useState('');
  const [chunkSize, setChunkSize] = useState(1000);
  const [overlap, setOverlap] = useState(200);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'ok' | 'error'; message?: string }>({ type: 'idle' });
  const [count, setCount] = useState<number | null>(null);

  const refreshCount = async () => {
    try {
      const res = await fetch('/api/ai-knowledge');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setCount(data.chunksCount ?? 0);
    } catch {
      setCount(null);
    }
  };

  useEffect(() => {
    void refreshCount();
  }, []);

  const handleUpload = async () => {
    const payload = text.trim();
    if (!payload) return;

    setStatus({ type: 'loading', message: 'Procesando… (chunking + embeddings + guardado)' });
    try {
      const res = await fetch('/api/ai-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: payload, chunkSize, overlap }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setStatus({ type: 'ok', message: `Listo: insertados ${data.inserted} chunks.` });
      setText('');
      await refreshCount();
    } catch (e) {
      setStatus({ type: 'error', message: e instanceof Error ? e.message : 'Error desconocido' });
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Conocimiento del asistente</h1>
          <p className="text-sm text-muted-foreground">
            Pegá texto (políticas, tablas, criterios de tasación). Se guarda como chunks y se usa para responder/cotizar.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Chunks cargados: <span className="font-medium text-foreground">{count ?? '—'}</span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Chunk size (chars)</span>
              <input
                type="number"
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                min={200}
                max={4000}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Overlap (chars)</span>
              <input
                type="number"
                value={overlap}
                onChange={(e) => setOverlap(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                min={0}
                max={1000}
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-xs font-medium text-muted-foreground">Texto</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ej: Tabla de USD/m² por barrio, ajustes por amenities, política de comisión, etc."
              className="min-h-[220px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <Button type="button" onClick={handleUpload} disabled={!text.trim() || status.type === 'loading'}>
              Cargar conocimiento
            </Button>
            <Button type="button" variant="outline" onClick={refreshCount} disabled={status.type === 'loading'}>
              Actualizar contador
            </Button>
          </div>

          {status.type !== 'idle' && (
            <div
              className={[
                'rounded-lg border px-3 py-2 text-sm',
                status.type === 'ok' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : '',
                status.type === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' : '',
                status.type === 'loading' ? 'border-border bg-muted/20 text-muted-foreground' : '',
              ].join(' ')}
              role="status"
            >
              {status.message}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

