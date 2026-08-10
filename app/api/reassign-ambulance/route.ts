import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyAmbulance } from '@/lib/webpush';

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

  const { data: settings } = await supabaseAdmin.from('platform_settings').select('rider_fare_ugx, max_dispatch_radius_km').eq('id', 1).single();
  const maxKm = settings?.max_dispatch_radius_km ?? 50;

  const { data: match } = await supabaseAdmin.rpc('nearest_available_ambulance', {
    p_lat: trip.pickup_lat, p_lng: trip.pickup_lng, p_exclude: excluded, p_max_km: maxKm,
  });

  if (!match?.length) {
    await supabaseAdmin.from('trip_requests').update({ status: 'unmatched', excluded_ambulance_ids: excluded }).eq('id', tripId);
    return NextResponse.json({ matched: false });
  }

  const newAmbulanceId = match[0].id;

  const updates: any = {
    ambulance_id: newAmbulanceId, status: 'offered', offered_at: new Date().toISOString(), excluded_ambulance_ids: excluded,
  };

  if (trip.payment_method === 'cash') {
    updates.fare_charged_ugx = match[0].trip_rate_ugx ?? settings?.rider_fare_ugx ?? null;
  }

  await supabaseAdmin.from('trip_requests').update(updates).eq('id', tripId);
  await supabaseAdmin.from('ambulances').update({ status: 'busy' }).eq('id', newAmbulanceId);
  await notifyAmbulance(newAmbulanceId, { title: 'New Ambulance Request', body: `Rider needs pickup nearby — respond within 60s`, url: `/driver/${newAmbulanceId}` });

  return NextResponse.json({ matched: true, driverPhone: match[0].driver_phone, fareChargedUgx: updates.fare_charged_ugx ?? trip.fare_charged_ugx, payerLabel: trip.payer_label });
}
