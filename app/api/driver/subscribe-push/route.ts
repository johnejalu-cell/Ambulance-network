import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyDriverSession } from '@/lib/authToken';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const { ambulanceId, subscription, token } = await req.json();
  if (!(await verifyDriverSession(ambulanceId, token))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabaseAdmin.from('push_subscriptions').insert({ ambulance_id: ambulanceId, subscription });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
