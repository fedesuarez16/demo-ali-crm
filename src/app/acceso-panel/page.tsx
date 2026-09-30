import { sectionForPage } from '@/lib/panelAuth';
import AccesoPanelForm from './AccesoPanelForm';

/** Solo se permite volver a rutas internas (evita open redirects) */
function safeNext(next: string | string[] | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

export default async function AccesoPanelPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const destino = safeNext(next);
  const section = sectionForPage(destino) ?? 'dashboard';
  return <AccesoPanelForm next={sectionForPage(destino) ? destino : '/dashboard'} section={section} />;
}
