import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const { riderPhone, lat, lng, insuranceCode } = await req.json();

  const { data: match, error: matchErr } = await supabaseAdmin
    .rpc('nearest_available_ambulance', { p_lat: lat, p_lng: lng, p_exclude: [] });

  if (matchErr || !match?.length) {
    return NextResponse.json({ error: 'No ambulance currently available' }, { status: 404 });
  }

  const { data: settings } = await supabaseAdmin.from('platform_settings').select('rider_fare_ugx').eq('id', 1).single();

  // 1. Priority membership check
  const today = new Date().toISOString().slice(0, 10);
  const { data: membership } = await supabaseAdmin
    .from('memberships').select('*')
    .eq('rider_phone', riderPhone).eq('payment_status', 'paid').gte('period_end', today)
    .order('period_end', { ascending: false }).limit(1).maybeSingle();

  let paymentMethod: 'cash' | 'membership' | 'insurer' = 'cash';
  let payerLabel: string | null = null;
  let payerAccountId: string | null = null;
  let fare = settings?.rider_fare_ugx ?? null;

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
      status: 'offered', offered_at: new Date().toISOString(),
      fare_charged_ugx: fare, payment_method: paymentMethod, payer_label: payerLabel, payer_account_id: payerAccountId,
    })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from('ambulances').update({ status: 'busy' }).eq('id', ambulanceId);

  return NextResponse.json({ trip, driverPhone: match[0].driver_phone });
}
