'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type Estado = 'verificando' | 'listo' | 'invalido';

const LINK_INVALIDO =
  'El link es inválido, expiró o ya fue usado (cada link sirve una sola vez). Pedí uno nuevo.';

/**
 * Establece la sesión de recuperación a partir de la URL. Soporta los tres
 * formatos que puede mandar Supabase:
 * - implicit (links enviados desde el dashboard): #access_token=...&refresh_token=...
 * - token_hash (template de email personalizado): ?token_hash=...&type=recovery
 * - PKCE (resetPasswordForEmail desde la app): ?code=...
 */
async function establecerSesionDeRecuperacion(): Promise<boolean> {
  const supabase = createClient();
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);

  if (hash.get('error') || query.get('error')) return false;

  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  const tokenHash = query.get('token_hash');
  const code = query.get('code');

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return !error;
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash,
    });
    return !error;
  }

  // El cliente del browser puede haber canjeado el ?code solo al inicializarse
  // (detectSessionInUrl), así que primero miramos si ya hay sesión.
  const { data } = await supabase.auth.getSession();
  if (data.session) return true;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return !error;
  }

  return false;
}

export default function RestablecerContrasenaPage() {
  const router = useRouter();
  const yaVerificado = useRef(false);

  const [estado, setEstado] = useState<Estado>('verificando');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Los tokens son de un solo uso: evitamos el doble efecto de StrictMode.
    if (yaVerificado.current) return;
    yaVerificado.current = true;

    establecerSesionDeRecuperacion().then((ok) => {
      // Sacamos los tokens de la barra de direcciones/historial.
      window.history.replaceState(null, '', window.location.pathname);
      setEstado(ok ? 'listo' : 'invalido');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password });

    if (authError) {
      setError(
        authError.code === 'same_password'
          ? 'La nueva contraseña tiene que ser distinta a la anterior.'
          : 'No se pudo actualizar la contraseña. Probá de nuevo.',
      );
      setLoading(false);
      return;
    }

    router.refresh();
    router.push('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
          <CardDescription>
            {estado === 'verificando' && 'Verificando el link...'}
            {estado === 'listo' && 'Elegí tu nueva contraseña.'}
            {estado === 'invalido' && LINK_INVALIDO}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {estado === 'listo' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmacion">Repetir contraseña</Label>
                <Input
                  id="confirmacion"
                  type="password"
                  placeholder="••••••••"
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </Button>
            </form>
          )}
          {estado === 'invalido' && (
            <Button asChild className="w-full">
              <Link href="/recuperar-contrasena">Pedir un link nuevo</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
