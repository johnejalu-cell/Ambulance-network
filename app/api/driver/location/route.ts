import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { ambulanceId, lat, lng } = await req.json();

  const { error } = await supabaseAdmin
    .from('ambulances')
    .update({ location: `SRID=4326;POINT(${lng} ${lat})`, updated_at: new Date().toISOString() })
    .eq('id', ambulanceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
