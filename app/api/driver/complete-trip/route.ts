import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { tripId, ambulanceId } = await req.json();

  const { error: tripError } = await supabaseAdmin
    .from('trip_requests')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', tripId);

  const { error: ambError } = await supabaseAdmin
    .from('ambulances')
    .update({ status: 'available' })
    .eq('id', ambulanceId);

  if (tripError || ambError) {
    return NextResponse.json({ error: tripError?.message || ambError?.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
