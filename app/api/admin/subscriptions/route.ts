import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/verifyAdmin';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const PLANS: Record<string, { amount: number; days: number }> = {
  daily: { amount: 5000, days: 1 },
  weekly: { amount: 31500, days: 7 },
  monthly: { amount: 120000, days: 30 },
};

export async function POST(req: Request) {
  if (!verifyAdmin(cookies().get('admin_session')?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { ambulance_id, plan } = await req.json();
  const p = PLANS[plan];
  if (!p) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

  const periodStart = new Date();
  const periodEnd = new Date(periodStart.getTime() + p.days * 86400000);

  const { error } = await supabaseAdmin.from('ambulance_subscriptions').insert({
    ambulance_id,
    plan,
    amount_ugx: p.amount,
    period_start: periodStart.toISOString().slice(0, 10),
    period_end: periodEnd.toISOString().slice(0, 10),
    payment_status: 'paid',
    recorded_by: 'admin',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
