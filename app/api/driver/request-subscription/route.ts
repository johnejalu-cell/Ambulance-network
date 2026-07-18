import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const PLANS: Record<string, { amount: number; days: number }> = {
  daily: { amount: 5000, days: 1 },
  weekly: { amount: 31500, days: 7 },
  monthly: { amount: 120000, days: 30 },
};

export async function POST(req: Request) {
  const { ambulanceId, plan } = await req.json();
  const p = PLANS[plan];
  if (!p) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

  const periodStart = new Date();
  const periodEnd = new Date(periodStart.getTime() + p.days * 86400000);

  const { error } = await supabaseAdmin.from('ambulance_subscriptions').insert({
    ambulance_id: ambulanceId,
    plan,
    amount_ugx: p.amount,
    period_start: periodStart.toISOString().slice(0, 10),
    period_end: periodEnd.toISOString().slice(0, 10),
    payment_status: 'pending',
    recorded_by: 'driver-self-report',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
