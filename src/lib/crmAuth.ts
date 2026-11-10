// Login general del CRM: una contraseña compartida (CRM_PASSWORD), sin usuarios
// individuales. La sesión es una cookie httpOnly firmada (ver signedSession.ts).
// Al cambiar CRM_PASSWORD se cierran todas las sesiones abiertas.

import { createSessionToken, sessionPasswordMatches, verifySessionToken } from './signedSession';

export const CRM_COOKIE = 'crm_session';
export const CRM_SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 días
const CRM_SCOPE = 'crm-v1';

/** Acceso estático a process.env: el middleware (edge) no lee variables por clave dinámica */
export function getCrmPassword(): string | null {
  const p = process.env.CRM_PASSWORD;
  return p && p.length > 0 ? p : null;
}

export function createCrmToken(password: string): Promise<string> {
  return createSessionToken(CRM_SCOPE, password, CRM_SESSION_SECONDS);
}

export function verifyCrmToken(token: string | undefined, password: string | null): Promise<boolean> {
  return verifySessionToken(CRM_SCOPE, token, password);
}

export function crmPasswordMatches(input: string, password: string): Promise<boolean> {
  return sessionPasswordMatches(CRM_SCOPE, input, password);
}
