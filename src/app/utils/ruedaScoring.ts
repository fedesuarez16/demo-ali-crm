// Módulo PURO: sin I/O ni imports de Supabase/Next. Usable en cliente, API routes y tests.
import type { Motivo, RuedaConfig, RuedaNormalizado, RuedaZona } from '../types';
import { DEFAULT_ZONAS, canonizarZona, relacionZonas } from './ruedaZonas';

export const DEFAULT_RUEDA_CONFIG: RuedaConfig = {
  pesos: {
    precio: 25, zona: 25, tipo: 10, dormitorios: 10,
    m2: 10, caracteristicas: 10, forma_pago: 5, necesidades: 5,
  },
  precio_tolerancia: 0.1,
  precio_fuera_tolerancia_elimina: true,
  tipo_eliminatorio: true,
  zona_cercana_credito: 0.6,
  zona_mismatch_multiplicador: 0.7,
  zonas: DEFAULT_ZONAS,
  umbral: 50,
  peso_minimo_evaluado: 35,
  moneda_default: 'USD',
  ars_por_usd: null,
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Forma válida de la tabla de zonas (lista, posiblemente vacía). */
export const esTablaZonas = (v: unknown): v is RuedaZona[] =>
  Array.isArray(v) &&
  v.every(
    (z) =>
      !!z && typeof z === 'object' && typeof z.nombre === 'string' && z.nombre.trim() !== '' &&
      Array.isArray(z.alias) && z.alias.every((a: unknown) => typeof a === 'string') &&
      Array.isArray(z.vecinas) && z.vecinas.every((a: unknown) => typeof a === 'string'),
  );

export function mergeConfig(raw: unknown): RuedaConfig {
  const base: RuedaConfig = { ...DEFAULT_RUEDA_CONFIG, pesos: { ...DEFAULT_RUEDA_CONFIG.pesos }, zonas: DEFAULT_ZONAS };
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;

  const pesosRaw = r.pesos && typeof r.pesos === 'object' ? (r.pesos as Record<string, unknown>) : {};
  const pesos = { ...base.pesos };
  (Object.keys(pesos) as Array<keyof typeof pesos>).forEach((k) => {
    const v = pesosRaw[k];
    if (isNum(v) && v >= 0) pesos[k] = v;
  });
  const sumaPesos = Object.values(pesos).reduce((a, b) => a + b, 0);
  base.pesos = sumaPesos > 0 ? pesos : { ...DEFAULT_RUEDA_CONFIG.pesos };

  if (isNum(r.precio_tolerancia) && r.precio_tolerancia >= 0 && r.precio_tolerancia <= 1) base.precio_tolerancia = r.precio_tolerancia;
  if (isNum(r.zona_cercana_credito) && r.zona_cercana_credito >= 0 && r.zona_cercana_credito <= 1) base.zona_cercana_credito = r.zona_cercana_credito;
  if (isNum(r.zona_mismatch_multiplicador) && r.zona_mismatch_multiplicador >= 0 && r.zona_mismatch_multiplicador <= 1) base.zona_mismatch_multiplicador = r.zona_mismatch_multiplicador;
  if (isNum(r.umbral) && r.umbral >= 0 && r.umbral <= 100) base.umbral = r.umbral;
  if (isNum(r.peso_minimo_evaluado) && r.peso_minimo_evaluado >= 0) base.peso_minimo_evaluado = r.peso_minimo_evaluado;
  if (esTablaZonas(r.zonas)) base.zonas = r.zonas;
  if (typeof r.precio_fuera_tolerancia_elimina === 'boolean') base.precio_fuera_tolerancia_elimina = r.precio_fuera_tolerancia_elimina;
  if (typeof r.tipo_eliminatorio === 'boolean') base.tipo_eliminatorio = r.tipo_eliminatorio;
  if (r.moneda_default === 'USD' || r.moneda_default === 'ARS') base.moneda_default = r.moneda_default;
  if (r.ars_por_usd === null) base.ars_por_usd = null;
  else if (isNum(r.ars_por_usd) && r.ars_por_usd > 0) base.ars_por_usd = r.ars_por_usd;
  return base;
}

// ───────────── Utilidades ─────────────

const EPS = 1e-9;
const redondear = (n: number): number => Math.round(n + EPS); // half-up para positivos

const slug = (s: string): string =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

/** es-AR: miles con punto, decimales con coma. */
const fmt = (n: number, maxDec = 0): string => {
  const factor = 10 ** maxDec;
  const rounded = Math.round(n * factor + EPS) / factor;
  const [ent, dec] = String(rounded).split('.');
  const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec ? `${miles},${dec}` : miles;
};

const capitalizar = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const listar = (items: string[]): string =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;

export interface ScorePairResult {
  score: number;
  motivos: Motivo[];
  eliminado: boolean;
  motivoEliminacion: string | null;
  persistible: boolean;
}

type Criterio = keyof RuedaConfig['pesos'];
interface Evaluacion { credito: number | null; motivo: Motivo }

const estadoDe = (credito: number): Motivo['estado'] =>
  credito >= 1 - EPS ? 'ok' : credito <= EPS ? 'falla' : 'parcial';

const sinDato = (criterio: Criterio, texto?: string): Evaluacion => ({
  credito: null,
  motivo: { criterio, estado: 'sin_dato', texto: texto ?? `Sin dato de ${NOMBRE_CRITERIO[criterio]}` },
});

const NOMBRE_CRITERIO: Record<Criterio, string> = {
  precio: 'precio', zona: 'zona', tipo: 'tipo', dormitorios: 'dormitorios', m2: 'm²',
  caracteristicas: 'características', forma_pago: 'forma de pago', necesidades: 'necesidades',
};

const LABEL_FORMA_PAGO: Record<string, string> = {
  apto_credito: 'apto crédito', permuta: 'permuta', contado: 'contado', financiacion: 'financiación',
};

const unico = <T,>(xs: T[]): T[] => Array.from(new Set(xs));

// ───────────── Criterios (uno por función, todos puros) ─────────────

type Eval = Evaluacion & { eliminado?: string; zonaFalla?: boolean };

const ok = (criterio: Criterio, credito: number, texto: string): Eval => ({
  credito,
  motivo: { criterio, estado: estadoDe(credito), texto },
});

function evalTipo(b: RuedaNormalizado, p: RuedaNormalizado, cfg: RuedaConfig): Eval {
  if (b.tipos.length === 0 || p.tipos.length === 0) return sinDato('tipo');
  const comun = p.tipos.find((t) => b.tipos.includes(t));
  if (comun) return ok('tipo', 1, `Tipo ${comun} coincide`);
  const texto = `Tipo ${p.tipos.join('/')} distinto de lo buscado (${b.tipos.join('/')})`;
  return { ...ok('tipo', 0, texto), eliminado: cfg.tipo_eliminatorio ? texto : undefined };
}

function evalPrecio(b: RuedaNormalizado, p: RuedaNormalizado, cfg: RuedaConfig): Eval {
  const monedaB = b.moneda ?? cfg.moneda_default;
  const monedaP = p.moneda ?? cfg.moneda_default;
  const bMax = b.precio_max;
  let pPrecio = p.precio_max ?? p.precio_min;
  if (bMax === null || pPrecio === null || bMax <= 0) return sinDato('precio');
  if (monedaB !== monedaP) {
    if (!cfg.ars_por_usd) return sinDato('precio', 'Monedas distintas');
    pPrecio = monedaP === 'ARS' ? pPrecio / cfg.ars_por_usd : pPrecio * cfg.ars_por_usd;
  }
  const exceso = pPrecio / bMax - 1;
  if (exceso <= EPS) {
    return ok('precio', 1, `Precio ${monedaB} ${fmt(pPrecio)} dentro del presupuesto (hasta ${monedaB} ${fmt(bMax)})`);
  }
  if (exceso <= cfg.precio_tolerancia + EPS) {
    const s = 1 - (0.5 * exceso) / cfg.precio_tolerancia;
    return ok(
      'precio', s,
      `Precio ${monedaB} ${fmt(pPrecio)}, ${fmt(exceso * 100, 1)}% sobre el presupuesto (tolerancia ${fmt(cfg.precio_tolerancia * 100, 1)}%)`,
    );
  }
  const texto = `Supera el presupuesto en ${fmt(exceso * 100, 1)}%`;
  return { ...ok('precio', 0, texto), eliminado: cfg.precio_fuera_tolerancia_elimina ? texto : undefined };
}

function evalZona(b: RuedaNormalizado, p: RuedaNormalizado, cfg: RuedaConfig): Eval {
  if (b.zonas.length === 0 || p.zonas.length === 0) return sinDato('zona');
  const tabla = cfg.zonas ?? DEFAULT_ZONAS;
  const nombre = (z: string) => canonizarZona(z, tabla) ?? z;

  // 1) Tabla determinística: autoritativa cuando ambas zonas son conocidas.
  let vecina: { bz: string; pz: string } | null = null;
  let hayDesconocida = false;
  for (const bz of b.zonas) {
    for (const pz of p.zonas) {
      const rel = relacionZonas(bz, pz, tabla);
      if (rel === 'misma') return ok('zona', 1, `Zona ${nombre(bz)} coincide`);
      if (rel === 'vecina' && !vecina) vecina = { bz, pz };
      if (rel === 'desconocida') hayDesconocida = true;
    }
  }
  if (vecina) {
    return ok('zona', cfg.zona_cercana_credito, `Zona ${nombre(vecina.pz)} vecina de ${nombre(vecina.bz)}`);
  }

  // 2) Fallback (zona fuera de la tabla): slug exacto + zonas_cercanas del LLM.
  if (hayDesconocida) {
    const bSlugs = b.zonas.map(slug);
    const cercSlugs = b.zonas_cercanas.map(slug);
    const exacta = p.zonas.find((z) => bSlugs.includes(slug(z)));
    if (exacta !== undefined) return ok('zona', 1, `Zona ${b.zonas[bSlugs.indexOf(slug(exacta))]} coincide`);
    const cercana = p.zonas.find((z) => cercSlugs.includes(slug(z)));
    if (cercana !== undefined) {
      return ok('zona', cfg.zona_cercana_credito, `${cercana} es zona cercana a ${b.zonas.join(', ')}`);
    }
  }
  return { ...ok('zona', 0, `Zona ${p.zonas[0]} fuera de lo buscado (${b.zonas.join(', ')})`), zonaFalla: true };
}

function creditoDormitorios(pDorm: number, min: number, max: number | null): number {
  if (pDorm >= min && (max === null || pDorm <= max)) return 1;
  if (max !== null && pDorm > max) return 0.8;
  return pDorm === min - 1 ? 0.5 : 0;
}

function evalDormitorios(b: RuedaNormalizado, p: RuedaNormalizado): Eval {
  const pDorm = p.dorm_min ?? p.dorm_max;
  if (pDorm === null || (b.dorm_min === null && b.dorm_max === null)) return sinDato('dormitorios');
  const min = b.dorm_min ?? 0;
  const max = b.dorm_max;
  const cant = pDorm === 0 ? 'Monoambiente' : `${pDorm} ${pDorm === 1 ? 'dormitorio' : 'dormitorios'}`;
  const busca = max !== null && max !== min ? `busca ${min} a ${max}` : `busca ${min} o más`;
  return ok('dormitorios', creditoDormitorios(pDorm, min, max), `${cant} (${busca})`);
}

function creditoM2(pM2: number, min: number | null, max: number | null): number {
  let c = 1;
  if (min !== null) {
    if (pM2 >= min) c = 1;
    else if (pM2 >= 0.9 * min) c = 0.7;
    else if (pM2 >= 0.8 * min) c = 0.4;
    else c = 0;
  }
  if (max !== null && pM2 > 1.2 * max) c = Math.min(c, 0.7);
  return c;
}

function evalM2(b: RuedaNormalizado, p: RuedaNormalizado): Eval {
  const pM2 = p.m2_min ?? p.m2_max;
  if (pM2 === null || (b.m2_min === null && b.m2_max === null)) return sinDato('m2');
  const busca = b.m2_min !== null ? `busca desde ${fmt(b.m2_min)} m²` : `busca hasta ${fmt(b.m2_max as number)} m²`;
  return ok('m2', creditoM2(pM2, b.m2_min, b.m2_max), `${fmt(pM2)} m² (${busca})`);
}

function evalCaracteristicas(b: RuedaNormalizado, p: RuedaNormalizado): Eval {
  const pTieneDatos = p.amenities.length > 0 || p.banos_min !== null || p.lote_m2_min !== null;
  const tiene: string[] = [];
  const falta: string[] = [];
  b.amenities.forEach((a) => (p.amenities.includes(a) ? tiene : falta).push(a));
  if (b.banos_min !== null && p.banos_min !== null) {
    (p.banos_min >= b.banos_min ? tiene : falta).push(`${fmt(b.banos_min)} baños`);
  }
  if (b.lote_m2_min !== null && p.lote_m2_min !== null) {
    (p.lote_m2_min >= b.lote_m2_min ? tiene : falta).push(`lote desde ${fmt(b.lote_m2_min)} m²`);
  }
  const total = tiene.length + falta.length;
  if (!pTieneDatos || total === 0) return sinDato('caracteristicas');
  const partes: string[] = [];
  if (tiene.length) partes.push(`Tiene ${listar(tiene)}`);
  if (falta.length) partes.push(`${tiene.length ? 'falta' : 'Falta'} ${listar(falta)}`);
  return ok('caracteristicas', tiene.length / total, partes.join('; '));
}

function evalFormaPago(b: RuedaNormalizado, p: RuedaNormalizado): Eval {
  if (b.formas_pago.length === 0 || p.formas_pago.length === 0) return sinDato('forma_pago');
  const cumple = b.formas_pago.filter((f) => p.formas_pago.includes(f));
  const faltan = b.formas_pago.filter((f) => !p.formas_pago.includes(f));
  const label = (fs: string[]) => fs.map((f) => LABEL_FORMA_PAGO[f] ?? f);
  const texto = faltan.length === 0 ? capitalizar(listar(label(cumple))) : `No figura ${listar(label(faltan))}`;
  return ok('forma_pago', cumple.length / b.formas_pago.length, texto);
}

const tokens = (s: string): string[] => unico(slug(s).split(/[^a-z0-9]+/).filter(Boolean));
const FRACCION_TOKENS_REQUISITO = 0.6;

function evalNecesidades(b: RuedaNormalizado, p: RuedaNormalizado): Eval {
  const corpus = new Set([...p.requisitos, ...p.amenities].flatMap(tokens));
  if (b.requisitos.length === 0 || corpus.size === 0) return sinDato('necesidades');
  const cumplidos = b.requisitos.filter((req) => {
    const ts = tokens(req);
    return ts.length > 0 && ts.filter((t) => corpus.has(t)).length / ts.length >= FRACCION_TOKENS_REQUISITO - EPS;
  }).length;
  const total = b.requisitos.length;
  return ok('necesidades', cumplidos / total, `Cumple ${cumplidos} de ${total} ${total === 1 ? 'requisito' : 'requisitos'}`);
}

// ───────────── scorePair ─────────────

export function scorePair(b: RuedaNormalizado, p: RuedaNormalizado, cfg: RuedaConfig): ScorePairResult {
  const evals: Record<Criterio, Eval> = {
    tipo: evalTipo(b, p, cfg),
    precio: evalPrecio(b, p, cfg),
    zona: evalZona(b, p, cfg),
    dormitorios: evalDormitorios(b, p),
    m2: evalM2(b, p),
    caracteristicas: evalCaracteristicas(b, p),
    forma_pago: evalFormaPago(b, p),
    necesidades: evalNecesidades(b, p),
  };

  const criterios = (Object.keys(cfg.pesos) as Criterio[]).sort((x, y) => cfg.pesos[y] - cfg.pesos[x]);
  let suma = 0;
  let pesoEvaluado = 0;
  for (const k of criterios) {
    const c = evals[k].credito;
    if (c === null) continue;
    suma += cfg.pesos[k] * c;
    pesoEvaluado += cfg.pesos[k];
  }
  const base = pesoEvaluado > 0 ? (100 * suma) / pesoEvaluado : 0;
  const score = redondear(base * (evals.zona.zonaFalla ? cfg.zona_mismatch_multiplicador : 1));

  const motivoEliminacion = evals.tipo.eliminado ?? evals.precio.eliminado ?? null;
  const eliminado = motivoEliminacion !== null;

  return {
    score,
    motivos: criterios.map((k) => evals[k].motivo),
    eliminado,
    motivoEliminacion,
    persistible: !eliminado && pesoEvaluado > 0 && pesoEvaluado >= cfg.peso_minimo_evaluado && score >= cfg.umbral,
  };
}
