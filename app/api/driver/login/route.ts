import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signToken } from '@/lib/authToken';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const { phone, pin } = await req.json();

  const { data: amb } = await supabaseAdmin.from('ambulances').select('id, access_pin').eq('driver_phone', phone.trim()).maybeSingle();
  if (!amb) return NextResponse.json({ error: 'No ambulance found for that phone number.' }, { status: 404 });

  if (amb.access_pin && amb.access_pin !== pin) {
    return NextResponse.json({ error: 'Incorrect PIN.' }, { status: 401 });
  }

  const token = signToken(amb.id);
  return NextResponse.json({ ambulanceId: amb.id, token });
}
