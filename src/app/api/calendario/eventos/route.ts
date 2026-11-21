import { NextRequest, NextResponse } from 'next/server';
import { autenticar } from '@/lib/calendario/auth';
import { enteroPositivo, responderError } from '@/lib/calendario/respuesta';
import { crearEvento, eventosEnRango } from '@/lib/calendario/servicio';

export const dynamic = 'force-dynamic';

/** GET /api/calendario/eventos?desde=ISO&hasta=ISO[&persona_id=] -> eventos de Google de las personas vinculadas */
export async function GET(request: NextRequest) {
  const auth = await autenticar(request);
  if (auth instanceof NextResponse) return auth;
  const sp = request.nextUrl.searchParams;
  const desde = new Date(sp.get('desde') || Date.now());
  const hasta = new Date(sp.get('hasta') || desde.getTime() + 7 * 86_400_000);
  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime()) || hasta <= desde) {
    return NextResponse.json({ error: 'desde/hasta inválidos', codigo: 'invalido' }, { status: 400 });
  }
  if (hasta.getTime() - desde.getTime() > 62 * 86_400_000) {
    return NextResponse.json({ error: 'El rango máximo es de 62 días', codigo: 'invalido' }, { status: 400 });
  }
  try {
    return NextResponse.json(await eventosEnRango({ desde, hasta, personaId: enteroPositivo(sp.get('persona_id')) }));
  } catch (err) {
    return responderError(err, 'calendario/eventos GET');
  }
}

/**
 * POST /api/calendario/eventos
 * { tipo, inicio (ISO), whatsapp_id? | lead_id?, nombre?, notas?, titulo?, persona_id?, forzar? }
 * Crea el evento en el Google Calendar de la persona responsable y lo vincula al lead (por id o por
 * los últimos 10 dígitos del teléfono). El bot solo puede usar un turno que /disponibilidad ofrecería.
 */
export async function POST(request: NextRequest) {
  const auth = await autenticar(request);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => null);
  if (!body?.tipo || !body?.inicio) {
    return NextResponse.json({ error: 'Faltan tipo e inicio (ISO 8601)', codigo: 'invalido' }, { status: 400 });
  }
  try {
    const ev = await crearEvento({
      tipo: String(body.tipo),
      inicio: String(body.inicio),
      personaId: enteroPositivo(body.persona_id),
      leadId: enteroPositivo(body.lead_id),
      whatsappId: body.whatsapp_id ? String(body.whatsapp_id) : null,
      nombre: body.nombre ? String(body.nombre).slice(0, 120) : null,
      notas: body.notas ? String(body.notas).slice(0, 2000) : null,
      titulo: auth.origen === 'crm' && body.titulo ? String(body.titulo).slice(0, 200) : null,
      forzar: auth.origen === 'crm' && body.forzar === true,
      origen: auth.origen,
    });
    return NextResponse.json(ev, { status: 201 });
  } catch (err) {
    return responderError(err, 'calendario/eventos POST');
  }
}
