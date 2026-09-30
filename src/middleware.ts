import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  PANEL_ACCESS_PATH,
  PANEL_COOKIE,
  getPanelPassword,
  sectionForApi,
  sectionForPage,
  verifyPanelToken,
} from '@/lib/panelAuth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const panelToken = request.cookies.get(PANEL_COOKIE)?.value;

  // APIs del panel: solo con sesión de panel válida (que a su vez exige login para emitirse)
  if (sectionForApi(pathname)) {
    if (!(await verifyPanelToken(panelToken, getPanelPassword()))) {
      return NextResponse.json({ error: 'Acceso al panel requerido' }, { status: 401 });
    }
    return NextResponse.next();
  }

  const response = await updateSession(request);

  // Sin login general → updateSession ya redirige a /login
  if (response.headers.get('location')) return response;

  if (sectionForPage(pathname)) {
    if (!(await verifyPanelToken(panelToken, getPanelPassword()))) {
      const url = request.nextUrl.clone();
      url.pathname = PANEL_ACCESS_PATH;
      url.search = '';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - api/ (all API routes — must not be intercepted), salvo las APIs de secciones del panel
     * - login (avoid redirect loop)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - common image extensions
     */
    '/((?!api/|login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/api/gastos/:path*',
    '/api/gastos',
  ],
};
