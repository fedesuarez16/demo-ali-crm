'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '../components/AppLayout';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';
import ModelosTemplatesDialog from '../components/ModelosTemplatesDialog';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

function AsistentePageContent() {
  const searchParams = useSearchParams();
  const assistants = [
    { id: 'tasador', label: 'Tasador' },
    { id: 'ventas', label: 'Ventas' },
    { id: 'modelos', label: 'Modelos' },
  ] as const;

  const [assistantId, setAssistantId] = useState<(typeof assistants)[number]['id']>('tasador');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [chunksCount, setChunksCount] = useState<number | null>(null);
  const [knowledgeText, setKnowledgeText] = useState('');
  const [knowledgeChunkSize, setKnowledgeChunkSize] = useState(1000);
  const [knowledgeOverlap, setKnowledgeOverlap] = useState(200);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeNotice, setKnowledgeNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(
    null
  );
  const [confirmClearChunks, setConfirmClearChunks] = useState(false);
  const [clearingChunks, setClearingChunks] = useState(false);
  const [chunks, setChunks] = useState<Array<{ id: string; content: string; created_at: string }>>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-chat');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo cargar el historial');
        setConversations([]);
        return;
      }
      setConversations(data.conversations || []);
    } catch {
      setError('Error de red al cargar conversaciones');
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadMessages = useCallback(
    async (conversationId: string, opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoadingMessages(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/ai-chat?conversationId=${encodeURIComponent(conversationId)}`
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'No se pudieron cargar los mensajes');
          setMessages([]);
          return;
        }
        setMessages(data.messages || []);
      } catch {
        setError('Error de red al cargar mensajes');
        setMessages([]);
      } finally {
        if (!opts?.silent) setLoadingMessages(false);
      }
    },
    []
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Permite abrir el asistente correcto desde links del sidebar:
  // /asistente?assistantId=tasador | /asistente?assistantId=ventas
  useEffect(() => {
    const fromUrl = searchParams?.get('assistantId');
    if (fromUrl === 'tasador' || fromUrl === 'ventas' || fromUrl === 'modelos') {
      setAssistantId(fromUrl);
    }
  }, [searchParams]);

  const refreshChunksCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai-knowledge?assistantId=${encodeURIComponent(assistantId)}`);
      const data = await res.json();
      if (res.ok) setChunksCount(data.chunksCount ?? 0);
      else setChunksCount(null);
    } catch {
      setChunksCount(null);
    }
  }, [assistantId]);

  useEffect(() => {
    void refreshChunksCount();
  }, [refreshChunksCount]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const startRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const submitRename = async () => {
    if (!editingId || !editTitle.trim()) {
      cancelRename();
      return;
    }
    const id = editingId;
    cancelRename();
    await fetch('/api/ai-chat', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: id, title: editTitle.trim() }),
    });
    await loadConversations();
  };

  const executeDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await fetch(`/api/ai-chat?conversationId=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
      await loadConversations();
    } finally {
      setDeletingId(null);
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInput('');
    setError(null);
  };

  const selectConversation = (id: string) => {
    setActiveConversationId(id);
    setInput('');
    setError(null);
    void loadMessages(id);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    setInput('');

    const optimisticUser: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversationId,
          content: text,
          assistantId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
        setError(data.error || 'No se pudo obtener respuesta');
        return;
      }

      const newConvId = data.conversationId as string;
      setActiveConversationId(newConvId);
      await loadMessages(newConvId, { silent: true });
      await loadConversations();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      setError('Error de red al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage();
  };

  const loadChunks = async (aid: string) => {
    try {
      const res = await fetch(
        `/api/ai-knowledge?assistantId=${encodeURIComponent(aid)}&list=true`
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setChunks(data);
      else setChunks([]);
    } catch {
      setChunks([]);
    }
  };

  const handleDeleteChunk = async (chunkId: string) => {
    try {
      const res = await fetch(
        `/api/ai-knowledge?chunkId=${encodeURIComponent(chunkId)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setChunks((prev) => prev.filter((c) => c.id !== chunkId));
        void refreshChunksCount();
      }
    } catch {
      // silencioso — el chunk sigue visible si falla
    }
  };

  const handleClearChunks = async () => {
    setClearingChunks(true);
    setKnowledgeNotice(null);
    setConfirmClearChunks(false);
    try {
      const res = await fetch(
        `/api/ai-knowledge?assistantId=${encodeURIComponent(assistantId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al borrar');
      setKnowledgeNotice({ type: 'ok', text: 'Todo el conocimiento fue eliminado.' });
      await refreshChunksCount();
    } catch (e) {
      setKnowledgeNotice({
        type: 'error',
        text: e instanceof Error ? e.message : 'Error desconocido',
      });
    } finally {
      setClearingChunks(false);
    }
  };

  const handleKnowledgeUpload = async () => {
    const text = knowledgeText.trim();
    if (!text || knowledgeLoading) return;
    setKnowledgeLoading(true);
    setKnowledgeNotice(null);
    try {
      const res = await fetch('/api/ai-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          assistantId,
          chunkSize: knowledgeChunkSize,
          overlap: knowledgeOverlap,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar');
      setKnowledgeNotice({ type: 'ok', text: `Se insertaron ${data.inserted} chunks.` });
      setKnowledgeText('');
      await refreshChunksCount();
    } catch (e) {
      setKnowledgeNotice({
        type: 'error',
        text: e instanceof Error ? e.message : 'Error desconocido',
      });
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const suggestions = [
    'Resumir el embudo de ventas y próximos pasos con un lead',
    'Ideas de mensaje de seguimiento para un interesado en Palermo',
    'Checklist antes de una visita a propiedad',
  ];

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-8px)] min-h-[480px] border-t border-border bg-background">
        {/* Lista de conversaciones */}
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border bg-muted/30 md:flex">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-[18px]">
            <span className="text-sm font-semibold text-foreground">Chats</span>
            <Button type="button" size="sm" variant="secondary" onClick={startNewChat}>
              Nuevo
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {loadingList ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">Cargando…</p>
              ) : conversations.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  Sin conversaciones aún. Escribe abajo para empezar.
                </p>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      'group relative w-full rounded-lg text-left text-sm transition-colors',
                      activeConversationId === c.id
                        ? 'bg-background font-medium text-foreground shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    )}
                  >
                    {editingId === c.id ? (
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => void submitRename()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); void submitRename(); }
                          if (e.key === 'Escape') cancelRename();
                        }}
                        className="w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground outline-none ring-2 ring-ring"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => selectConversation(c.id)}
                        className="w-full rounded-lg px-3 py-2 text-left"
                      >
                        <span className="line-clamp-2 pr-10">{c.title}</span>
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {new Date(c.updated_at).toLocaleString()}
                        </span>
                      </button>
                    )}

                    {editingId !== c.id && (
                      <div className="absolute right-1.5 top-1.5 hidden items-center gap-0.5 group-hover:flex">
                        <button
                          type="button"
                          title="Renombrar"
                          onClick={(e) => { e.stopPropagation(); startRename(c.id, c.title); }}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          disabled={deletingId === c.id}
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(c.id); }}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Área principal */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
                Asistente IA
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                OpenAI · historial en Supabase
                {assistantId === 'modelos'
                  ? ' · rellena plantillas'
                  : chunksCount != null
                    ? ` · ${chunksCount} chunks de conocimiento`
                    : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <select
                value={assistantId}
                onChange={(e) => {
                  const next = e.target.value as (typeof assistants)[number]['id'];
                  setAssistantId(next);
                  setKnowledgeNotice(null);
                  void refreshChunksCount();
                }}
                className="hidden sm:block rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
                aria-label="Seleccionar asistente"
              >
                {assistants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="md:hidden shrink-0"
                onClick={startNewChat}
              >
                Nuevo chat
              </Button>
            </div>
          </header>

          {error && (
            <div
              className="mx-4 mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
              {loadingMessages && activeConversationId ? (
                <div className="flex justify-center py-12 text-sm text-muted-foreground">
                  Cargando mensajes…
                </div>
              ) : messages.length === 0 && !sending ? (
                <div className="rounded-2xl border border-border bg-muted/20 px-6 py-10 text-center">
                  <p className="text-sm text-muted-foreground mb-6">
                    Pregunta lo que necesites sobre tu operación inmobiliaria. El contexto de
                    esta sesión se guarda automáticamente.
                  </p>
                  <p className="text-xs font-medium text-muted-foreground mb-3">Sugerencias</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setInput(s)}
                        className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'flex',
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[min(100%,36rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-card text-card-foreground'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="border-t border-border bg-card p-4">
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex max-w-3xl gap-2 rounded-2xl border border-border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/20"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Escribe un mensaje… (Enter envía, Shift+Enter nueva línea)"
                rows={1}
                disabled={sending}
                className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
              {assistantId === 'modelos' ? (
                <ModelosTemplatesDialog assistantId={assistantId} disabled={sending} />
              ) : (
              <Dialog
                onOpenChange={(open) => {
                  if (open) {
                    setKnowledgeNotice(null);
                    setConfirmClearChunks(false);
                    void refreshChunksCount();
                    void loadChunks(assistantId);
                  } else {
                    setConfirmClearChunks(false);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={sending}
                    className="shrink-0 self-end"
                    title="Cargar conocimiento"
                  >
                    Conocimiento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[min(90vh,720px)] max-w-2xl overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Cargar conocimiento</DialogTitle>
                    <DialogDescription>
                      Pegá políticas, tablas de tasación o criterios. Se divide en chunks, se generan
                      embeddings y el asistente los usa al responder.
                      {chunksCount != null ? (
                        <span className="mt-2 block font-medium text-foreground">
                          Chunks actuales: {chunksCount}
                        </span>
                      ) : null}
                      <span className="mt-2 block text-xs text-muted-foreground">
                        Asistente seleccionado:{' '}
                        <span className="font-medium text-foreground">{assistantId}</span>
                      </span>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-2">
                    {/* Lista de chunks existentes */}
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Chunks cargados
                      </p>
                      {chunks.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Sin chunks</p>
                      ) : (
                        <div className="max-h-[240px] overflow-y-auto rounded-md border border-input divide-y divide-border">
                          {chunks.map((chunk) => (
                            <div
                              key={chunk.id}
                              className="flex items-start justify-between gap-2 px-3 py-2"
                            >
                              <p className="flex-1 text-xs text-foreground break-words">
                                {chunk.content.length > 100
                                  ? `${chunk.content.slice(0, 100)}…`
                                  : chunk.content}
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => void handleDeleteChunk(chunk.id)}
                                title="Eliminar chunk"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Tamaño chunk (caracteres)
                        </span>
                        <input
                          type="number"
                          value={knowledgeChunkSize}
                          onChange={(e) => setKnowledgeChunkSize(Number(e.target.value))}
                          min={200}
                          max={4000}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Solapamiento</span>
                        <input
                          type="number"
                          value={knowledgeOverlap}
                          onChange={(e) => setKnowledgeOverlap(Number(e.target.value))}
                          min={0}
                          max={1000}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                    <label className="space-y-1.5 block">
                      <span className="text-xs font-medium text-muted-foreground">Texto</span>
                      <textarea
                        value={knowledgeText}
                        onChange={(e) => setKnowledgeText(e.target.value)}
                        placeholder="Ej.: USD/m² por zona, ajustes por amenities, comisiones…"
                        rows={10}
                        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </label>
                    {knowledgeNotice && (
                      <div
                        role="status"
                        className={cn(
                          'rounded-md border px-3 py-2 text-sm',
                          knowledgeNotice.type === 'ok'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'border-destructive/30 bg-destructive/10 text-destructive'
                        )}
                      >
                        {knowledgeNotice.text}
                      </div>
                    )}
                  </div>
                  <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
                    <div className="flex flex-1 justify-start">
                      {confirmClearChunks ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-destructive font-medium">¿Borrar todo?</span>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleClearChunks()}
                            disabled={clearingChunks}
                          >
                            {clearingChunks ? 'Borrando…' : 'Sí, borrar'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmClearChunks(false)}
                            disabled={clearingChunks}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                          onClick={() => setConfirmClearChunks(true)}
                          disabled={knowledgeLoading || clearingChunks || chunksCount === 0}
                        >
                          Borrar todo el conocimiento
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void refreshChunksCount()}
                        disabled={knowledgeLoading}
                      >
                        Actualizar contador
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void handleKnowledgeUpload()}
                        disabled={!knowledgeText.trim() || knowledgeLoading}
                      >
                        {knowledgeLoading ? 'Cargando…' : 'Cargar a chunks'}
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              )}
              <Button type="submit" disabled={sending || !input.trim()} className="shrink-0 self-end">
                Enviar
              </Button>
            </form>
          </div>
        </div>
      </div>
        {/* Dialog confirmar eliminación */}
        <Dialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Eliminar conversación</DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer. Se eliminarán todos los mensajes de la conversación.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => confirmDeleteId && void executeDelete(confirmDeleteId)}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppLayout>
  );
}

export default function AsistentePage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-800">Cargando asistente…</h2>
            </div>
          </div>
        </AppLayout>
      }
    >
      <AsistentePageContent />
    </Suspense>
  );
}
