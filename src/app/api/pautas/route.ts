import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars missing');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};

export async function GET() {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await (supabase as any)
      .from('pautas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener pautas:', error);
      return NextResponse.json({ error: 'Error al obtener pautas' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error al obtener pautas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texto, activo } = body;

    if (!texto || typeof texto !== 'string' || texto.trim().length === 0) {
      return NextResponse.json({ error: 'El texto de la pauta es requerido' }, { status: 400 });
    }

    const supabase = getSupabase();

    const row: { texto: string; activo?: boolean } = { texto: texto.trim() };
    if (typeof activo === 'boolean') {
      row.activo = activo;
    }

    const { data, error } = await (supabase as any)
      .from('pautas')
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error('Error al guardar pauta:', error);
      return NextResponse.json({ error: 'Error al guardar pauta' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error al guardar pauta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de pauta es requerido' }, { status: 400 });
    }

    const supabase = getSupabase();
    
    const { error } = await (supabase as any)
      .from('pautas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar pauta:', error);
      return NextResponse.json({ error: 'Error al eliminar pauta' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar pauta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const rawId = body?.id;
    const activo = body?.activo;
    const id =
      typeof rawId === 'number' && Number.isFinite(rawId)
        ? rawId
        : typeof rawId === 'string'
          ? parseInt(rawId, 10)
          : NaN;

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID de pauta inválido' }, { status: 400 });
    }
    if (typeof activo !== 'boolean') {
      return NextResponse.json({ error: 'activo debe ser boolean' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data, error } = await (supabase as any)
      .from('pautas')
      .update({ activo })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar pauta:', error);
      return NextResponse.json({ error: 'Error al actualizar pauta' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error al actualizar pauta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

