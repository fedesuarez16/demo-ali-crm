import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key);
}

export async function GET(request, { params }) {
  try {
    const { id: conversationId } = await params;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('message_overrides')
      .select('message_id, content')
      .eq('conversation_id', String(conversationId));

    if (error) throw error;

    const overrides = Object.fromEntries((data || []).map(r => [r.message_id, r.content]));
    return NextResponse.json({ overrides });
  } catch (error) {
    return NextResponse.json({ overrides: {} }, { status: 500 });
  }
}
