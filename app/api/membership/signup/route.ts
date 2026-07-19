import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const { riderPhone, plan } = await req.json();
  const { data: settings } = await supabaseAdmin.from('platform_settings').select('rider_fare_ugx, membership_monthly_ugx, membership_annual_ugx').eq('id', 1).single();
  if (!settings) return NextResponse.json({ error: 'Settings unavailable' }, { status: 500 });

  const amount = plan === 'annual' ? settings.membership_annual_ugx : settings.membership_monthly_ugx;
  const days = plan === 'annual' ? 365 : 30;
  const start = new Date();
  const end = new Date(start.getTime() + days * 86400000);

  const { error } = await supabaseAdmin.from('memberships').insert({
    rider_phone: riderPhone, plan, amount_ugx: amount, locked_fare_ugx: settings.rider_fare_ugx,
    period_start: start.toISOString().slice(0, 10), period_end: end.toISOString().slice(0, 10),
    payment_status: 'pending',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, amount });
}
