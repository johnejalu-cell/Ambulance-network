import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const { tripId } = await req.json();

  const { data: trip } = await supabaseAdmin.from('trip_requests').select('*').eq('id', tripId).single();
  if (!trip || ['completed', 'cancelled', 'unmatched'].includes(trip.status)) {
    return NextResponse.json({ error: 'This trip can no longer be cancelled.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('trip_requests').update({ status: 'cancelled' }).eq('id', tripId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (trip.ambulance_id) {
    await supabaseAdmin.from('ambulances').update({ status: 'available' }).eq('id', trip.ambulance_id);
  }

  return NextResponse.json({ ok: true });
}
