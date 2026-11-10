// Sesiones por contraseña compartida: cookie httpOnly con un token firmado con HMAC.
// La usan el login del CRM (crmAuth) y el segundo candado del panel (panelAuth).
// Usa Web Crypto para funcionar igual en el middleware (edge) y en route handlers (node).
//
// Token = "<expiraEpochSeg>.<hmac>". La clave deriva de `scope` + la contraseña:
// - cambiar la contraseña invalida todas las sesiones abiertas;
// - el scope evita que una cookie de una sección sirva para otra aunque las
//   contraseñas coincidan.

const encoder = new TextEncoder();

async function hmacHex(scope: string, secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${scope}:${secret}`),
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

export async function createSessionToken(scope: string, password: string, seconds: number): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + seconds;
  return `${exp}.${await hmacHex(scope, password, String(exp))}`;
}

export async function verifySessionToken(
  scope: string,
  token: string | undefined,
  password: string | null,
): Promise<boolean> {
  if (!token || !password) return false;
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || !sig || exp < Math.floor(Date.now() / 1000)) return false;
  return constantTimeEqual(sig, await hmacHex(scope, password, expStr));
}

export async function sessionPasswordMatches(scope: string, input: string, password: string): Promise<boolean> {
  // Comparar hashes de largo fijo evita filtrar el largo de la contraseña por tiempo
  const [a, b] = await Promise.all([
    hmacHex(scope, password, `pw:${input}`),
    hmacHex(scope, password, `pw:${password}`),
  ]);
  return constantTimeEqual(a, b);
}

// Límite simple de intentos fallidos por IP (en memoria, por instancia)
const MAX_INTENTOS = 8;
const VENTANA_MS = 15 * 60 * 1000;

export function crearLimitadorDeIntentos() {
  const intentos = new Map<string, { count: number; desde: number }>();

  return {
    bloqueado(ip: string): boolean {
      const e = intentos.get(ip);
      if (!e) return false;
      if (Date.now() - e.desde > VENTANA_MS) {
        intentos.delete(ip);
        return false;
      }
      return e.count >= MAX_INTENTOS;
    },
    registrarFallo(ip: string) {
      const e = intentos.get(ip);
      if (!e || Date.now() - e.desde > VENTANA_MS) {
        if (intentos.size > 1000) intentos.clear();
        intentos.set(ip, { count: 1, desde: Date.now() });
      } else {
        e.count++;
      }
    },
    limpiar(ip: string) {
      intentos.delete(ip);
    },
  };
}

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}
