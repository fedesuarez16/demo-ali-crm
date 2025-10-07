import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Obtener el estado actual del agente
export async function GET() {
  try {
    // Verificar si Supabase está configurado
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Supabase no está configurado. Variables de entorno faltantes.');
      return NextResponse.json(
        { 
          error: 'Supabase no está configurado. Por favor, configura las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY',
          is_active: true // Valor por defecto
        },
        { status: 500 }
      );
    }

    console.log('Intentando conectar con Supabase...');
    
    // Primero intentar obtener el registro existente
    const { data, error } = await supabase
      .from('agent_status')
      .select('is_active')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error fetching agent status:', error);
      
      // Si el error es que no existe el registro, crearlo
      if (error.code === 'PGRST116') {
        console.log('Registro no encontrado, creando registro inicial...');
        const { data: insertData, error: insertError } = await supabase
          .from('agent_status')
          .insert({ id: 1, is_active: true })
          .select()
          .single();
          
        if (insertError) {
          console.error('Error creando registro inicial:', insertError);
          return NextResponse.json(
            { 
              error: `Error creando registro inicial: ${insertError.message}`,
              is_active: true // Valor por defecto
            },
            { status: 500 }
          );
        }
        
        console.log('Registro inicial creado:', insertData);
        return NextResponse.json({ is_active: insertData?.is_active ?? true });
      }
      
      return NextResponse.json(
        { 
          error: `Error al obtener el estado del agente: ${error.message}`,
          is_active: true // Valor por defecto
        },
        { status: 500 }
      );
    }

    console.log('Estado del agente obtenido:', data);
    return NextResponse.json({ is_active: data?.is_active ?? true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        error: `Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        is_active: true // Valor por defecto
      },
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

    // Verificar si Supabase está configurado
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Supabase no está configurado. Variables de entorno faltantes.');
      return NextResponse.json(
        { 
          error: 'Supabase no está configurado. Por favor, configura las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY',
          success: false
        },
        { status: 500 }
      );
    }

    console.log('Intentando actualizar estado del agente:', is_active);
    
    // Intentar actualizar el registro existente
    const { data, error } = await supabase
      .from('agent_status')
      .update({ is_active })
      .eq('id', 1)
      .select();

    if (error) {
      console.error('Error updating agent status:', error);
      
      // Si el error es que no existe el registro, crearlo
      if (error.code === 'PGRST116' || error.message.includes('0 rows')) {
        console.log('Registro no encontrado, creando registro con estado:', is_active);
        const { data: insertData, error: insertError } = await supabase
          .from('agent_status')
          .insert({ id: 1, is_active })
          .select()
          .single();
          
        if (insertError) {
          console.error('Error creando registro:', insertError);
          return NextResponse.json(
            { 
              error: `Error creando registro: ${insertError.message}`,
              success: false
            },
            { status: 500 }
          );
        }
        
        console.log('Registro creado con estado:', insertData);
        return NextResponse.json({ 
          success: true, 
          is_active: insertData?.is_active ?? is_active,
          message: `Agente ${is_active ? 'activado' : 'desactivado'} exitosamente`
        });
      }
      
      return NextResponse.json(
        { 
          error: `Error al actualizar el estado del agente: ${error.message}`,
          success: false
        },
        { status: 500 }
      );
    }

    console.log('Estado del agente actualizado:', data);
    return NextResponse.json({ 
      success: true, 
      is_active: data?.[0]?.is_active ?? is_active,
      message: `Agente ${is_active ? 'activado' : 'desactivado'} exitosamente`
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        error: `Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        success: false
      },
      { status: 500 }
    );
  }
}

