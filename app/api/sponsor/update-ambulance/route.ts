import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const { ambulanceId, sponsorPhone, updates } = await req.json();

  const { data: amb } = await supabaseAdmin.from('ambulances').select('sponsor_phone').eq('id', ambulanceId).single();
  if (!amb || amb.sponsor_phone !== sponsorPhone) {
    return NextResponse.json({ error: 'Not authorized for this ambulance' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from('ambulances').update(updates).eq('id', ambulanceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
