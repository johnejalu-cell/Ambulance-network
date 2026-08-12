import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyDriverSession } from '@/lib/authToken';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const IMPLAUSIBLE_SPEED_KMH = 150;

export async function POST(req: Request) {
  const { ambulanceId, lat, lng, token } = await req.json();
  if (!(await verifyDriverSession(ambulanceId, token))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check the previous position before overwriting it, to catch a jump that's
  // only physically possible if two different vehicles are using this login.
  const { data: prevLoc } = await supabaseAdmin.rpc('get_ambulance_location', { amb_id: ambulanceId });
  const { data: prevRow } = await supabaseAdmin.from('ambulances').select('updated_at').eq('id', ambulanceId).single();

  if (prevLoc?.[0] && prevRow?.updated_at) {
    const distanceKm = haversineKm(prevLoc[0].lat, prevLoc[0].lng, lat, lng);
    const secondsElapsed = (Date.now() - new Date(prevRow.updated_at).getTime()) / 1000;
    if (secondsElapsed > 0) {
      const impliedSpeed = distanceKm / (secondsElapsed / 3600);
      if (impliedSpeed > IMPLAUSIBLE_SPEED_KMH) {
        await supabaseAdmin.from('location_anomalies').insert({
          ambulance_id: ambulanceId, distance_km: distanceKm, seconds_elapsed: secondsElapsed, implied_speed_kmh: impliedSpeed,
        });
      }
    }
  }

  // Location always updates, on every single ping — including mid-trip while
  // the ambulance is 'busy'. Tracking a vehicle en route is exactly when this
  // matters most, so it must never be gated on status.
  const { error } = await supabaseAdmin
    .from('ambulances')
    .update({
      location: `SRID=4326;POINT(${lng} ${lat})`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ambulanceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Status is handled separately, and only ever nudges 'offline' to 'available' —
  // it never touches 'busy', and never blocks the location write above.
  await supabaseAdmin
    .from('ambulances')
    .update({ status: 'available' })
    .eq('id', ambulanceId)
    .eq('status', 'offline');

  return NextResponse.json({ ok: true });
}
