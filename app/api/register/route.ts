import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const { mp_name, constituency, plate, driver_name, driver_phone, sponsor_phone, sponsor_email } = await req.json();
  const { error } = await supabaseAdmin.from('ambulance_applications').insert({
    mp_name, constituency, plate, driver_name, driver_phone, sponsor_phone, sponsor_email,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
