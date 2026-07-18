import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const { tripId } = await req.json();

  const { data: trip } = await supabaseAdmin.from('trip_requests').select('*').eq('id', tripId).single();
  if (!trip || !['offered', 'declined'].includes(trip.status)) {
    return NextResponse.json({ status: trip?.status ?? 'not_found', matched: false });
  }

  if (trip.ambulance_id) {
    await supabaseAdmin.from('ambulances').update({ status: 'available' }).eq('id', trip.ambulance_id);
  }
  const excluded = [...(trip.excluded_ambulance_ids || []), trip.ambulance_id].filter(Boolean);

  const { data: match } = await supabaseAdmin.rpc('nearest_available_ambulance', {
    p_lat: trip.pickup_lat, p_lng: trip.pickup_lng, p_exclude: excluded,
  });

  if (!match?.length) {
    await supabaseAdmin.from('trip_requests').update({ status: 'unmatched', excluded_ambulance_ids: excluded }).eq('id', tripId);
    return NextResponse.json({ matched: false });
  }

  const newAmbulanceId = match[0].id;
  await supabaseAdmin.from('trip_requests').update({
    ambulance_id: newAmbulanceId, status: 'offered', offered_at: new Date().toISOString(), excluded_ambulance_ids: excluded,
  }).eq('id', tripId);
  await supabaseAdmin.from('ambulances').update({ status: 'busy' }).eq('id', newAmbulanceId);

  return NextResponse.json({ matched: true, driverPhone: match[0].driver_phone });
}
