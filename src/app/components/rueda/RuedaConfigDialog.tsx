'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getConfig, putConfig, backfillRueda, type ResumenRecalculo } from '../../services/ruedaService';
import { validarConfig } from '@/lib/rueda/validarConfig';
import { configAForm, formAConfig, etiquetaResumenRecalculo, type ConfigForm } from '../../utils/ruedaUi';
import type { RuedaConfig } from '../../types';

const PESOS_LABELS: Record<keyof RuedaConfig['pesos'], string> = {
  precio: 'Precio',
  zona: 'Zona',
  tipo: 'Tipo',
  dormitorios: 'Dormitorios',
  m2: 'm²',
  caracteristicas: 'Características',
  forma_pago: 'Forma de pago',
  necesidades: 'Necesidades',
};

const inputCls = 'w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

function Campo({ label, ayuda, children }: { label: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {ayuda && <span className="block text-[11px] text-gray-500 mt-0.5">{ayuda}</span>}
    </label>
  );
}

export function RuedaConfigDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [form, setForm] = useState<ConfigForm | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [resumen, setResumen] = useState<ResumenRecalculo | null>(null);
  const [continuando, setContinuando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrores([]);
    setResumen(null);
    setCargando(true);
    getConfig()
      .then((c) => setForm(configAForm(c)))
      .catch((e) => setErrores([e?.message || 'No se pudo cargar la configuración']))
      .finally(() => setCargando(false));
  }, [open]);

  const set = <K extends keyof ConfigForm>(k: K, v: ConfigForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const guardar = async () => {
    if (!form) return;
    setErrores([]);
    setResumen(null);
    const candidata = formAConfig(form);
    const v = validarConfig(candidata);
    if (!v.ok) {
      setErrores(v.errores);
      return;
    }
    setGuardando(true);
    try {
      const { recalculo } = await putConfig(v.config);
      setResumen(recalculo);
      if (!recalculo) setResumen({ creados: 0, actualizados: 0, ocultos: 0, eliminados: 0, sin_cambios: 0, errores: 0, stale_restantes: 0 });
    } catch (e: any) {
      setErrores(Array.isArray(e?.errores) && e.errores.length ? e.errores : [e?.message || 'No se pudo guardar']);
    } finally {
      setGuardando(false);
    }
  };

  const seguir = async () => {
    setContinuando(true);
    try {
      const r = await backfillRueda();
      setResumen((prev) => ({
        ...(prev as ResumenRecalculo),
        creados: (prev?.creados ?? 0) + r.acumulado.creados,
        actualizados: (prev?.actualizados ?? 0) + r.acumulado.actualizados,
        ocultos: (prev?.ocultos ?? 0) + r.acumulado.ocultos,
        eliminados: (prev?.eliminados ?? 0) + r.acumulado.eliminados,
        stale_restantes: r.stale_restantes,
      }));
    } catch (e: any) {
      setErrores([e?.message || 'Error al recalcular']);
    } finally {
      setContinuando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar matching</DialogTitle>
          <DialogDescription>Pesos y umbrales de la Rueda de Negocios. Al guardar se recalculan todos los matches.</DialogDescription>
        </DialogHeader>

        {cargando && <p className="text-sm text-gray-500">Cargando…</p>}

        {form && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-800 mb-2">Pesos por criterio</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.keys(PESOS_LABELS) as Array<keyof RuedaConfig['pesos']>).map((k) => (
                  <Campo key={k} label={PESOS_LABELS[k]}>
                    <input className={inputCls} inputMode="decimal" value={form.pesos[k]} onChange={(e) => set('pesos', { ...form.pesos, [k]: e.target.value })} />
                  </Campo>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Campo label="Umbral mínimo (0-100)" ayuda="Matches por debajo no se muestran.">
                <input className={inputCls} inputMode="decimal" value={form.umbral} onChange={(e) => set('umbral', e.target.value)} />
              </Campo>
              <Campo label="Tolerancia de precio (%)" ayuda="Sobre el presupuesto máximo.">
                <input className={inputCls} inputMode="decimal" value={form.precio_tolerancia} onChange={(e) => set('precio_tolerancia', e.target.value)} />
              </Campo>
              <Campo label="Peso mínimo evaluado" ayuda="Suma mínima de pesos con dato.">
                <input className={inputCls} inputMode="decimal" value={form.peso_minimo_evaluado} onChange={(e) => set('peso_minimo_evaluado', e.target.value)} />
              </Campo>
              <Campo label="Crédito zona cercana (%)">
                <input className={inputCls} inputMode="decimal" value={form.zona_cercana_credito} onChange={(e) => set('zona_cercana_credito', e.target.value)} />
              </Campo>
              <Campo label="Multiplicador zona distinta (%)" ayuda="Se aplica al puntaje final.">
                <input className={inputCls} inputMode="decimal" value={form.zona_mismatch_multiplicador} onChange={(e) => set('zona_mismatch_multiplicador', e.target.value)} />
              </Campo>
              <Campo label="Moneda por defecto">
                <select className={inputCls} value={form.moneda_default} onChange={(e) => set('moneda_default', e.target.value as 'USD' | 'ARS')}>
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </Campo>
              <Campo label="ARS por USD" ayuda="Vacío: monedas distintas = sin dato.">
                <input className={inputCls} inputMode="decimal" value={form.ars_por_usd} onChange={(e) => set('ars_por_usd', e.target.value)} />
              </Campo>
            </div>

            <Campo
              label="Zonas (alias y vecindad)"
              ayuda="Una por línea: nombre | alias, alias | vecinas, vecinas. La vecindad es simétrica. Si una zona no figura acá, se usan las zonas cercanas del LLM."
            >
              <textarea
                className={`${inputCls} font-mono text-xs`}
                rows={8}
                spellCheck={false}
                value={form.zonas}
                onChange={(e) => set('zonas', e.target.value)}
              />
            </Campo>

            <div className="flex flex-col gap-1.5 text-sm text-gray-700">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.precio_fuera_tolerancia_elimina} onChange={(e) => set('precio_fuera_tolerancia_elimina', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                Eliminar el match si el precio supera la tolerancia
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.tipo_eliminatorio} onChange={(e) => set('tipo_eliminatorio', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                Eliminar el match si el tipo de propiedad no coincide
              </label>
            </div>

            {errores.length > 0 && (
              <ul className="text-sm text-red-600 list-disc pl-5">
                {errores.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}

            {resumen && (
              <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
                Configuración guardada. Recálculo: {etiquetaResumenRecalculo(resumen)}.
                {resumen.stale_restantes > 0 && (
                  <>
                    {' '}Quedan {resumen.stale_restantes} filas por normalizar.{' '}
                    <button type="button" onClick={seguir} disabled={continuando} className="underline font-medium disabled:opacity-50">
                      {continuando ? 'Recalculando…' : 'Seguir recalculando'}
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
                Cerrar
              </button>
              <button type="button" onClick={guardar} disabled={guardando || continuando} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50">
                {guardando ? 'Guardando y recalculando…' : 'Guardar y recalcular'}
              </button>
            </div>
          </div>
        )}
        {!form && !cargando && errores.length > 0 && (
          <ul className="text-sm text-red-600 list-disc pl-5">
            {errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
