// Acceso al panel (/dashboard, /gastos): segunda contraseña, compartida por ambas
// secciones y distinta del login general de Supabase. La sesión es una sola cookie
// httpOnly firmada con HMAC: entrando una vez quedan abiertas las dos secciones.
// Usa Web Crypto para funcionar igual en el middleware (edge) y en route handlers (node).

export type PanelSection = 'dashboard' | 'gastos';

interface SectionConfig {
  label: string;
  pages: string[];
  apis: string[];
}

export const PANEL_SECTIONS: Record<PanelSection, SectionConfig> = {
  dashboard: { label: 'Dashboard', pages: ['/dashboard'], apis: [] },
  gastos: { label: 'Gastos', pages: ['/gastos'], apis: ['/api/gastos'] },
};

export const PANEL_COOKIE = 'panel_session';
export const PANEL_SESSION_SECONDS = 60 * 60 * 12; // 12 h
export const PANEL_ACCESS_PATH = '/acceso-panel';

/** Acceso estático a process.env: el middleware (edge) no lee variables por clave dinámica */
export function getPanelPassword(): string | null {
  const p = process.env.DASHBOARD_PASSWORD;
  return p && p.length > 0 ? p : null;
}

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function sectionForPage(pathname: string): PanelSection | null {
  for (const [s, cfg] of Object.entries(PANEL_SECTIONS) as [PanelSection, SectionConfig][]) {
    if (cfg.pages.some((p) => matches(pathname, p))) return s;
  }
  return null;
}

export function sectionForApi(pathname: string): PanelSection | null {
  for (const [s, cfg] of Object.entries(PANEL_SECTIONS) as [PanelSection, SectionConfig][]) {
    if (cfg.apis.some((p) => matches(pathname, p))) return s;
  }
  return null;
}

const encoder = new TextEncoder();

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`panel-v1:${secret}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Token = "<expiraEpochSeg>.<hmac>". La clave deriva de la contraseña del panel:
 * al cambiar DASHBOARD_PASSWORD se invalidan todas las sesiones abiertas.
 */
export async function createPanelToken(password: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + PANEL_SESSION_SECONDS;
  return `${exp}.${await hmacHex(password, String(exp))}`;
}

export async function verifyPanelToken(token: string | undefined, password: string | null): Promise<boolean> {
  if (!token || !password) return false;
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || !sig || exp < Math.floor(Date.now() / 1000)) return false;
  return constantTimeEqual(sig, await hmacHex(password, expStr));
}

export async function passwordMatches(input: string, password: string): Promise<boolean> {
  // Comparar hashes de largo fijo evita filtrar el largo de la contraseña por tiempo
  const [a, b] = await Promise.all([hmacHex(password, `pw:${input}`), hmacHex(password, `pw:${password}`)]);
  return constantTimeEqual(a, b);
}
