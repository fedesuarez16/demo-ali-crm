import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Obtener el estado actual del agente
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('agent_status')
      .select('is_active')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error fetching agent status:', error);
      return NextResponse.json(
        { error: 'Error al obtener el estado del agente' },
        { status: 500 }
      );
    }

    return NextResponse.json({ is_active: data?.is_active ?? true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperado al obtener el estado del agente' },
      { status: 500 }
    );
  }
}

// POST: Actualizar el estado del agente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'El campo is_active debe ser un booleano' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('agent_status')
      .update({ is_active })
      .eq('id', 1)
      .select();

    if (error) {
      console.error('Error updating agent status:', error);
      return NextResponse.json(
        { error: 'Error al actualizar el estado del agente' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      is_active: data?.[0]?.is_active ?? is_active,
      message: `Agente ${is_active ? 'activado' : 'desactivado'} exitosamente`
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperado al actualizar el estado del agente' },
      { status: 500 }
    );
  }
}

