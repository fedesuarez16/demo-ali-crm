import { NextRequest, NextResponse } from 'next/server';
import { autenticar } from '@/lib/calendario/auth';
import { enteroPositivo, responderError } from '@/lib/calendario/respuesta';
import { disponibilidad } from '@/lib/calendario/servicio';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calendario/disponibilidad?tipo=llamada[&desde=YYYY-MM-DD|ISO][&dias=N][&persona_id=][&max=][&sugeridos=]
 * -> { tipo, persona, zona_horaria, sugeridos: [{inicio, fin, texto}], slots: [...], total, resumen }
 * `sugeridos` son pocas opciones repartidas entre días y mañana/tarde (lo que el bot le ofrece al cliente).
 * Desde n8n: header Authorization: Bearer <CALENDARIO_API_TOKEN>; solo tipos con agendable_por_bot.
 */
export async function GET(request: NextRequest) {
  const auth = await autenticar(request);
  if (auth instanceof NextResponse) return auth;
  const sp = request.nextUrl.searchParams;
  const tipo = sp.get('tipo')?.trim();
  if (!tipo) return NextResponse.json({ error: 'Falta el parámetro tipo (ej. llamada)', codigo: 'invalido' }, { status: 400 });
  try {
    const res = await disponibilidad({
      tipo,
      personaId: enteroPositivo(sp.get('persona_id')),
      desde: sp.get('desde') || sp.get('fecha'),
      dias: enteroPositivo(sp.get('dias')) ?? (sp.get('fecha') ? 1 : null),
      max: enteroPositivo(sp.get('max')),
      sugeridos: enteroPositivo(sp.get('sugeridos')),
      origen: auth.origen,
    });
    return NextResponse.json(res);
  } catch (err) {
    return responderError(err, 'calendario/disponibilidad');
  }
}
