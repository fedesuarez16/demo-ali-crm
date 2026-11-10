'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/crm-auth', { method: 'DELETE' }).catch(() => null);
    router.refresh();
    router.push('/login');
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout}>
      Cerrar sesión
    </Button>
  );
}
