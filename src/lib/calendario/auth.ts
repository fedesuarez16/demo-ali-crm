// Acceso a /api/calendario/*: desde el CRM (cookie crm_session) o desde n8n (Bearer CALENDARIO_API_TOKEN).

import { NextResponse, type NextRequest } from 'next/server';
import { CRM_COOKIE, getCrmPassword, verifyCrmToken } from '@/lib/crmAuth';
import { calendarioApiToken } from './config';
import { bearerValido } from './seguridad';

export type Origen = 'crm' | 'bot';

export async function autenticar(
  request: NextRequest,
  permitir: Origen[] = ['crm', 'bot'],
): Promise<{ origen: Origen } | NextResponse> {
  if (permitir.includes('bot') && bearerValido(request.headers.get('authorization'), calendarioApiToken())) {
    return { origen: 'bot' };
  }
  if (permitir.includes('crm') && (await verifyCrmToken(request.cookies.get(CRM_COOKIE)?.value, getCrmPassword()))) {
    return { origen: 'crm' };
  }
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}
