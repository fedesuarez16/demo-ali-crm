// Acceso al panel (/dashboard, /gastos): segunda contraseña, compartida por ambas
// secciones y distinta de la del login del CRM. La sesión es una sola cookie
// httpOnly firmada con HMAC: entrando una vez quedan abiertas las dos secciones.
// La firma de la cookie vive en signedSession.ts (compartida con el login del CRM).

import { createSessionToken, sessionPasswordMatches, verifySessionToken } from './signedSession';

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

const PANEL_SCOPE = 'panel-v1';

/** Al cambiar DASHBOARD_PASSWORD se invalidan todas las sesiones del panel. */
export function createPanelToken(password: string): Promise<string> {
  return createSessionToken(PANEL_SCOPE, password, PANEL_SESSION_SECONDS);
}

export function verifyPanelToken(token: string | undefined, password: string | null): Promise<boolean> {
  return verifySessionToken(PANEL_SCOPE, token, password);
}

export function passwordMatches(input: string, password: string): Promise<boolean> {
  return sessionPasswordMatches(PANEL_SCOPE, input, password);
}
