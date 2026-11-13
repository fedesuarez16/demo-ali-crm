// Módulo PURO: decide qué hacer con rueda_matches dado lo existente y los pares recién evaluados.
// Reglas: descartado intocable; bajo umbral => borrar si estado_origen='sistema', ocultar (bajo_umbral=true)
// si 'usuario'; par recuperado => des-ocultar; score_updated_at solo si cambian score/motivos.
import type { EstadoOrigen, MatchEstado, Motivo } from '@/app/types';

export interface FilaExistente {
  id: number;
  busqueda_id: number;
  propiedad_id: number;
  score: number;
  motivos: Motivo[];
  estado: MatchEstado;
  estado_origen: EstadoOrigen;
  bajo_umbral: boolean;
}

export interface ParEvaluado {
  busqueda_id: number;
  propiedad_id: number;
  score: number;
  motivos: Motivo[];
  /** Resultado de scorePair().persistible (no eliminado, peso evaluado suficiente y score >= umbral) */
  persistible: boolean;
}

export interface PlanSync {
  insertar: Array<{ busqueda_id: number; propiedad_id: number; score: number; motivos: Motivo[] }>;
  actualizar: Array<{ id: number; score: number; motivos: Motivo[]; bajo_umbral: boolean; scoreCambio: boolean }>;
  ocultar: Array<{ id: number; score: number; motivos: Motivo[] }>;
  eliminar: number[];
  sinCambios: number;
  resumen: { creados: number; actualizados: number; ocultos: number; eliminados: number; sin_cambios: number };
}

const clave = (b: number, p: number) => `${b}:${p}`;
const mismosMotivos = (a: Motivo[], b: Motivo[]) => JSON.stringify(a) === JSON.stringify(b);

export function planificarSync(existentes: FilaExistente[], evaluados: ParEvaluado[]): PlanSync {
  const porPar = new Map(existentes.map((f) => [clave(f.busqueda_id, f.propiedad_id), f]));
  const plan: PlanSync = {
    insertar: [], actualizar: [], ocultar: [], eliminar: [], sinCambios: 0,
    resumen: { creados: 0, actualizados: 0, ocultos: 0, eliminados: 0, sin_cambios: 0 },
  };

  for (const ev of evaluados) {
    const fila = porPar.get(clave(ev.busqueda_id, ev.propiedad_id));

    if (!fila) {
      if (ev.persistible) {
        plan.insertar.push({ busqueda_id: ev.busqueda_id, propiedad_id: ev.propiedad_id, score: ev.score, motivos: ev.motivos });
      }
      continue;
    }

    if (fila.estado === 'descartado') {
      plan.sinCambios++;
      continue;
    }

    const scoreCambio = fila.score !== ev.score || !mismosMotivos(fila.motivos, ev.motivos);

    if (ev.persistible) {
      if (fila.bajo_umbral || scoreCambio) {
        plan.actualizar.push({ id: fila.id, score: ev.score, motivos: ev.motivos, bajo_umbral: false, scoreCambio });
      } else {
        plan.sinCambios++;
      }
      continue;
    }

    // No persistible
    if (fila.estado_origen === 'sistema') {
      plan.eliminar.push(fila.id);
    } else if (!fila.bajo_umbral) {
      plan.ocultar.push({ id: fila.id, score: ev.score, motivos: ev.motivos });
    } else if (scoreCambio) {
      plan.actualizar.push({ id: fila.id, score: ev.score, motivos: ev.motivos, bajo_umbral: true, scoreCambio });
    } else {
      plan.sinCambios++;
    }
  }

  plan.resumen = {
    creados: plan.insertar.length,
    actualizados: plan.actualizar.length,
    ocultos: plan.ocultar.length,
    eliminados: plan.eliminar.length,
    sin_cambios: plan.sinCambios,
  };
  return plan;
}
