// Seguridad del calendario (server-only):
// - cifrado AES-256-GCM de los tokens de Google antes de guardarlos en Supabase;
// - `state` firmado (HMAC) para el flujo OAuth, contra CSRF;
// - validación del Bearer con que n8n llama a /api/calendario/*.
// La clave sale de CALENDARIO_SECRET (cualquier string largo; se deriva con SHA-256).

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

function derivarClave(secreto: string): Buffer {
  return createHash('sha256').update(`calendario:${secreto}`).digest();
}

const b64u = (b: Buffer) => b.toString('base64url');

/** Devuelve "iv.tag.cifrado" en base64url */
export function cifrar(texto: string, secreto: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', derivarClave(secreto), iv);
  const datos = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  return [b64u(iv), b64u(cipher.getAuthTag()), b64u(datos)].join('.');
}

export function descifrar(token: string, secreto: string): string {
  const [iv, tag, datos] = token.split('.');
  if (!iv || !tag || !datos) throw new Error('Token cifrado mal formado');
  const decipher = createDecipheriv('aes-256-gcm', derivarClave(secreto), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(datos, 'base64url')), decipher.final()]).toString('utf8');
}

function hmac(secreto: string, data: string): string {
  return createHmac('sha256', `state:${secreto}`).update(data).digest('base64url');
}

function igualesSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function firmarState(payload: Record<string, unknown>, secreto: string, segundos: number): string {
  const cuerpo = b64u(Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + segundos, n: b64u(randomBytes(8)) })));
  return `${cuerpo}.${hmac(secreto, cuerpo)}`;
}

export function verificarState(state: string | null | undefined, secreto: string): Record<string, unknown> | null {
  if (!state) return null;
  const [cuerpo, firma] = state.split('.');
  if (!cuerpo || !firma || !igualesSeguro(firma, hmac(secreto, cuerpo))) return null;
  try {
    const { exp, n: _n, ...payload } = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'));
    if (typeof exp !== 'number' || exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function bearerValido(header: string | null | undefined, esperado: string | null | undefined): boolean {
  if (!esperado || !header || !header.startsWith('Bearer ')) return false;
  const recibido = header.slice('Bearer '.length).trim();
  // Comparar hashes de largo fijo evita filtrar el largo del token por tiempo
  const h = (s: string) => createHash('sha256').update(s).digest('hex');
  return recibido.length > 0 && igualesSeguro(h(recibido), h(esperado));
}
