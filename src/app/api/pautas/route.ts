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
    const { texto } = body;

    if (!texto || typeof texto !== 'string' || texto.trim().length === 0) {
      return NextResponse.json({ error: 'El texto de la pauta es requerido' }, { status: 400 });
    }

    const supabase = getSupabase();
    
    const { data, error } = await (supabase as any)
      .from('pautas')
      .insert([{ texto: texto.trim() }])
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

