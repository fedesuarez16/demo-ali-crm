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

export async function GET(request, { params }) {
  try {
    const { id: sessionId, messageId, attachmentId } = await params;

    if (!sessionId || !messageId || !attachmentId) {
      return NextResponse.json(
        { error: 'IDs requeridos: sessionId, messageId, attachmentId' }, 
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    
    // Obtener el mensaje de la base de datos
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

    // Buscar el attachment en el JSONB del mensaje
    const messageData = message.message || {};
    const attachments = messageData.attachments || [];
    const attachment = attachments.find(att => att.id === attachmentId || att.id === parseInt(attachmentId));

    if (!attachment) {
      return NextResponse.json(
        { 
          error: 'Attachment no encontrado en el mensaje',
          status: 404
        }, 
        { status: 404 }
      );
    }

    // Si el attachment tiene una URL, redirigir o obtener el contenido
    if (attachment.url) {
      try {
        const response = await fetch(attachment.url);
        if (response.ok) {
          const blob = await response.blob();
          const contentType = attachment.content_type || response.headers.get('content-type') || 'application/octet-stream';
          
          return new NextResponse(blob, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `inline; filename="${attachment.filename || 'attachment'}"`,
              'Cache-Control': 'public, max-age=3600',
            },
          });
        }
      } catch (fetchError) {
        console.error('Error fetching attachment from URL:', fetchError);
      }
    }

    // Si no hay URL o falló la obtención, retornar error
    return NextResponse.json(
      { 
        error: 'No se pudo obtener el attachment. El mensaje no contiene una URL válida para el attachment.',
        status: 404
      }, 
      { status: 404 }
    );
  } catch (error) {
    console.error('Error fetching attachment:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener el attachment',
        message: error.message 
      }, 
      { status: 500 }
    );
  }
}

