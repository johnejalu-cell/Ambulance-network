import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/verifyAdmin';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  if (!verifyAdmin(cookies().get('admin_session')?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { mp_name, constituency, plate, driver_name, driver_phone } = await req.json();
  const { data, error } = await supabaseAdmin
    .from('ambulances')
    .insert({ mp_name, constituency, plate, driver_name, driver_phone, status: 'offline' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ambulance: data });
}
