import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  actualizarPlantilla,
  crearPlantilla,
  eliminarPlantilla,
  normalizarNombreYcloud,
  sugerirCodigo,
  validarCodigo,
  validarNombreYcloud,
  type PlantillaSeguimiento,
} from '../../services/plantillasService';

type PlantillasManagerProps = {
  plantillas: PlantillaSeguimiento[];
  /** Leads en cola esperando cada código, para avisar antes de borrar o desactivar. */
  enEspera: Record<number, number>;
  onCambio: () => Promise<void>;
};

type Borrador = { codigo: string; nombre: string; mensaje: string; nombreYcloud: string; activa: boolean };

const vacio = (codigo: number): Borrador => ({ codigo: String(codigo), nombre: '', mensaje: '', nombreYcloud: '', activa: true });

const desdePlantilla = (p: PlantillaSeguimiento): Borrador => ({
  codigo: String(p.codigo),
  nombre: p.nombre,
  mensaje: p.mensaje,
  nombreYcloud: p.nombreYcloud ?? '',
  activa: p.activa,
});

function EstadoPlantilla({ p }: { p: PlantillaSeguimiento }) {
  const [texto, clase] = !p.activa
    ? ['Desactivada', 'bg-muted text-muted-foreground']
    : p.nombreYcloud
      ? ['Lista para enviar', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300']
      : ['Esperando aprobación', 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300'];
  return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', clase)}>{texto}</span>;
}

/**
 * ABM de plantillas genéricas. Flujo: se carga el mensaje y el código; cuando YCloud aprueba la
 * plantilla se completa su nombre y recién ahí el workflow empieza a enviarla.
 */
export function PlantillasManager({ plantillas, enEspera, onCambio }: PlantillasManagerProps) {
  const [editando, setEditando] = useState<PlantillaSeguimiento | 'nueva' | null>(null);
  const [borrador, setBorrador] = useState<Borrador>(vacio(300));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const abrirNueva = () => {
    setBorrador(vacio(sugerirCodigo(plantillas)));
    setError(null);
    setEditando('nueva');
  };

  const abrirEdicion = (p: PlantillaSeguimiento) => {
    setBorrador(desdePlantilla(p));
    setError(null);
    setEditando(p);
  };

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setBorrador((b) => ({ ...b, [k]: v }));

  const guardar = async () => {
    const codigo = Number(borrador.codigo);
    const nombreYcloud = normalizarNombreYcloud(borrador.nombreYcloud);
    const problema =
      validarCodigo(codigo) ??
      (borrador.nombre.trim() === '' ? 'Poné un nombre para reconocerla.' : null) ??
      (borrador.mensaje.trim() === '' ? 'Falta el mensaje de la plantilla.' : null) ??
      validarNombreYcloud(nombreYcloud);
    if (problema) {
      setError(problema);
      return;
    }

    const original = editando !== 'nueva' ? editando : null;
    const esperando = original ? enEspera[original.codigo] ?? 0 : 0;
    if (original && original.codigo !== codigo && esperando > 0) {
      const ok = window.confirm(
        `Hay ${esperando} lead(s) en cola con el código ${original.codigo}. Si lo cambiás a ${codigo}, esos leads quedan fuera de ciclo. ¿Seguir?`,
      );
      if (!ok) return;
    }

    setGuardando(true);
    const datos = { codigo, nombre: borrador.nombre, mensaje: borrador.mensaje, nombreYcloud, activa: borrador.activa };
    const res = original ? await actualizarPlantilla(original.id, datos) : await crearPlantilla(datos);
    setGuardando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditando(null);
    await onCambio();
  };

  const borrar = async (p: PlantillaSeguimiento) => {
    const esperando = enEspera[p.codigo] ?? 0;
    const aviso = esperando > 0 ? `\n\nHay ${esperando} lead(s) en cola esperando esta plantilla: van a quedar fuera de ciclo.` : '';
    if (!window.confirm(`¿Borrar la plantilla "${p.nombre}" (código ${p.codigo})?${aviso}`)) return;
    const res = await eliminarPlantilla(p.id);
    if (!res.ok) window.alert('No se pudo borrar: ' + res.error);
    else await onCambio();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={abrirNueva}>Agregar plantilla</Button>
      </div>

      {plantillas.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay plantillas genéricas.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {plantillas.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums">{p.codigo}</span>
                  <span className="font-medium text-foreground">{p.nombre}</span>
                  <EstadoPlantilla p={p} />
                  {(enEspera[p.codigo] ?? 0) > 0 && (
                    <span className="text-xs text-muted-foreground">{enEspera[p.codigo].toLocaleString('es-AR')} en cola</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  YCloud: {p.nombreYcloud ? <code className="text-foreground">{p.nombreYcloud}</code> : 'sin cargar'}
                </p>
                <p className="line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">{p.mensaje}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => abrirEdicion(p)}>
                  {p.nombreYcloud ? 'Editar' : 'Cargar nombre YCloud'}
                </Button>
                <Button variant="outline" size="sm" className="text-red-700 hover:text-red-800" onClick={() => void borrar(p)}>
                  Borrar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editando !== null} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando === 'nueva' ? 'Nueva plantilla' : 'Editar plantilla'}</DialogTitle>
            <DialogDescription>
              Cargá el mensaje y su código. Cuando YCloud apruebe la plantilla, completá su nombre: recién ahí se empieza a enviar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pl-codigo">Código</Label>
                <Input
                  id="pl-codigo"
                  type="number"
                  inputMode="numeric"
                  value={borrador.codigo}
                  onChange={(e) => set('codigo', e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="pl-nombre">Nombre</Label>
                <Input id="pl-nombre" value={borrador.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej. Baja de valor" />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              El código es el &quot;toque&quot; que elegís en Leads → Seleccionar. Del 0 al 10 y el 100 están reservados.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="pl-mensaje">Mensaje</Label>
              <textarea
                id="pl-mensaje"
                value={borrador.mensaje}
                onChange={(e) => set('mensaje', e.target.value)}
                rows={6}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="El texto tal cual lo enviaste a aprobar"
              />
              <p className="text-xs text-muted-foreground">Queda como nota privada en el chat de Chatwoot cuando se envía.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pl-ycloud">Nombre en YCloud</Label>
              <Input
                id="pl-ycloud"
                value={borrador.nombreYcloud}
                onChange={(e) => set('nombreYcloud', e.target.value)}
                placeholder="Completalo cuando YCloud la apruebe (ej. baja_valor)"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={borrador.activa} onChange={(e) => set('activa', e.target.checked)} />
              Activa (si la desactivás, los leads que la esperan no la reciben)
            </label>

            {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)} disabled={guardando}>Cancelar</Button>
            <Button onClick={() => void guardar()} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
