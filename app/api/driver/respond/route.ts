import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const { tripId, ambulanceId, response } = await req.json();

  if (response === 'accept') {
    const { error } = await supabaseAdmin
      .from('trip_requests')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', tripId).eq('ambulance_id', ambulanceId).eq('status', 'offered');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  await supabaseAdmin.from('trip_requests').update({ status: 'declined' }).eq('id', tripId).eq('ambulance_id', ambulanceId).eq('status', 'offered');
  await supabaseAdmin.from('ambulances').update({ status: 'available' }).eq('id', ambulanceId);
  return NextResponse.json({ ok: true });
}
