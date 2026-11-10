'use client';

import { useState } from 'react';
import Link from 'next/link';
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

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email) {
      setError('Ingresá tu correo electrónico.');
      return;
    }

    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer-contrasena`,
    });

    setLoading(false);

    // Solo mostramos errores de límite de envíos: cualquier otro error se trata
    // como éxito para no revelar qué correos están registrados.
    if (authError && authError.status === 429) {
      setError('Se enviaron demasiados correos. Esperá unos minutos y probá de nuevo.');
      return;
    }

    setEnviado(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
          <CardDescription>
            {enviado
              ? 'Si el correo está registrado, te llegará un link para crear una nueva contraseña. Abrilo en este mismo navegador.'
              : 'Ingresá tu correo y te enviamos un link para restablecerla.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!enviado && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link'}
              </Button>
            </form>
          )}
          <Link
            href="/login"
            className="mt-4 block text-center text-sm text-muted-foreground hover:underline"
          >
            Volver a iniciar sesión
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
