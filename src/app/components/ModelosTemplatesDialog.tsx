'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';

type Template = {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type Notice = { type: 'ok' | 'error'; text: string } | null;

export default function ModelosTemplatesDialog({
  assistantId,
  disabled,
}: {
  assistantId: string;
  disabled?: boolean;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  // Editor: editingId === 'new' para alta; un id para edición.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai-templates?assistantId=${encodeURIComponent(assistantId)}`);
      const data = await res.json();
      if (res.ok) setTemplates(data.templates || []);
      else {
        setTemplates([]);
        setNotice({ type: 'error', text: data.error || 'No se pudieron cargar las plantillas.' });
      }
    } catch {
      setTemplates([]);
      setNotice({ type: 'error', text: 'Error de red al cargar plantillas.' });
    } finally {
      setLoading(false);
    }
  }, [assistantId]);

  const resetEditor = () => {
    setEditingId(null);
    setDraftName('');
    setDraftContent('');
  };

  const startNew = () => {
    setNotice(null);
    setEditingId('new');
    setDraftName('');
    setDraftContent('');
  };

  const startEdit = (t: Template) => {
    setNotice(null);
    setEditingId(t.id);
    setDraftName(t.name);
    setDraftContent(t.content);
  };

  const saveDraft = async () => {
    const name = draftName.trim();
    const content = draftContent.trim();
    if (!name || !content || saving) return;

    setSaving(true);
    setNotice(null);
    try {
      const isNew = editingId === 'new';
      const res = await fetch('/api/ai-templates', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isNew ? { assistantId, name, content } : { id: editingId, name, content }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setNotice({ type: 'ok', text: isNew ? 'Plantilla creada.' : 'Plantilla actualizada.' });
      resetEditor();
      await loadTemplates();
    } catch (e) {
      setNotice({ type: 'error', text: e instanceof Error ? e.message : 'Error desconocido' });
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/ai-templates?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        if (editingId === id) resetEditor();
      }
    } catch {
      // silencioso
    }
  };

  // Recarga al abrir el diálogo.
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setNotice(null);
      resetEditor();
      void loadTemplates();
    } else {
      resetEditor();
      setConfirmDeleteId(null);
    }
  };

  // Recuenta los corchetes pendientes en el borrador (ayuda visual).
  const bracketCount = (draftContent.match(/\[[^\]]+\]/g) || []).length;

  useEffect(() => {
    // nada: la carga ocurre al abrir
  }, []);

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="shrink-0 self-end"
          title="Gestionar plantillas"
        >
          Plantillas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(90vh,760px)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plantillas de documentos</DialogTitle>
          <DialogDescription>
            Cargá el modelo completo (ej. oferta de compra). Marcá los datos a completar entre
            corchetes, ej. <code className="text-foreground">[NOMBRE Y APELLIDO]</code>. El asistente
            te pide esos datos en el chat y devuelve el documento completo, textual.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Lista de plantillas */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Plantillas cargadas{loading ? ' (cargando…)' : ` (${templates.length})`}
              </p>
              {editingId === null && (
                <Button type="button" size="sm" variant="secondary" onClick={startNew}>
                  Nueva plantilla
                </Button>
              )}
            </div>
            {templates.length === 0 && !loading ? (
              <p className="text-xs text-muted-foreground italic">Sin plantillas todavía.</p>
            ) : (
              <div className="max-h-[200px] overflow-y-auto rounded-md border border-input divide-y divide-border">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {(t.content.match(/\[[^\]]+\]/g) || []).length} campos · actualizada{' '}
                        {new Date(t.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(t)}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </Button>
                      {confirmDeleteId === t.id ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => void deleteTemplate(t.id)}
                        >
                          Confirmar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDeleteId(t.id)}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Editor */}
          {editingId !== null && (
            <div className="grid gap-3 rounded-md border border-input p-3">
              <p className="text-xs font-medium text-muted-foreground">
                {editingId === 'new' ? 'Nueva plantilla' : 'Editar plantilla'}
              </p>
              <label className="space-y-1.5 block">
                <span className="text-xs font-medium text-muted-foreground">Nombre</span>
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Ej.: Oferta de compra ad referéndum"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1.5 block">
                <span className="text-xs font-medium text-muted-foreground">
                  Contenido (con [CORCHETES] donde van los datos) · {bracketCount} campos detectados
                </span>
                <textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Pegá el modelo completo del documento…"
                  rows={12}
                  className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetEditor} disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => void saveDraft()}
                  disabled={!draftName.trim() || !draftContent.trim() || saving}
                >
                  {saving ? 'Guardando…' : 'Guardar plantilla'}
                </Button>
              </div>
            </div>
          )}

          {notice && (
            <div
              role="status"
              className={cn(
                'rounded-md border px-3 py-2 text-sm',
                notice.type === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              )}
            >
              {notice.text}
            </div>
          )}
        </div>

        <DialogFooter>
          <p className="text-xs text-muted-foreground">
            En el chat, pedí el documento y pasá los datos. El asistente completa los corchetes.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
