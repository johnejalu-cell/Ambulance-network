import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyAmbulance } from '@/lib/webpush';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const { riderPhone, lat, lng, insuranceCode, dropoffNote } = await req.json();

  const { data: settings } = await supabaseAdmin
    .from('platform_settings')
    .select('rider_fare_ugx, max_dispatch_radius_km')
    .eq('id', 1).single();
  const maxKm = settings?.max_dispatch_radius_km ?? 50;

  // Skip any ambulance this rider cancelled on recently, so a fresh request
  // doesn't just land right back on the one they just walked away from.
  const cancelCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recentCancellations } = await supabaseAdmin
    .from('trip_requests')
    .select('ambulance_id')
    .eq('rider_phone', riderPhone)
    .eq('status', 'cancelled')
    .gte('created_at', cancelCutoff);
  const excludeIds = (recentCancellations || []).map((r) => r.ambulance_id).filter(Boolean);

  let { data: match } = await supabaseAdmin.rpc('nearest_available_ambulance', {
    p_lat: lat, p_lng: lng, p_exclude: excludeIds, p_max_km: maxKm,
  });

  // If excluding recently-cancelled ambulances leaves nothing, fall back to
  // including them rather than stranding the rider — better a ride from the
  // one they cancelled on than no ride at all.
  if (!match?.length && excludeIds.length) {
    const fallback = await supabaseAdmin.rpc('nearest_available_ambulance', {
      p_lat: lat, p_lng: lng, p_exclude: [], p_max_km: maxKm,
    });
    match = fallback.data;
  }

  if (!match?.length) {
    return NextResponse.json({ error: 'No ambulance currently available' }, { status: 404 });
  }

  // 1. Priority membership check
  const today = new Date().toISOString().slice(0, 10);
  const { data: membership } = await supabaseAdmin
    .from('memberships').select('*')
    .eq('rider_phone', riderPhone).eq('payment_status', 'paid').gte('period_end', today)
    .order('period_end', { ascending: false }).limit(1).maybeSingle();

  let paymentMethod: 'cash' | 'membership' | 'insurer' = 'cash';
  let payerLabel: string | null = null;
  let payerAccountId: string | null = null;
  let fare = match[0].trip_rate_ugx ?? settings?.rider_fare_ugx ?? null;

  if (membership) {
    paymentMethod = 'membership';
    payerLabel = 'Priority Member';
    fare = membership.locked_fare_ugx;
  } else {
    // 2. Insurer/corporate roster check — by phone, or by code if provided. Fails open to cash.
    let query = supabaseAdmin.from('payer_members').select('*, payer_accounts(id, name, active, contracted_rate_ugx)')
      .eq('phone', riderPhone);
    if (insuranceCode) query = supabaseAdmin.from('payer_members').select('*, payer_accounts(id, name, active, contracted_rate_ugx)').eq('member_code', insuranceCode);

    const { data: payerMember } = await query.maybeSingle();
    const payer = payerMember?.payer_accounts;
    const notExpired = !payerMember?.expires_at || payerMember.expires_at >= today;

    if (payer && payer.active && notExpired) {
      paymentMethod = 'insurer';
      payerLabel = payer.name;
      payerAccountId = payer.id;
      fare = payer.contracted_rate_ugx;
    }
  }

  const ambulanceId = match[0].id;

  const { data: trip, error } = await supabaseAdmin
    .from('trip_requests')
    .insert({
      rider_phone: riderPhone, pickup_lat: lat, pickup_lng: lng, ambulance_id: ambulanceId,
      status: 'offered', offered_at: new Date().toISOString(), dropoff_note: dropoffNote || null,
      fare_charged_ugx: fare, payment_method: paymentMethod, payer_label: payerLabel, payer_account_id: payerAccountId,
    })
    .select().single();

  if (error) {
    console.error('trip_requests insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from('ambulances').update({ status: 'busy' }).eq('id', ambulanceId);
  await notifyAmbulance(ambulanceId, { title: 'New Ambulance Request', body: `Rider needs pickup nearby — respond within 60s`, url: `/driver/${ambulanceId}` });

  return NextResponse.json({ trip, driverPhone: match[0].driver_phone });
}
