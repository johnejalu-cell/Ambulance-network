import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { riderPhone, lat, lng, note } = await req.json();

  const { data: match, error: matchErr } = await supabaseAdmin
    .rpc('nearest_available_ambulance', { p_lat: lat, p_lng: lng });

  if (matchErr || !match?.length) {
    return NextResponse.json({ error: 'No ambulance currently available' }, { status: 404 });
  }

  const ambulanceId = match[0].id;

  const { data: trip, error } = await supabaseAdmin
    .from('trip_requests')
    .insert({ rider_phone: riderPhone, pickup_lat: lat, pickup_lng: lng, dropoff_note: note, ambulance_id: ambulanceId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from('ambulances').update({ status: 'busy' }).eq('id', ambulanceId);

  return NextResponse.json({ trip, driverPhone: match[0].driver_phone });
}
