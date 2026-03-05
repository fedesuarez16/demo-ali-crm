import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars missing. Define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};

export async function DELETE(request, { params }) {
  try {
    const { id: sessionId, messageId } = await params;

    if (!sessionId || !messageId) {
      return NextResponse.json(
        { error: 'IDs requeridos: sessionId, messageId' }, 
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    
    // Verificar que el mensaje pertenece a la sesión
    const { data: message, error: fetchError } = await supabase
      .from('chat_histories')
      .select('*')
      .eq('id', parseInt(messageId))
      .eq('session_id', sessionId)
      .single();

    if (fetchError || !message) {
      return NextResponse.json(
        { 
          error: 'Mensaje no encontrado o no pertenece a esta sesión',
          status: 404
        }, 
        { status: 404 }
      );
    }

    // Eliminar el mensaje de la base de datos
    const { error: deleteError } = await supabase
      .from('chat_histories')
      .delete()
      .eq('id', parseInt(messageId))
      .eq('session_id', sessionId);

    if (deleteError) {
      console.error('Error al borrar mensaje:', deleteError);
      return NextResponse.json(
        { 
          error: 'Error al borrar mensaje de la base de datos',
          status: 500,
          message: deleteError.message
        }, 
        { status: 500 }
      );
    }
    
    console.log('Message deleted successfully:', messageId);
    
    return NextResponse.json({
      success: true,
      message: 'Mensaje borrado exitosamente',
      messageId: messageId
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { 
        error: 'Error al borrar el mensaje',
        message: error.message 
      }, 
      { status: 500 }
    );
  }
}

