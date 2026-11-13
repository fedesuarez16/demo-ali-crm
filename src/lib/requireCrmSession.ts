// Guard para route handlers: exige la cookie crm_session válida. Devuelve una respuesta 401
// si falta o es inválida (fail closed si CRM_PASSWORD no está seteada) y null si todo está bien.
import { NextResponse, type NextRequest } from 'next/server';
import { CRM_COOKIE, getCrmPassword, verifyCrmToken } from './crmAuth';

export async function requireCrmSession(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get(CRM_COOKIE)?.value;
  if (await verifyCrmToken(token, getCrmPassword())) return null;
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}
