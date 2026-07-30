import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signToken } from '@/lib/authToken';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const { phone, pin } = await req.json();

  const { data: ambulances } = await supabaseAdmin.from('ambulances').select('*').eq('sponsor_phone', phone.trim());
  if (!ambulances?.length) return NextResponse.json({ error: 'No ambulances found for that sponsor phone number.' }, { status: 404 });

  const pinRequired = ambulances.some((a) => a.access_pin);
  if (pinRequired && !ambulances.some((a) => !a.access_pin || a.access_pin === pin)) {
    return NextResponse.json({ error: 'Incorrect PIN.' }, { status: 401 });
  }

  const token = signToken(phone.trim());
  const safeAmbulances = ambulances.map(({ access_pin, ...rest }) => rest);
  return NextResponse.json({ ambulances: safeAmbulances, token });
}
